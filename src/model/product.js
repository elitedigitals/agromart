import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    price: {
      type: Number,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    stock: {
      type: Number
    },
    quantity: {
      type: Number,
      default: 1
    },
    images: [
      {
        type: String
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
