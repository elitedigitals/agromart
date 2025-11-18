import express from "express";
import { protect } from "../middleware/authentication.js";
import { authorize } from "../middleware/authorization.js";
import { placeOrder, getBuyerOrders, getSellerOrders } from "../controller/orderController.js";

const router = express.Router();

// Buyer places order
router.post("/order/place", protect, authorize("Buyer"), placeOrder);

//buyer gets his orders
router.get("/orders/buyer", protect, authorize("Buyer",), getBuyerOrders);

//get seller orders - to be implemented
router.get("/orders/seller", protect, authorize("Seller"),getSellerOrders);


export default router;