const express = require("express");
const {
  createProduct,
  getProducts,
  getProductById,
  deleteProductById,
  updateProductById,
} = require("../Controllers/productController");
const router = express.Router();
const upload = require("../Middleware/uploadMiddleware");
const { adminValidation } = require("../Middleware/authMiddleware");

// Test endpoint without auth
router.get("/test", (req, res) => {
  res.json({ message: "Product routes working", timestamp: new Date().toISOString() });
});

router.use(adminValidation);
router.post("/product", upload.any(20), createProduct);
router.put("/product/:id", upload.any(20), updateProductById);
router.get("/products", getProducts);
router.get("/product/:id", getProductById);
router.delete("/product/:id", deleteProductById);
// Basic test endpoint
router.put("/product/:id/test", (req, res) => {
  console.log("TEST ENDPOINT HIT - ID:", req.params.id);
  res.json({ message: "Test endpoint working", id: req.params.id });
});

// Minimal update without validation
router.put("/product/:id/minimal", async (req, res) => {
  try {
    console.log("MINIMAL UPDATE - ID:", req.params.id);
    console.log("MINIMAL UPDATE - Body:", req.body);

    const Product = require("../Models/productdetails");
    const { id } = req.params;

    // Just update the name field to test
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { name: req.body.name || "Test Update" },
      { new: true, runValidators: false }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Minimal update successful", product: updatedProduct });
  } catch (error) {
    console.error("MINIMAL UPDATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add upload middleware back - frontend sends FormData


module.exports = router;
