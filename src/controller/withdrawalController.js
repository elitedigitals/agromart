import Wallet from "../models/Wallet.js";
import RevenueWallet from "../models/RevenueWallet.js";
import Withdrawal from "../models/Withdrawal.js";
import axios from "axios";

//request a withdrawal - seller
export const requestWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount } = req.body;
    const sellerId = req.user._id;

    // sanitize & validate amount (NGN)
    const nairaAmount = Number(String(amount).replace(/,/g, ""));
    if (!nairaAmount || isNaN(nairaAmount) || nairaAmount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }

    // fee and net in NGN (round to whole Naira)
    const fee = Math.round(nairaAmount * 0.02); // 2% fee
    const netAmount = nairaAmount - fee;
    if (netAmount <= 0) {
      return res.status(400).json({ message: "Amount too small after fees" });
    }

    // Fetch seller + bank details
    const seller = await Seller.findById(sellerId);
    if (!seller || !seller.bankDetails) {
      return res.status(400).json({ message: "Please add bank details first" });
    }

    const { accountName, accountNumber, bankCode, bankName, recipientCode } = seller.bankDetails;

    // Start DB transaction: deduct seller wallet and credit revenue wallet, create withdrawal record
    session.startTransaction();
    const sellerWallet = await Wallet.findOne({ user: sellerId, userType: "Seller" }).session(session);
    if (!sellerWallet || sellerWallet.balance < nairaAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Deduct seller balance
    sellerWallet.balance -= nairaAmount;
    await sellerWallet.save({ session });

    // Credit revenue wallet (single document; upsert if missing)
    await RevenueWallet.findOneAndUpdate(
      {},
      { $inc: { balance: fee } },
      { new: true, upsert: true, session }
    );

    // Create withdrawal record (status pending)
    const [withdrawal] = await Withdrawal.create(
      [
        {
          seller: sellerId,
          amount: nairaAmount,
          fee,
          netAmount,
          bankName,
          accountNumber,
          status: "pending",
        },
      ],
      { session }
    );

    // commit DB transaction before hitting Paystack
    await session.commitTransaction();
    session.endSession();

    // --------------------
    // Paystack transfer
    // --------------------
    try {
      let paystackRecipient = recipientCode;

      // If seller has no recipientCode yet → create one
      if (!paystackRecipient) {
        const recipientResp = await axios.post(
          "https://api.paystack.co/transferrecipient",
          {
            type: "nuban",
            name: accountName,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: "NGN",
          },
          { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
        );
        paystackRecipient = recipientResp.data.data.recipient_code;

        // Save it to seller record
        seller.bankDetails.recipientCode = paystackRecipient;
        await seller.save();
      }

      // Initiate transfer: Paystack expects kobo
      const transferResp = await axios.post(
        "https://api.paystack.co/transfer",
        {
          source: "balance",
          reason: "Seller Withdrawal",
          amount: Math.round(netAmount * 100), // NGN → kobo
          recipient: paystackRecipient,
          reference: String(withdrawal._id),
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );

      // update withdrawal doc
      await Withdrawal.findByIdAndUpdate(
        withdrawal._id,
        {
          reference: transferResp.data.data.reference,
          status: "processing",
        },
        { new: true }
      );

      return res.status(200).json({
        message: "Withdrawal initiated successfully",
        withdrawalId: withdrawal._id,
      });
    } catch (payErr) {
      // On Paystack failure → rollback
      console.error("Paystack transfer error:", payErr.response?.data || payErr.message);

      const cleanupSession = await mongoose.startSession();
      try {
        cleanupSession.startTransaction();

        await Wallet.findOneAndUpdate(
          { user: sellerId, userType: "Seller" },
          { $inc: { balance: nairaAmount } },
          { session: cleanupSession }
        );

        await RevenueWallet.findOneAndUpdate(
          {},
          { $inc: { balance: -fee } },
          { session: cleanupSession }
        );

        await Withdrawal.findByIdAndUpdate(
          withdrawal._id,
          { status: "failed", failureReason: payErr.response?.data || payErr.message },
          { session: cleanupSession }
        );

        await cleanupSession.commitTransaction();
        cleanupSession.endSession();

        return res.status(500).json({
          message: "Transfer failed. Seller refunded.",
          error: payErr.response?.data || payErr.message,
        });
      } catch (cleanupErr) {
        await cleanupSession.abortTransaction();
        cleanupSession.endSession();
        console.error("Cleanup failed:", cleanupErr);
        return res.status(500).json({
          message: "Critical error. Manual reconciliation required.",
          error: cleanupErr.message,
        });
      }
    }
  } catch (err) {
    try { await session.abortTransaction(); session.endSession(); } catch (e) {}
    console.error("requestWithdrawal error:", err.response?.data || err.message || err);
    return res.status(500).json({ message: "Something went wrong", error: err.message || err });
  }
};



//get all withdrawals - admin
export const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().populate("seller", "name email");   
    res.json(withdrawals);
  } catch (err) {
    console.error("getAllWithdrawals error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
};


//approve a withdrawal - admin
export const approveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.body;

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "Already processed" });
    }

    // Here → trigger Paystack transfer with withdrawal.netAmount
    // Example: call Paystack transfer API

    withdrawal.status = "processing";
    await withdrawal.save();

    return res.json({ message: "Withdrawal approved. Transfer initiated.", withdrawal });
  } catch (err) {
    console.error("approveWithdrawal error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
};
