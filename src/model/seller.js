import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      unique: true
    },
    avatar: {
      type: String
    },
    phone: {
      type: String,
 
    },
    role: {
        type: String,
        default: "Seller"
    },
    emailToken: {
        type: String
    },
    emailTokenExpiry: {
        type: Date
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken:{
        type: String
    },
    resetPasswordExpires:{
        type: Date
    },
    nin: {
      type: String,

    },
    password: {
      type: String,
      required: true
    },
    storeName: {
      type: String
    },
    address: {
      type: String
    },
    bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    bankCode: String,
    recipientCode: String, // returned by Paystack transferrecipient API
  },
  },
  { timestamps: true }
);

const Seller = mongoose.model("Seller", sellerSchema);
export default Seller;
