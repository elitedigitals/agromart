// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import Buyer from "../model/buyer.js";
import Seller from "../model/seller.js";
import dotenv from "dotenv";
dotenv.config();

export const protect =  async(req, res, next) => {

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader){
      return res
      .status(400)
      .json({message: "Authorization header is missing"});
    }

    //Extract token from Authorization header
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res
      .status(401)
      .json({ message: "Not authorized, no token" });
    }

    //Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId;
    if (!decoded) {
      return res
      .status(401)
      .json({ message: "Not authorized, token failed" });
    }

    //seacrh for user in DB
    let user = await Seller.findById(id).select("-password");
    if (!user) {
      user = await Buyer.findById(id).select("-password");
      if (!user) {
        return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
      }
    }
    req.user = user;
    next();
  }catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};
  
  
  