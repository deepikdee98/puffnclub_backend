const express = require("express");
const {
  createOrder,
  getOrdersByUserId,
  getOrderById,
} = require("../Controllers/orderController");


const router = express.Router();

router.post("/orders", createOrder);
router.get("/orders/user/:userId", getOrdersByUserId);
router.get("/orders/:id", getOrderById);

module.exports = router;
