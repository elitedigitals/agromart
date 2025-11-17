import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buyer",
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true
    },
    quantity: {
      type: Number,
  
    },
    totalAmount: {
      type: Number,
      required: true
    },
    status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "cancelled"],
    default: "pending",
  },
  //escrow amount
    escrowAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    escrow_status: {
      type: String,
      enum: ["pending", "escrow", "delivered", "disputed", "released"],
      default: "pending"
    }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
