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

    //02-10-1997 : check the quantity of the product
    //if (product.quantity < 1) {
      //return res.status(400).json({ message: "Product is out of stock" });
    //}
    const amount = product.price;
    const sellerId = product.seller._id;

    // 2. Get buyer wallet
    const buyerWallet = await Wallet.findOne({ user: buyerId, userType: buyerType });
    if (!buyerWallet || buyerWallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // 3. Deduct from buyer wallet
    buyerWallet.balance -= amount;
    buyerWallet.escrowBalance += amount;
    await buyerWallet.save();

    // 4. Create order with escrow hold
    const order = new Order({
      product: productId,
      buyer: buyerId,
      seller: sellerId,
      totalAmount: amount,
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

//get the buyer orders
export const getBuyerOrders = async (req, res) => {
    try {
        const buyerId = req.user.userId; // Assuming user ID is available in req.user
        const orders = await Order.find({ buyer: buyerId })
            .populate("product")
            .populate("seller", "fullName email phone storeName")
            .populate("escrowAmount")
            .populate("escrow_status")
            .populate("timestamps");

        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//The buyer orders to sellers in dela orders receive 
export const getSellerOrders = async (req, res) => {
    try {
        const sellerId = req.user.userId; // Assuming user ID is available in req.user
        const orders = await Order.find({ seller: sellerId })
            .populate("product")
            .populate("buyer", "fullName email phone address")
            .populate("escrowAmount")
            .populate("escrow_status")
            .populate("timestamps");
        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
