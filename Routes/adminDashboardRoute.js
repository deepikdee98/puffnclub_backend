const express = require("express");
const router = express.Router();
const {
  getTopProducts,
  getRecentOrders,
  getOrderDetails,
  getMetrics,
  getSalesChart,
  getRecentActivity,
} = require("../Controllers/adminDashboardController");
const { adminValidation } = require("../Middleware/authMiddleware");

router.use(adminValidation);
router.get("/top-products", getTopProducts);
router.get("/recent-orders", getRecentOrders);
router.get("/metrics", getMetrics);
router.get("/sales-chart", getSalesChart);
router.get("/recent-activity", getRecentActivity);
router.get("/order-details/:orderId", getOrderDetails);

module.exports = router;
