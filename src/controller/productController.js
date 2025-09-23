  import Product from "../model/product.js";
  import Seller from "../model/seller.js";
  
  //Add product controller for sellers
export const addProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, images } = req.body;
    const sellerId = req.user._id; // user ID is available in req.user

    // Validate input
    if (!name || !description || !price || !category || !stock) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Collect image paths (both uploaded files and image URLs)
    let imagePaths = [];

    // Case 1: Uploaded files via multer
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map((file) => file.path); // Local paths from uploads folder
    }

    // Case 2: URLs passed in JSON body
    if (images) {
      if (Array.isArray(images)) {
        imagePaths = [...imagePaths, ...images]; // merge both
      } else {
        imagePaths.push(images); // single URL string
      }
    }

    // Create new product
    const newProduct = new Product({
      name,
      description,
      price,
      category,
      stock,
      images: imagePaths,
      seller: sellerId,
    });

    await newProduct.save();

    res.status(201).json({
      message: "Product added successfully",
      product: newProduct,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//get all products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("seller", "fullName storeName phone avatar address isVerified");

    res.status(200).json(products);
  } catch (error) {
    console.error("getAllProducts error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get product by id for buyers
export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id).populate("seller", "name email");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

//get all products for a seller
export const getSellerProducts = async (req, res) => {
    try {
        const sellerId = req.user.userId; // Assuming user ID is available in req.user
        const products = await Product.find({ seller: sellerId });
        res.status(200).json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//get single product by id for a seller
export const getSellerProductById = async (req, res) => {
    try {
        const sellerId = req.user.userId; // Assuming user ID is available in req.user
        const product = await Product.findOne({ _id: req.params.id, seller: sellerId });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//update product by id for a seller
export const updateSellerProductById = async (req, res) => {
    try {
        const sellerId = req.user.userId; // Assuming user ID is available in req.user
        const { name, description, price, category, stock, image } = req.body;
        const product = await Product.findOne({ _id: req.params.id, seller: sellerId });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        //update fields
        if (name) product.name = name;
        if (description) product.description = description;
        if (price) product.price = price;
        if (category) product.category = category;
        if (stock) product.stock = stock;
        if (image) product.image = image;
        await product.save();
        res.status(200).json({ message: "Product updated successfully", product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
//delete product by id for a seller
export const deleteSellerProductById = async (req, res) => {
    try {
        const sellerId = req.user.userId; // Assuming user ID is available in req.user
        const product = await Product.findOneAndDelete({ _id: req.params.id, seller: sellerId });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }   
};