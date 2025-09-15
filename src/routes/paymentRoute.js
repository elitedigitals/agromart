import express from "express";
import { protect } from "../middleware/authentication.js";
import {authorize} from "../middleware/authorization.js";
import { initDeposit, verifyDeposit, paystackWebhook } from "../controller/paymentController.js";


const router = express.Router();

// // Buyer deposit routes
router.post("/deposit/init", protect, authorize("Buyer"), initDeposit);

// Buyer or frontend can call verify (optional, if you want to double-check)
router.get("/deposit/verify", protect, authorize("Buyer"),  verifyDeposit);

 // Paystack webhook (MUST be public, no auth middleware)
router.post("/webhook/paystack", paystackWebhook);

export default router;
