import Wallet from "../models/Wallet.js";
import RevenueWallet from "../models/RevenueWallet.js";
import Withdrawal from "../models/Withdrawal.js";
import axios from "axios";

//request a withdrawal - seller
export const requestWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, bankCode, accountNumber } = req.body;
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
    const revenue = await RevenueWallet.findOneAndUpdate(
      {},
      { $inc: { balance: fee } },
      { new: true, upsert: true, session }
    );

    // Create withdrawal record (status pending)
    const withdrawal = await Withdrawal.create(
      [
        {
          seller: sellerId,
          amount: nairaAmount,
          fee,
          netAmount,
          bankCode,
          bankName: null,            // optional, fill from frontend if you pass it
          accountNumber,
          status: "pending",
        },
      ],
      { session }
    );

    // commit the DB transaction before calling external API
    await session.commitTransaction();
    session.endSession();

    // --------------------
    // Now interact with Paystack (outside DB transaction)
    // --------------------
    // We will create a transfer recipient, then initiate transfer.
    try {
      // Optionally, get seller name (if not passed in req.user)
      let sellerName = req.user?.fullName || req.user?.name;
      if (!sellerName) {
        const sellerDoc = await Seller.findById(sellerId).select("fullName name");
        sellerName = sellerDoc?.fullName || sellerDoc?.name || "Recipient";
      }

      // Create recipient
      const recipientResp = await axios.post(
        "https://api.paystack.co/transferrecipient",
        {
          type: "nuban",
          name: sellerName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "NGN",
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      const recipientCode = recipientResp.data.data.recipient_code;

      // Initiate transfer: Paystack expects amount in kobo
      const transferResp = await axios.post(
        "https://api.paystack.co/transfer",
        {
          source: "balance",
          reason: "Seller Withdrawal",
          amount: Math.round(netAmount * 100), // convert NGN -> kobo
          recipient: recipientCode,
          reference: String(withdrawal[0]._id), // you can use withdrawal id as reference
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );

      // update withdrawal doc with transfer info
      await Withdrawal.findByIdAndUpdate(
        withdrawal[0]._id,
        {
          recipientCode,
          reference: transferResp.data.data.reference,
          status: "processing", // waiting for Paystack webhook final status
        },
        { new: true }
      );

      return res.status(200).json({
        message: "Withdrawal initiated and transfer started",
        withdrawalId: withdrawal[0]._id,
      });
    } catch (payErr) {
      // On Paystack failure, attempt to refund seller and remove fee from revenue wallet
      console.error("Paystack transfer error:", payErr.response?.data || payErr.message);

      const cleanupSession = await mongoose.startSession();
      try {
        cleanupSession.startTransaction();

        // refund seller wallet
        await Wallet.findOneAndUpdate(
          { user: sellerId, userType: "Seller" },
          { $inc: { balance: nairaAmount } },
          { session: cleanupSession }
        );

        // remove fee from revenue wallet
        await RevenueWallet.findOneAndUpdate(
          {},
          { $inc: { balance: -fee } },
          { session: cleanupSession }
        );

        // mark withdrawal failed
        await Withdrawal.findByIdAndUpdate(
          withdrawal[0]._id,
          { status: "failed", failureReason: payErr.response?.data || payErr.message },
          { session: cleanupSession }
        );

        await cleanupSession.commitTransaction();
        cleanupSession.endSession();

        return res.status(500).json({
          message: "Transfer failed. Seller refunded. Withdrawal marked failed.",
          error: payErr.response?.data || payErr.message,
        });
      } catch (cleanupErr) {
        await cleanupSession.abortTransaction();
        cleanupSession.endSession();
        console.error("Cleanup failed:", cleanupErr);
        // highly critical: manual reconciliation may be required
        return res.status(500).json({
          message: "Critical error. Manual reconciliation required.",
          error: cleanupErr.message,
        });
      }
    }
  } catch (err) {
    // global catch
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
