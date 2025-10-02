import Seller from "../model/seller.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Buyer from "../model/buyer.js";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetSuccessEmail } from "../helpers/sendEmail.js";
dotenv.config();

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    let user = await Seller.findOne({ email });
    let role = "Seller";

    if (!user) {   
      user = await Buyer.findOne({ email });
      role = "Buyer";
    }

    if (!user) {
      return res.status(400).json({ message: "Account does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // if (!user.isVerified) {
      // return res.status(400).json({ message: "Please verify your email to login" });
    //}

    //  Use the `role` variable, not user.role
    const payload = { userId: user._id, role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      token,
      user: { id: user._id, email: user.email, name: user.fullName, address: user.address, phone: user.phone, role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: "Please provide email" });
    }

    let user = await Seller.findOne({ email });
    let userType = "Seller";
    if (!user) {
      user = await Buyer.findOne({ email });
      userType = "Buyer";
    }
    if (!user) {
      return res.status(400).json({ message: "Account does not exist" });
    }

    // generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour

    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();


    await sendPasswordResetEmail(user.email, resetToken, user.name);
    // send email here
    // await sendEmail(user.email, "Password Reset", `Click to reset: ${resetUrl}`);

    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // search both collections
    let user = await Seller.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    let userType = "Seller";

    if (!user) {
      user = await Buyer.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });
      userType = "Buyer";
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    // send success email
    await sendPasswordResetSuccessEmail(user.email, user.name);
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//Verify email
export const verifyEmail = async (req, res) => {
  const {token} = req.body;
  try {
    if (!token) {
      return res.status(400).json({ message: "Invalid request" });
    }
    // search both collections
    let user = await Seller.findOne({ emailToken: token });
    let userType = "Seller";
    if (!user) {
      user = await Buyer.findOne({ emailToken: token });
      userType = "Buyer";
    }
    if (!user) {
      return res.status(400).json({ message: "Invalid token" });
    }
    //check if token is expired
    if (user.emailTokenExpiry < Date.now()) {
        return res.status(400).json({ message: "Token has expired" });
    }
    //check if already verified
    if (user.isVerified) {
        return res.status(400).json({ message: "Email already verified" });
    }
    //update user to verified
    user.isVerified = true;
    user.emailToken = undefined;
    user.emailTokenExpiry = undefined;
    await user.save();
    res.status(200).json({ message: "Email verified successfully", userType });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } 
};