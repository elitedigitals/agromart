//get all sellers
export const getAllSellers = async (req, res) => {
    try {
        const sellers = await Seller.find().select('-password -emailToken -emailTokenExpiry -resetPasswordToken -resetPasswordExpires');
        res.status(200).json(sellers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
//get single seller by id
export const getSellerById = async (req, res) => {
    try {
        const seller = await Seller.findById(req.params.id).select('-password -emailToken -emailTokenExpiry -resetPasswordToken -resetPasswordExpires');
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }   
        res.status(200).json(seller);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

//delete seller by id
export const deleteSellerById = async (req, res) => {
    try {
        const seller = await Seller.findByIdAndDelete(req.params.id);
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }
        res.status(200).json({ message: "Seller deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }   
};

//update seller by id
export const updateSellerById = async (req, res) => {
    const { fullName, phone, nin, storeName, location } = req.body;
    try {
        const seller = await Seller.findById(req.params.id);
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
        res.status(200).json({ message: "Seller updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

