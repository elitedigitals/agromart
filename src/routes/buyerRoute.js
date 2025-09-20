import express from "express";
import { updateBuyerProfile, getBuyerProfile, signUpBuyer, deleteBuyerProfile, wallet } from "../controller/buyerController.js";
import { protect } from "../middleware/authentication.js";
import { authorize } from "../middleware/authorization.js";
const router = express.Router();

//route for registering buyer
router.post("/register", signUpBuyer);


//Dashboard route for buyer
router.get("/wallet", protect, authorize("Buyer"), wallet);
//route for getting buyer profile
router.get("/profile", protect, authorize("Buyer"), getBuyerProfile);

//route for updating buyer profile
router.put("/update-profile", protect, authorize("Buyer"),updateBuyerProfile);

//route for getting buyer profile
router.get("/delete-profile", protect, authorize("Buyer"), deleteBuyerProfile);
//route for deleting buyer profile

export default router;
