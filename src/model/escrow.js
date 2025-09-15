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
      enum: ["holding", "released", "refunded", "disputed"],
      default: "holding"
    },
    releasedAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model("Escrow", escrowSchema);
