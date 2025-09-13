const express = require("express");
const {
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  getOrderByOrderNumber,
  getPendingOrders,
  updateOrderStatus,
  getOrdersByStatus,
  deleteOrder,
  debugOrderData,
} = require("../Controllers/orderController");
const { adminValidation } = require("../Middleware/authMiddleware");

const router = express.Router();

router.use(adminValidation);

// GET routes
router.get("/", getAllOrders);
router.get("/debug", debugOrderData);
router.get("/pending", getPendingOrders);
router.get("/status/:status", getOrdersByStatus);
router.get("/user/:userId", getOrdersByUserId);
router.get("/orderNumber/:orderNumber", getOrderByOrderNumber);
router.get("/:id", getOrderById);

// PUT routes
router.put("/:id/status", updateOrderStatus);

// DELETE routes
router.delete("/:id", deleteOrder);

module.exports = router;
