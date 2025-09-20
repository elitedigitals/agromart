import mongoose from "mongoose";

const buyerSchema = new mongoose.Schema(
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
    unique: true,
    sparse: true   // <-- important
},
    role: {
        type: String,
        default: "Buyer"
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
    address: {
      type: String
    }
  },
  { timestamps: true }
);

const Buyer = mongoose.model("Buyer", buyerSchema);
export default Buyer
