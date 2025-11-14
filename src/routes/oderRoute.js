import express from "express";
import { protect } from "../middleware/authentication.js";
import { authorize } from "../middleware/authorization.js";
import { placeOrder } from "../controller/orderController.js";

const router = express.Router();

// Buyer places order
router.post("/order/place/:id", protect, authorize("Buyer"), placeOrder);

export default router;