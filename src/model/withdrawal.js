import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seller",
    required: true
  },
  amount: { type: Number, required: true },         // requested amount
  fee: { type: Number, required: true },            // 2% fee
  netAmount: { type: Number, required: true },      // amount after fee
  bankCode: { type: String, required: true },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "processing", "paid", "failed"],
    default: "pending"
  },
  reason: { type: String }, // if admin rejects
}, { timestamps: true });

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
export default Withdrawal;
