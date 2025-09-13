const express = require("express");
const {
  getPublicProducts,
  getPublicProductById,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts,
  getPublicBanners,
  subscribeNewsletter,
} = require("../Controllers/websiteController");

const router = express.Router();

// Public routes (no authentication required)
router.get("/banners", getPublicBanners);
router.get("/products", getPublicProducts);
router.get("/products/featured", getFeaturedProducts);
router.get("/products/category/:category", getProductsByCategory);
router.get("/products/search", searchProducts);
router.get("/product/:id", getPublicProductById);
router.post("/newsletter/subscribe", subscribeNewsletter);

module.exports = router;