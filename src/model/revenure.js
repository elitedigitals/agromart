// models/RevenueWallet.js
import mongoose from "mongoose";

const revenueWalletSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["platform"], // keeps it unique to your platform
      default: "platform",
      unique: true,       // ensures only one exists
    },
    balance: {
      type: Number,
      default: 0,         // starts at 0
    },
  },
  { timestamps: true }
);

const RevenueWallet = mongoose.model("RevenueWallet", revenueWalletSchema);
export default RevenueWallet;