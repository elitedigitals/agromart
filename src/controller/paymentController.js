import axios from "axios";
import crypto from "crypto";
import Transaction from "../model/transaction.js";
import Wallet from "../model/wallet.js";
import Buyer from "../model/buyer.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

/**
 * ========== INITIATE DEPOSIT ==========
 */
export const initDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid deposit amount" });
    }

    const buyer = await Buyer.findById(userId);
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });

    // Call Paystack init
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: buyer.email,
        amount: amount * 100, // Paystack expects kobo
        metadata: { buyerId: buyer._id.toString() },
        callback_url: `${process.env.BASE_URL}/payment/deposit/verify`, // Redirect after payment
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackData = response.data.data;

    // Save pending transaction in DB
    await Transaction.create({
      user: buyer._id,
      userType: "Buyer",
      reference: paystackData.reference,
      type: "deposit",
      amount,
      status: "pending",
    });

    console.log(`[INIT] Deposit started for Buyer ${buyer._id}, Ref: ${paystackData.reference}`);

    return res.status(200).json({
      authorization_url: paystackData.authorization_url,
      access_code: paystackData.access_code,
      reference: paystackData.reference,
    });
  } catch (error) {
    console.error("InitDeposit Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Payment init failed" });
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

    // 🚨 Do NOT touch DB here, leave wallet & transaction update to webhook
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

//  * This is the source of truth 
// ========== WEBHOOK ==========
export const paystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    // 🔑 Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody) // must use raw body
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      console.error("❌ Invalid Paystack signature");
      return res.sendStatus(401);
    }

    const { event, data } = req.body;
    console.log("📩 Webhook event received:", event);
    console.log("📩 Webhook raw data:", JSON.stringify(data, null, 2));

    if (event === "charge.success") {
      console.log("🚀 Processing charge.success for reference:", data.reference);

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // ✅ Find buyer by email
        const buyer = await Buyer.findOne({ email: data.customer.email }).session(session);
        if (!buyer) {
          console.error("❌ Buyer not found for email:", data.customer.email);
          throw new Error("Buyer not found");
        }
        console.log("✅ Buyer found:", buyer.email, "ID:", buyer._id);

        // ✅ Check if transaction already exists
        const existingTxn = await Transaction.findOne({ reference: data.reference }).session(session);
        if (existingTxn) {
          console.warn("⚠️ Transaction already processed:", data.reference);
          await session.abortTransaction();
          session.endSession();
          return res.sendStatus(200);
        }

        // ✅ Convert Paystack amount from kobo → naira
        const nairaAmount = data.amount / 100;
        console.log("💰 Amount from Paystack:", data.amount, "kobo =>", nairaAmount, "naira");

        // ✅ Create new transaction record
        const newTxn = await Transaction.create(
          [
            {
              user: buyer._id,
              userType: "Buyer",
              reference: data.reference,
              type: "deposit",
              amount: nairaAmount,
              status: "success",
            },
          ],
          { session }
        );
        console.log("📝 Transaction created:", newTxn[0]);

        // ✅ Update or create wallet atomically
        const updatedWallet = await Wallet.findOneAndUpdate(
          { user: buyer._id, userType: "Buyer" },
          { $inc: { balance: nairaAmount } }, // increment balance
          { new: true, upsert: true, session }
        );

        console.log("✅ Wallet updated:", {
          user: buyer.email,
          walletId: updatedWallet._id,
          newBalance: updatedWallet.balance,
        });

        await session.commitTransaction();
        session.endSession();

        console.log("🎉 Webhook processing completed successfully for:", buyer.email);
        return res.sendStatus(200);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ Webhook error inside transaction:", err.message);
        return res.sendStatus(500);
      }
    }

    // ✅ For other Paystack events, just log and acknowledge
    console.log("ℹ️ Event not handled:", event);
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Webhook outer error:", error.message);
    res.sendStatus(500);
  }
};