import mongoose from "mongoose";
import Product from "../model/product.js";
import Order from "../model/order.js";
import Wallet from "../model/wallet.js";
import Escrow from "../model/escrow.js";

export const placeOrder = async (req, res) => {
const session = await mongoose.startSession();
session.startTransaction();

const log = (step, message, data = "") => {
console.log(`[${new Date().toISOString()}] ${step}: ${message}`, data);
};

try {
    const { productId } = req.body;
    const buyerId = req.user._id;
    const buyerType = "Buyer";


    log("Step 0", "Start placing order", { buyerId, productId });

    // Get product with seller populated
    const product = await Product.findById(productId).populate("seller").session(session);
    if (!product) {
      log("Step 1", "Product not found");
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Product not found" });
    }
    log("Step 1", "Product found", { title: product.title, price: product.price });

    const amount = product.price;
    const sellerId = product.seller._id;
    log("Step 1a", "Seller ID", sellerId);

    // 2️⃣ Get buyer wallet
    const buyerWallet = await Wallet.findOne({ user: buyerId, userType: buyerType }).session(session);
    if (!buyerWallet) {
      log("Step 2", "Buyer wallet not found");
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Buyer wallet not found" });
    }

    // 3️⃣ Check buyer balance
    if (buyerWallet.balance < amount) {
      log("Step 3", "Insufficient wallet balance", { balance: buyerWallet.balance, required: amount });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }
    log("Step 3", "Buyer wallet has sufficient balance");

    // 4️⃣ Deduct from buyer wallet and increase escrow
    buyerWallet.balance -= amount;
    buyerWallet.escrowBalance += amount;
    await buyerWallet.save({ session });
    log("Step 4", "Buyer wallet updated", { balance: buyerWallet.balance, escrowBalance: buyerWallet.escrowBalance });

    // 5️⃣ Create order
    const order = new Order({
      product: productId,
      buyer: buyerId,
      seller: sellerId,
      totalAmount: amount,
      escrowAmount: amount,
      status: "pending",
    });
    await order.save({ session });
    log("Step 5", "Order created", { orderId: order._id });

    // 6️⃣ Update seller wallet escrow (dual-wallet)
    let sellerWallet = await Wallet.findOne({ user: sellerId, userType: "Seller" }).session(session);
    if (!sellerWallet) {
      sellerWallet = new Wallet({
        user: sellerId,
        userType: "Seller",
        balance: 0,
        escrowBalance: amount,
      });
      log("Step 6", "Seller wallet created", { escrowBalance: sellerWallet.escrowBalance });
    } else {
      sellerWallet.escrowBalance += amount;
      log("Step 6", "Seller wallet updated", { escrowBalance: sellerWallet.escrowBalance });
    }
    await sellerWallet.save({ session });

    // 7️⃣ Create escrow record
    const escrow = new Escrow({
      order: order._id,
      buyer: buyerId,
      seller: sellerId,
      amount: amount,
      status: "holding",
    });
    await escrow.save({ session });
    log("Step 7", "Escrow record created", { escrowId: escrow._id });

    // 8️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();
    log("Step 8", "Transaction committed successfully");

    return res.status(201).json({
      message: "Order placed successfully, funds held in escrow",
      order,
      escrow,
    });
} catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(`[${new Date().toISOString()}] PlaceOrder Error:`, error);
    return res.status(500).json({ message: "Error placing order", error: error.message });
  }
};




//buyer places order → hold funds in escrow
// export const placeOrde = async (req, res) => {
//   try {
//     const { productId } = req.body;
//     const buyerId = req.user._id; 
//     const buyerType = "Buyer";

//     // 1. Get product
//     const product = await Product.findById(productId).populate("seller");
//     if (!product) return res.status(404).json({ message: "Product not found" });

//     //02-10-1997 : check the quantity of the product
//     //if (product.quantity < 1) {
//       //return res.status(400).json({ message: "Product is out of stock" });
//     //}
//     const amount = product.price;
//     const sellerId = product.seller._id;

//     // 2. Get buyer wallet
//     const buyerWallet = await Wallet.findOne({ user: buyerId, userType: buyerType });
//     if (!buyerWallet || buyerWallet.balance < amount) {
//       return res.status(400).json({ message: "Insufficient wallet balance" });
//     }

//     // 3. Deduct from buyer wallet
//     buyerWallet.balance -= amount;
//     buyerWallet.escrowBalance += amount;
//     await buyerWallet.save();

//     // 4. Create order with escrow hold
//     const order = new Order({
//       product: productId,
//       buyer: buyerId,
//       seller: sellerId,
//       totalAmount: amount,
//       escrowAmount: amount,
//       status: "pending",
//     });
//     await order.save();

//     // 5. Add the amount to seller's escrow wallet
//     const sellerWallet = await Wallet.findOne({ user: sellerId, userType: "Seller" });
//     if (sellerWallet) {
//       sellerWallet.escrowBalance += amount;
//       await sellerWallet.save();
//     }

//     // 6. Create an escrow record 02-10-1997
//     const escrow = new Escrow({
//       order: order._id,
//       buyer: buyerId,
//       seller: sellerId,
//       amount: amount,
//       status: "holding", // default status
//     });
//     await escrow.save();

//     res.status(201).json({
//       message: "Order placed successfully, funds held in escrow",
//       order,
//       escrow, // return escrow
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error placing order", error: error.message });
//   }
// };


//get the buyer orders
export const getBuyerOrders = async (req, res) => {
    try {
        const buyerId = req.user._id; 

        const orders = await Order.find({ buyer: buyerId })
            .populate("product")
            .populate("seller", "fullName email phone storeName");

        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


//The buyer orders to sellers in dela orders receive 
export const getSellerOrders = async (req, res) => {
    try {
        const sellerId = req.user._id; // Correct seller ID

        const orders = await Order.find({ seller: sellerId })
            .populate("product")
            .populate("buyer", "fullName email phone address"); // Valid populate only

        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


