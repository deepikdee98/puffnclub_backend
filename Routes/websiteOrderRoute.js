const express = require("express");
const {
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
  getOrderTracking,
  cancelOrder,
} = require("../Controllers/websiteOrderController");
const { customerValidation } = require("../Middleware/websiteAuthMiddleware");

const router = express.Router();

// All order routes require customer authentication
router.use(customerValidation);

router.post("/", createCustomerOrder);
router.get("/", getCustomerOrders);
router.get("/:orderId", getCustomerOrderById);
router.get("/:orderId/tracking", getOrderTracking);
router.put("/:orderId/cancel", cancelOrder);

module.exports = router;