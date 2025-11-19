import express from "express";
import connectDB from "./src/config/db.js";
import dotenv from "dotenv";
import authRoutes from "./src/routes/authRoutes.js";
import sellerRoutes from "./src/routes/sellerRoute.js";
import productRoutes from "./src/routes/productRoute.js";
import buyerRoutes from "./src/routes/buyerRoute.js";
import paymentRoutes from "./src/routes/paymentRoute.js";
import orderRoutes from "./src/routes/oderRoute.js";
import escrowRoutes from "./src/routes/escrowRoute.js";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: "*" }));

//middleware
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // save raw body for crypto hash
    },
  })
);
app.use(express.urlencoded({ extended: true }));

//product images static folder
app.use('/uploads', express.static('uploads'));

//routes
app.use("/api/auth", authRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/product", productRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/escrow", orderRoutes);


app.get("/", (req, res) => {
  res.send("AgroMart API is running...");
});


//connect to database and start server
app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on port ${PORT}`);
});