import mongoose from "mongoose";

const escrowSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buyer",
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["holding", "released", "refunded", "disputed", "refund_requested", "delivered"],
      default: "holding"
    },
    releasedAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    },

        // track actions
    buyerConfirmed: { type: Boolean, default: false },
    sellerDelivered: { type: Boolean, default: false },
    refundRequested: { type: Boolean, default: false },
  },

  { timestamps: true }
);

const Escrow = mongoose.model("Escrow", escrowSchema);
export default Escrow;
