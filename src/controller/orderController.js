import Order from "../model/order.js";
import Wallet from "../model/wallet.js";
import Product from "../model/product.js";


//buyer places order → hold funds in escrow
export const placeOrder = async (req, res) => {
  try {
    const { productId } = req.body;
    const buyerId = req.user._id; // assume auth middleware sets req.user
    const buyerType = "Buyer";

    // 1. Get product
    const product = await Product.findById(productId).populate("seller");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const amount = product.price;
    const sellerId = product.seller._id;

    // 2. Get buyer wallet
    const buyerWallet = await Wallet.findOne({ user: buyerId, userType: buyerType });
    if (!buyerWallet || buyerWallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // 3. Deduct from buyer wallet
    buyerWallet.balance -= amount;
    await buyerWallet.save();

    // 4. Create order with escrow hold
    const order = new Order({
      product: productId,
      buyer: buyerId,
      seller: sellerId,
      amount,
      escrowAmount: amount,
      status: "pending",
    });
    await order.save();

    res.status(201).json({
      message: "Order placed successfully, funds held in escrow",
      order,
    });
  } catch (error) {
    res.status(500).json({ message: "Error placing order", error: error.message });
  }
};
