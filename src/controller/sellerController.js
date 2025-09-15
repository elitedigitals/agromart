import Seller from "../model/seller.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid"; 
import { sendVerificationEmail } from "../helpers/sendEmail.js";

export const sellerSignup = async (req, res) => {
  const { fullName, email, phone, nin, password, storeName, location } = req.body;

  try {
    // Validate input
    if (!fullName || !email || !phone || !password || !storeName || !location) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Check if seller already exists
    let user = await Seller.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Account already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token (uuid method)
    const emailToken = uuidv4();
    // Save token and its expiry (15 minutes from now)
    const emailTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    

    // Create new seller
    user = new Seller({
      fullName,
      email,
      phone,
      nin,
      password: hashedPassword,
      storeName,
      location,
      emailToken,       // save token in DB
      emailTokenExpiry, // save token expiry in DB
      isVerified: false // default false until email verification
    });

    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, emailToken, user.fullName);

    res.status(201).json({
      message: "Account created successfully. Please verify your email to login."
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



//get seller profile
export const getSellerProfile = async (req, res) => {
    try {
        const sellerId = req.user.userId; // Assuming user ID is available in req.user
        const seller = await Seller.findById(sellerId).select('-password -emailToken -emailTokenExpiry -resetPasswordToken -resetPasswordExpires');
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }
        res.status(200).json(seller);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//update seller profile
export const updateSellerProfile = async (req, res) => {
    const { fullName, phone, nin, storeName, location } = req.body;
    try {
        const sellerId = req.user.userId;
        const seller = await Seller.findById(sellerId);
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }
        //update fields
        if (fullName) seller.fullName = fullName;
        if (phone) seller.phone = phone;
        if (nin) seller.nin = nin;
        if (storeName) seller.storeName = storeName;
        if (location) seller.location = location;
        await seller.save();
        res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//delete seller profile
export const deleteSellerProfile = async (req, res) => {
    try {
        const sellerId = req.user.userId;
        const seller = await Seller.findByIdAndDelete(sellerId);
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }
        res.status(200).json({ message: "Profile deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

