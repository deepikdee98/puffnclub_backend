const express = require("express");
const {
  submitExchangeRequest,
  submitReturnRequest,
  getCustomerRequests,
  getRequestById,
  cancelRequest,
} = require("../Controllers/exchangeReturnController");
const { customerValidation } = require("../Middleware/websiteAuthMiddleware");

const router = express.Router();

// All routes require customer authentication
router.use(customerValidation);

// Exchange routes
router.post("/orders/:orderId/exchange", submitExchangeRequest);

// Return routes
router.post("/orders/:orderId/return", submitReturnRequest);

// Get all requests
router.get("/exchange-returns", getCustomerRequests);

// Get single request
router.get("/exchange-returns/:requestId", getRequestById);

// Cancel request
router.put("/exchange-returns/:requestId/cancel", cancelRequest);

module.exports = router;


