import express from "express";
import { protect } from "../middleware/authentication.js";
import { authorize } from "../middleware/authorization.js";
import { requestRefund, approveRefund, confirmDelivery } from "../controller/escrowController.js";

const router = express.Router();


//get all escrow transactions for user (buyer or seller)
router.get("/escrows/my-transactions", protect, authorize("Buyer", "Seller"), async (req, res) => {
    res.send("Get my escrow transactions - to be implemented");
});
// Seller confirms delivery
router.post("/escrow/confirm-delivery", protect, authorize("Seller"), confirmDelivery);

//buyer confirms delivery → release escrow to seller
router.post("/escrow/confirm-delivery", protect, authorize("Buyer"), confirmDelivery);

// Buyer requests refund
router.post("/escrow/request-refund", protect, authorize("Buyer"), requestRefund);

// Admin approves refund
router.post("/escrow/approve-refund", protect, authorize("Admin"), approveRefund);