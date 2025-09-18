import Buyer from "../model/buyer.js";
import bcrypt from "bcryptjs";
import Wallet from "../model/wallet.js";
import Transaction from "../model/transaction.js";
import { sendVerificationEmail } from "../helpers/sendEmail.js";
import { v4 as uuidv4 } from "uuid";
//sign up buyer
export const signUpBuyer = async (req, res) => {
    const { fullName, email, password, address, phone } = req.body;
    try {
        //validate input
        if (!fullName || !email || !password || !address ||!phone) {
            return res
            .status(400)
            .json({ message: "Please provide all required fields" });
        }
        //check if user exists
        const existingBuyer = await Buyer.findOne({ email });
        if (existingBuyer) {
            return res
            .status(400)
            .json({ message: "Account with this email already exists" });   
        }
        //hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        //generate email verification token using uuid
        const emailToken = uuidv4();
        //save token and its expiry (15 minutes from now)
        const emailTokenExpiry = Date.now() + 15 * 60 * 1000; //15 minutes
        
        //create new buyer
    
        const newBuyer = new Buyer({
            fullName,
            email,
            phone,
            password: hashedPassword,
            address,
            emailToken,       //save token in DB
            emailTokenExpiry, //save token expiry in DB
            isVerified: false //default false until email verification
        });
        await newBuyer.save();

        //send verification email
        await sendVerificationEmail(newBuyer.email, emailToken, newBuyer.fullName,);

        //respond with success message
        return res
        .status(201)
        .json({ message: "Buyer registered successfully. Please verify your email to login." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//dashboard route for 
export const getDashboardData = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id, userType: "Buyer" });
    const transactions = await Transaction.find({ user: req.user._id, userType: "Buyer" })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({message: "Welcome to Buyer Dashboard",
      Balance: wallet ? wallet.balance : 0,
      transactions,
    });
  } catch (error) {
    console.error("Dashboard Error:", error.message);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};


//get buyer profile
export const getBuyerProfile = async (req, res) => {
    try {
        const buyer = await Buyer.findById(req.user._id).select("-password -emailToken -emailTokenExpiry -resetPasswordToken -resetPasswordExpires");
        if (!buyer) {
            return res.status(404).json({ message: "Buyer not found" });
        }
        res.status(200).json(buyer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//update buyer profile
export const updateBuyerProfile = async (req, res) => {
    const { fullName, phone, Address } = req.body;
    try {
        const buyer = await Buyer.findById(req.user._id);
        if (!buyer) {
            return res.status(404).json({ message: "Buyer not found" });
        }  
        //update fields
        if (fullName) buyer.fullName = fullName;
        if (phone) buyer.phone = phone;
        if (Address) buyer.Address = Address;
        await buyer.save();
        res.status(200).json({ message: "Buyer updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//delete buyer profile
export const deleteBuyerProfile = async (req, res) => {
    try {
        const buyer = await Buyer.findByIdAndDelete(req.user._id);
        if (!buyer) {
            return res.status(404).json({ message: "Buyer not found" });
        }
        res.status(200).json({ message: "Buyer deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }   
};



    