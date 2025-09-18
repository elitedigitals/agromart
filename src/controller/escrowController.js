import Escrow from "../model/escrow.js";
import Order from "../model/order.js";
import Wallet from "../model/wallet.js"; 
import mongoose from "mongoose";

// seller marks order as delivered
export const markDelivered = async (req, res) => {
  try {
    const { orderId } = req.body;
    const sellerId = req.user._id;

    const escrow = await Escrow.findOne({ order: orderId, seller: sellerId });
    if (!escrow) return res.status(404).json({ message: "Escrow not found" });

    escrow.sellerDelivered = true;

    
    await escrow.save();

    return res.json({ message: "Order marked as delivered" });
  } catch (err) {
    console.error("markDelivered error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// buyer confirms delivery → release escrow to seller
export const confirmDelivery = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { orderId } = req.body;
    const buyerId = req.user._id;

    const escrow = await Escrow.findOne({ order: orderId, buyer: buyerId }).session(session);
    if (!escrow) return res.status(404).json({ message: "Escrow not found" });

    if (!escrow.sellerDelivered) {
      return res.status(400).json({ message: "Seller has not marked as delivered yet" });
    }

    // Update wallets
    const buyerWallet = await Wallet.findOneAndUpdate(
      { user: escrow.buyer, userType: "Buyer" },
      { $inc: { escrowBalance: -escrow.amount } },
      { new: true, session }
    );

    const sellerWallet = await Wallet.findOneAndUpdate(
      { user: escrow.seller, userType: "Seller" }, // ✅ Seller not Vendor
      { $inc: { escrowBalance: -escrow.amount, balance: escrow.amount } },
      { new: true, session }
    );

    escrow.status = "released";
    escrow.buyerConfirmed = true;
    await escrow.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.json({
      message: "Delivery confirmed. Payment released to seller.",
      buyerWallet,
      sellerWallet,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("confirmDelivery error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// buyer requests refund
export const requestRefund = async (req, res) => {
  try {
    const { orderId } = req.body;
    const buyerId = req.user._id;

    const escrow = await Escrow.findOne({ order: orderId, buyer: buyerId });
    if (!escrow) return res.status(404).json({ message: "Escrow not found" });

    escrow.status = "refund_requested";
    escrow.refundRequested = true;
    await escrow.save();

    return res.json({ message: "Refund requested. Admin will review." });
  } catch (err) {
    console.error("requestRefund error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// admin approves refund
export const approveRefund = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { escrowId } = req.body;

    const escrow = await Escrow.findById(escrowId).session(session);
    if (!escrow) return res.status(404).json({ message: "Escrow not found" });

    // Update wallets
    const buyerWallet = await Wallet.findOneAndUpdate(
      { user: escrow.buyer, userType: "Buyer" },
      { $inc: { escrowBalance: -escrow.amount, balance: escrow.amount } },
      { new: true, session }
    );

    const sellerWallet = await Wallet.findOneAndUpdate(
      { user: escrow.seller, userType: "Seller" }, // ✅ Seller not Vendor
      { $inc: { escrowBalance: -escrow.amount } },
      { new: true, session }
    );

    escrow.status = "refunded";
    await escrow.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.json({
      message: "Refund approved and money returned to buyer",
      buyerWallet,
      sellerWallet,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("approveRefund error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
};
