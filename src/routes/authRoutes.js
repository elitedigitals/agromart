import express from "express";
import { login, forgotPassword, resetPassword, verifyEmail } from "../controller/authController.js";
const router = express.Router();

//route for authentication
router.post("/login", login);

//route for forgot password
router.post("/forgot-password", forgotPassword);

//route for reset password
router.get("/reset-password/:token", resetPassword);

//verity email for both buyer and seller
router.get("/verify-email", verifyEmail);

export default router;