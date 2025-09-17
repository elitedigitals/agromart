import express from "express";
import { login, forgotPassword, resetPassword, verifyEmail } from "../controller/authController.js";
const router = express.Router();

//route for authentication
router.post("/login", login);

//route for forgot password
router.post("/forgot-password", forgotPassword);

//route for reset password
router.post("/reset-password", resetPassword);

//verity email for both buyer and seller
router.post("/verify-email", verifyEmail);

export default router;