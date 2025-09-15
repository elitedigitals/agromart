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
    phone: {
      type: String,
      unique: true
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
    location: {
      type: String
    }
  },
  { timestamps: true }
);

const Seller = mongoose.model("Seller", sellerSchema);
export default Seller;
