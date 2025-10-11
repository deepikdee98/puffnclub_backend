const express = require("express");
const {
  getPublicProducts,
  getPublicProductById,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts,
  getPublicBanners,
  subscribeNewsletter,
  getProductReviews,
  submitReview,
  getProductReviewStats,
} = require("../Controllers/websiteController");

const router = express.Router();

// Middleware for customer authentication
const { customerValidation } = require("../Middleware/websiteAuthMiddleware");

// Public routes (no authentication required)
router.get("/banners", getPublicBanners);
router.get("/products", getPublicProducts);
router.get("/products/featured", getFeaturedProducts);
router.get("/products/category/:category", getProductsByCategory);
router.get("/products/search", searchProducts);
router.get("/product/:id", getPublicProductById);
router.post("/newsletter/subscribe", subscribeNewsletter);

// Review routes
router.get("/products/:productId/reviews", getProductReviews);
router.get("/products/:productId/reviews/stats", getProductReviewStats);
router.post("/products/:productId/reviews", customerValidation, submitReview);

module.exports = router;