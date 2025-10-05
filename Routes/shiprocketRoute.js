const express = require("express");
const {
  getShippingRates,
  checkServiceability,
  handleWebhook,
  getOrderTracking,
  getPickupLocations
} = require("../Controllers/shiprocketController");
const { customerValidation } = require("../Middleware/websiteAuthMiddleware");
const { adminValidation } = require("../Middleware/authMiddleware");

const router = express.Router();

// Public routes (no authentication required)
router.post("/shipping/rates", getShippingRates);
router.get("/shipping/serviceability/:pincode", checkServiceability);
router.post("/shipping/webhook", handleWebhook);

// Customer routes (require customer authentication)
router.get("/orders/:orderId/tracking", customerValidation, getOrderTracking);

// Admin routes (require admin authentication)
router.get("/admin/pickup-locations", adminValidation, getPickupLocations);

module.exports = router;