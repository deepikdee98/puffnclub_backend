const express = require("express");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../Controllers/websiteCartController");
const { customerValidation } = require("../Middleware/websiteAuthMiddleware");

const router = express.Router();

// All cart routes require customer authentication
router.use(customerValidation);

router.post("/add", addToCart);
router.get("/", getCart);
router.put("/item/:itemId", updateCartItem);
router.delete("/item/:itemId", removeFromCart);
router.delete("/clear", clearCart);

module.exports = router;