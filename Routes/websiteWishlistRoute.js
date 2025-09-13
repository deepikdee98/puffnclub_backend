const express = require("express");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart,
} = require("../Controllers/websiteWishlistController");
const { customerValidation } = require("../Middleware/websiteAuthMiddleware");

const router = express.Router();

// All wishlist routes require customer authentication
router.use(customerValidation);

router.post("/add", addToWishlist);
router.get("/", getWishlist);
router.delete("/item/:itemId", removeFromWishlist);
router.delete("/clear", clearWishlist);
router.post("/move-to-cart/:itemId", moveToCart);

module.exports = router;