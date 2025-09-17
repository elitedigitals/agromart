import axios from "axios";
import crypto from "crypto";
import Transaction from "../model/transaction.js";
import Wallet from "../model/wallet.js";
import RevenueWallet from "../model/revenure.js";
import Buyer from "../model/buyer.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

/**
 * ========== INITIATE DEPOSIT ==========
 */
export const initDeposit = async (req, res) => {
  try {
    let { amount } = req.body;
    const userId = req.user._id;

    // Sanitize amount (remove commas, force number)
    amount = Number(String(amount).replace(/,/g, ""));
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid deposit amount" });
    }

    const buyer = await Buyer.findById(userId);
    if (!buyer) {
      return res.status(404).json({ message: "Buyer not found" });
    }

    //  Calculate fee and total
    const feeRate = 0.02; // 2%
    const fee = Math.round(amount * feeRate); // round fee
    const totalCharge = amount + fee;

    //  Convert to kobo
    const koboAmount = totalCharge * 100;

    //  Call Paystack
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: buyer.email,
        amount: koboAmount, // in kobo
        callback_url: `${process.env.CLIENT_URL}/payment/deposit/verify`,
        metadata: {
          buyerId: buyer._id.toString(),
          depositAmount: amount, // what actually goes into wallet
          fee,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = response.data.data;
    return res.json({
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
      reference: paystackData.reference,
    });
  } catch (error) {
    console.error("Deposit init error:", error.response?.data || error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
};



//   ========== VERIFY DEPOSIT ==========
//  * Frontend calls this after redirection
// Just verify with Paystack, no DB writes
export const verifyDeposit = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ message: "Reference is required" });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    const data = response.data.data;

    console.log(`[VERIFY] Paystack verification result: Ref ${reference}, Status: ${data.status}`);

    //  Do NOT touch DB here, leave wallet & transaction update to webhook
    return res.status(200).json({
      status: data.status,
      reference: data.reference,
      amount: data.amount / 100,
      gateway_response: data.gateway_response,
    });
  } catch (error) {
    console.error("VerifyDeposit Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
};


// ========== WEBHOOK ==========
export const paystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    // Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody) // rawBody middleware required
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      console.error(" Invalid Paystack signature");
      return res.sendStatus(401);
    }

    const { event, data } = req.body;
    console.log(" Webhook event received:", event);
    console.log(" Webhook raw data:", JSON.stringify(data, null, 2));

    if (event === "charge.success") {
      console.log("⚡ Processing charge.success for reference:", data.reference);

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Find buyer
        const buyer = await Buyer.findOne({ email: data.customer.email }).session(session);
        if (!buyer) {
          console.error(" Buyer not found:", data.customer.email);
          throw new Error("Buyer not found");
        }

        // Extract metadata to know deposit vs fee
        const nairaAmount = data.amount / 100; // total charged
        const depositAmount = data.metadata?.depositAmount || nairaAmount;
        const fee = data.metadata?.fee || 0;

        // Find existing transaction
        let existingTxn = await Transaction.findOne({ reference: data.reference }).session(session);

        if (existingTxn) {
          if (existingTxn.status === "success") {
            console.warn(" Transaction already processed successfully:", data.reference);
            await session.abortTransaction();
            session.endSession();
            return res.sendStatus(200);
          }

          if (existingTxn.status === "pending" && data.status === "success") {
            console.log(" Updating pending transaction to success:", data.reference);

            existingTxn.status = "success";
            existingTxn.amount = depositAmount;
            await existingTxn.save({ session });

            // Credit user wallet
            const updatedWallet = await Wallet.findOneAndUpdate(
              { user: buyer._id, userType: "Buyer" },
              { $inc: { balance: depositAmount } },
              { new: true, upsert: true, session }
            );

            // Credit revenue wallet
            const updatedRevenue = await RevenueWallet.findOneAndUpdate(
              {},
              { $inc: { balance: fee } },
              { new: true, upsert: true, session }
            );

            console.log(" Wallet credited (from pending):", {
              user: buyer.email,
              newBalance: updatedWallet.balance,
            });
            console.log(" Revenue wallet credited:", {
              fee,
              newRevenueBalance: updatedRevenue.balance,
            });

            await session.commitTransaction();
            session.endSession();
            return res.sendStatus(200);
          }
        } else {
          // Create new transaction
          const newTxn = await Transaction.create(
            [
              {
                user: buyer._id,
                userType: "Buyer",
                reference: data.reference,
                type: "deposit",
                amount: depositAmount,
                fee,
                status: "success",
              },
            ],
            { session }
          );
          console.log(" New transaction created:", newTxn[0]);

          // Credit user wallet
          const updatedWallet = await Wallet.findOneAndUpdate(
            { user: buyer._id, userType: "Buyer" },
            { $inc: { balance: depositAmount } },
            { new: true, upsert: true, session }
          );

          // Credit revenue wallet
          const updatedRevenue = await RevenueWallet.findOneAndUpdate(
            {},
            { $inc: { balance: fee } },
            { new: true, upsert: true, session }
          );

          console.log(" Wallet credited (new txn):", {
            user: buyer.email,
            newBalance: updatedWallet.balance,
          });
          console.log(" Revenue wallet credited (new txn):", {
            fee,
            newRevenueBalance: updatedRevenue.balance,
          });
        }

        await session.commitTransaction();
        session.endSession();
        console.log(" Webhook processing completed for:", buyer.email);
        return res.sendStatus(200);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(" Webhook error inside transaction:", err.message);
        return res.sendStatus(500);
      }
    }

    //  For other events
    res.sendStatus(200);
  } catch (error) {
    console.error(" Webhook outer error:", error.message);
    res.sendStatus(500);
  }
};

