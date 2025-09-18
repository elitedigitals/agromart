import Wallet from "../models/Wallet.js";
import RevenueWallet from "../models/RevenueWallet.js";
import Withdrawal from "../models/Withdrawal.js";
import axios from "axios";

export const requestWithdrawal = async (req, res) => {
  try {
    const { amount, bankCode, accountNumber } = req.body;
    const sellerId = req.user._id;

    let koboAmount = Number(amount) * 100; // convert to kobo
    if (!koboAmount || koboAmount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }

    // Get seller wallet
    const wallet = await Wallet.findOne({ user: sellerId, userType: "Seller" });
    if (!wallet || wallet.balance < koboAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Calculate 2% fee
    const fee = Math.round(koboAmount * 0.02);
    const netAmount = koboAmount - fee;

    if (netAmount <= 0) {
      return res.status(400).json({ message: "Withdrawal amount too small after fees" });
    }

    // Deduct total withdrawal amount (including fee) from seller wallet
    wallet.balance -= koboAmount;
    await wallet.save();

    // Save fee to Revenue Wallet
    let revenueWallet = await RevenueWallet.findOne();
    if (!revenueWallet) revenueWallet = new RevenueWallet();
    revenueWallet.balance += fee;
    await revenueWallet.save();

    // Create withdrawal record
    const withdrawal = new Withdrawal({
      seller: sellerId,
      amount: koboAmount,
      fee,
      netAmount,
      bankDetails: { bankCode, accountNumber },
      status: "pending",
    });
    await withdrawal.save();

    // Call Paystack Transfer API
    const response = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        reason: "Seller Withdrawal",
        amount: netAmount, // seller receives net amount
        recipient: {
          type: "nuban",
          name: req.user.name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "NGN",
        },
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    withdrawal.reference = response.data.data.reference;
    withdrawal.status = "pending"; // will be updated later by webhook
    await withdrawal.save();

    res.json({ message: "Withdrawal initiated", withdrawal });

  } catch (error) {
    console.error("Withdrawal error:", error.response?.data || error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
};
