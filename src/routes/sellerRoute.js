import { getSellerProfile, updateSellerProfile, deleteSellerProfile, sellerSignup, saveBankDetails } from "../controller/sellerController.js";
import { protect } from "../middleware/authentication.js";
import { authorize } from "../middleware/authorization.js";
import express from "express";

const router = express.Router();

// protected route for sellers

//Seller registration
router.post("/register", sellerSignup);


router.get("/dashboard", protect, authorize("seller"), (req, res) => {
  res.status(200).json({ message: "Welcome to the seller dashboard!" });
});

//get seller profile
router.get("/profile", protect, authorize("seller"), getSellerProfile);

//update seller profile
router.put("/update-profile", protect, authorize("seller"), updateSellerProfile);


//delete seller account
router.delete("/delete-account", protect, authorize("seller"), deleteSellerProfile);


//add sellers bank details
router.post("/add-bank-details", protect, authorize("seller"), saveBankDetails);
export default router;