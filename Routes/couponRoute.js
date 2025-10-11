const express = require('express');
const router = express.Router();
const {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon,
  getCouponStats,
  getActiveCoupons,
} = require('../Controllers/couponController');
const { adminValidation } = require('../Middleware/authMiddleware');

// Public routes
router.get('/active', getActiveCoupons);
router.post('/validate', validateCoupon);

// Protected routes (Admin only)
router.use(adminValidation); // Apply authentication middleware to all routes below

router.route('/')
  .get(getCoupons)
  .post(createCoupon);

router.get('/stats', getCouponStats);

router.route('/:id')
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

router.patch('/:id/toggle', toggleCouponStatus);

module.exports = router;