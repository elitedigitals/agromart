import mongoose from "mongoose";
import crypto from "crypto";

const transactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "userType",
      required: true
    },
    userType: {
      type: String,
      enum: ["Seller", "Buyer"],
      required: true
    },
    transactionNumber: {
      type: String,
      unique: true
    },
    reference: {
      type: String // this comes from Paystack (or any gateway)
    },
    type: {
      type: String,
      enum: ["deposit", "escrow_hold", "escrow_release", "withdrawal"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    fee: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

// Pre-save hook to generate internal transaction number
transactionSchema.pre("save", async function (next) {
  if (!this.transactionNumber) {
    let unique = false;

    while (!unique) {
      const randomNum = crypto.randomInt(100000, 999999); // 6-digit random
      const txn = `TXN_${randomNum}`;

      const existing = await mongoose.models.Transaction.findOne({
        transactionNumber: txn
      });

      if (!existing) {
        this.transactionNumber = txn;
        unique = true;
      }
    }
  }

  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
