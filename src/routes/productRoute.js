import { protect } from "../middleware/authentication.js";
import { authorize } from "../middleware/authorization.js";
import { addProduct, getSellerProducts, updateSellerProductById, deleteSellerProductById, getAllProducts } from "../controller/productController.js";
import upload from "../middleware/upload.js"; 

import express from "express";
const router = express.Router();


//get all products - only for buyers
router.get("/all", protect, authorize("Buyer"), getAllProducts);
//route to add product - only for sellers
router.post("/add-product", protect, authorize("Seller"), upload.array('images', 5), addProduct);

//route to get all products - only for sellers
router.get("/", protect, authorize("seller"), getSellerProducts);

//route to update product - only for sellers
router.put("/update/:id", protect, authorize("Seller"), updateSellerProductById);

//route to delete product - only for sellers
router.delete("/delete/:id", protect, authorize("Seller"), deleteSellerProductById);

export default router;