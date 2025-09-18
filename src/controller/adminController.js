import mongoose from "mongoose";
import Wallet from "../model/wallet.js";
import Withdrawal from "../model/withdrawal.js";
import Seller from "../model/seller.js";
import axios from "axios";
import RevenueWallet from "../model/RevenueWallet.js";


//get all sellers
export const getAllSellers = async (req, res) => {
    try {
        const sellers = await Seller.find().select('-password -emailToken -emailTokenExpiry -resetPasswordToken -resetPasswordExpires');
        res.status(200).json(sellers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
//get single seller by id
export const getSellerById = async (req, res) => {
    try {
        const seller = await Seller.findById(req.params.id).select('-password -emailToken -emailTokenExpiry -resetPasswordToken -resetPasswordExpires');
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }   
        res.status(200).json(seller);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//delete seller by id
export const deleteSellerById = async (req, res) => {
    try {
        const seller = await Seller.findByIdAndDelete(req.params.id);
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }
        res.status(200).json({ message: "Seller deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }   
};

//update seller by id
export const updateSellerById = async (req, res) => {
    const { fullName, phone, nin, storeName, location } = req.body;
    try {
        const seller = await Seller.findById(req.params.id);
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }
        //update fields
        if (fullName) seller.fullName = fullName;
        if (phone) seller.phone = phone;
        if (nin) seller.nin = nin;
        if (storeName) seller.storeName = storeName;
        if (location) seller.location = location;
        await seller.save();
        res.status(200).json({ message: "Seller updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//approve seller withdrawal
export const approveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;

    // find withdrawal
    const withdrawal = await Withdrawal.findById(withdrawalId).populate("seller");
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "awaiting_admin") {
      return res.status(400).json({ message: "This withdrawal is not awaiting approval" });
    }

    const seller = withdrawal.seller;
    if (!seller || !seller.bankDetails) {
      return res.status(400).json({ message: "Seller bank details missing" });
    }

    const { accountName, accountNumber, bankCode, recipientCode } = seller.bankDetails;

    try {
      let paystackRecipient = recipientCode;

      // If no Paystack recipient yet → create one
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
        seller.bankDetails.recipientCode = paystackRecipient;
        await seller.save();
      }

      // Initiate Paystack transfer
      const transferResp = await axios.post(
        "https://api.paystack.co/transfer",
        {
          source: "balance",
          reason: "Seller Withdrawal (Admin Approved)",
          amount: Math.round(withdrawal.netAmount * 100), // NGN → kobo
          recipient: paystackRecipient,
          reference: String(withdrawal._id),
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );

      // update withdrawal doc
      withdrawal.status = "processing";
      withdrawal.reference = transferResp.data.data.reference;
      await withdrawal.save();

      return res.status(200).json({
        message: "Withdrawal approved and transfer initiated",
        withdrawalId: withdrawal._id,
      });
    } catch (payErr) {
      console.error("Paystack transfer error:", payErr.response?.data || payErr.message);

      const cleanupSession = await mongoose.startSession();
      try {
        cleanupSession.startTransaction();

        // refund seller wallet
        await Wallet.findOneAndUpdate(
          { user: seller._id, userType: "Seller" },
          { $inc: { balance: withdrawal.amount } },
          { session: cleanupSession }
        );

        // remove fee from revenue wallet
        await RevenueWallet.findOneAndUpdate(
          {},
          { $inc: { balance: -withdrawal.fee } },
          { session: cleanupSession }
        );

        // mark withdrawal failed
        withdrawal.status = "failed";
        withdrawal.failureReason = payErr.response?.data || payErr.message;
        await withdrawal.save({ session: cleanupSession });

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
    console.error("approveWithdrawal error:", err.response?.data || err.message || err);
    return res.status(500).json({ message: "Something went wrong", error: err.message || err });
  }
};

//reject seller withdrawal
export const rejectWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { withdrawalId } = req.params;
    const { reason } = req.body; // admin provides reason for rejection

    const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "awaiting_admin") {
      return res.status(400).json({ message: "This withdrawal is not awaiting approval" });
    }

    session.startTransaction();

    // Refund seller wallet
    await Wallet.findOneAndUpdate(
      { user: withdrawal.seller, userType: "Seller" },
      { $inc: { balance: withdrawal.amount } },
      { session }
    );

    // Remove fee from revenue wallet
    await RevenueWallet.findOneAndUpdate(
      {},
      { $inc: { balance: -withdrawal.fee } },
      { session }
    );

    // Mark withdrawal as rejected
    withdrawal.status = "rejected";
    withdrawal.rejectionReason = reason || "Rejected by admin";
    await withdrawal.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Withdrawal rejected and seller refunded",
      withdrawalId: withdrawal._id,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("rejectWithdrawal error:", err.message || err);
    return res.status(500).json({ message: "Something went wrong", error: err.message || err });
  }
};
