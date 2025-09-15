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
        callback_url: "http://localhost:5000/api/payment/deposit/verify"
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

/**
 * ========== VERIFY DEPOSIT ==========
 * Frontend calls this after redirection
 */
export const verifyDeposit = async (req, res) => {
  try {
    const { reference } = req.query; // ✅ use query
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
    const tx = await Transaction.findOne({ reference });

    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (data.status === "success" && tx.status !== "success") {
      tx.status = "success";
      await tx.save();
      console.log(`[VERIFY] Transaction verified successfully: Ref ${reference}`);
    } else {
      console.log(`[VERIFY] Transaction status: ${data.status}, Ref ${reference}`);
    }

    return res.status(200).json({ status: data.status, transaction: tx });
  } catch (error) {
    console.error("VerifyDeposit Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

/**
 * ========== PAYSTACK WEBHOOK ==========
 * This is the source of truth
 */
// ========== WEBHOOK ==========
export const paystackWebhook = async (req, res) => {
  try {
    // Verify signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    const event = req.body.event;
    const data = req.body.data;

    if (event === "charge.success") {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const buyer = await Buyer.findOne({ email: data.customer.email }).session(session);
        if (!buyer) throw new Error("Buyer not found");

        // Check if transaction already exists (Paystack may send duplicates)
        let transaction = await Transaction.findOne({ reference: data.reference }).session(session);

        if (!transaction) {
          // Create new successful transaction
          transaction = await Transaction.create(
            [
              {
                user: buyer._id,
                userType: "Buyer",
                reference: data.reference,
                type: "deposit",
                amount: data.amount / 100,
                status: "success",
              },
            ],
            { session }
          );

          console.log(`[WEBHOOK] New transaction recorded: ${data.reference}`);
        } else if (transaction.status !== "success") {
          // Update existing transaction if it was still pending
          transaction.status = "success";
          await transaction.save({ session });
          console.log(`[WEBHOOK] Transaction updated to success: ${data.reference}`);
        } else {
          console.log(`[WEBHOOK] Duplicate webhook ignored for reference: ${data.reference}`);
        }

        // Update wallet using $inc (atomic, concurrency-safe)
        await Wallet.updateOne(
          { user: buyer._id, userType: "Buyer" },
          { $inc: { balance: data.amount / 100 } },
          { upsert: true, session }
        );

        console.log(`[WEBHOOK] Wallet incremented by ${data.amount / 100} for Buyer: ${buyer._id}`);

        await session.commitTransaction();
        session.endSession();

        return res.sendStatus(200);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Webhook error:", err.message);
        return res.sendStatus(500);
      }
    }

    res.sendStatus(200); // acknowledge other events
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.sendStatus(500);
  }
};

