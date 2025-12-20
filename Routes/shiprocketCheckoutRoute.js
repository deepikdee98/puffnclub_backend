const express = require('express');
const {
  fetchProducts,
  fetchProductsByCollection,
  fetchCollections,
  generateAccessToken,
  handleOrderWebhook,
  getOrderDetails,
  getAvailablePoints,
  blockLoyaltyPoints,
  unblockLoyaltyPoints
} = require('../Controllers/shiprocketCheckoutController');
const { verifyShiprocketHMAC } = require('../Middleware/shiprocketAuthMiddleware');

const router = express.Router();

// ==========================================
// CATALOG SYNC APIs (For Shiprocket to call)
// ==========================================

/**
 * Fetch all products
 * Called by Shiprocket to sync catalog
 */
router.get('/catalog/products', fetchProducts);

/**
 * Fetch products by collection (category)
 * Called by Shiprocket to sync collection-specific products
 */
router.get('/catalog/products/collection/:collectionId', fetchProductsByCollection);

/**
 * Fetch all collections (categories)
 * Called by Shiprocket to sync collections
 */
router.get('/catalog/collections', fetchCollections);

// ==========================================
// CHECKOUT APIs
// ==========================================

/**
 * Generate access token for checkout
 * POST /api/shiprocket/checkout/access-token
 * Requires: HMAC authentication
 * Body: { cart_data, redirect_url, timestamp }
 */
router.post('/checkout/access-token', verifyShiprocketHMAC, generateAccessToken);

/**
 * Order webhook receiver
 * POST /api/shiprocket/checkout/order-webhook
 * Called by Shiprocket when order is placed
 */
router.post('/checkout/order-webhook', handleOrderWebhook);

/**
 * Get order details
 * GET /api/shiprocket/checkout/order/:orderId
 * Requires: HMAC authentication
 */
router.get('/checkout/order/:orderId', verifyShiprocketHMAC, getOrderDetails);

// ==========================================
// LOYALTY & WALLET APIs
// ==========================================

/**
 * Get available loyalty points
 * POST /api/shiprocket/loyalty/points/fetch
 * Requires: HMAC authentication
 * Body: { mobile_number }
 */
router.post('/loyalty/points/fetch', verifyShiprocketHMAC, getAvailablePoints);

/**
 * Block loyalty points at checkout
 * POST /api/shiprocket/loyalty/points/block
 * Requires: HMAC authentication
 * Body: { mobile_number, transactional_points, order_id }
 */
router.post('/loyalty/points/block', verifyShiprocketHMAC, blockLoyaltyPoints);

/**
 * Unblock loyalty points on cart abandonment
 * POST /api/shiprocket/loyalty/points/unblock
 * Requires: HMAC authentication
 * Body: { order_id, transactional_points }
 */
router.post('/loyalty/points/unblock', verifyShiprocketHMAC, unblockLoyaltyPoints);

module.exports = router;