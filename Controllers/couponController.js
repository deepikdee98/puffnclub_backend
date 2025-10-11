const Coupon = require('../Models/coupon');
const asyncHandler = require('express-async-handler');

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private (Admin)
const getCoupons = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {};

  // Search by code or description
  if (search) {
    query.$or = [
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by status
  if (status === 'active') {
    const now = new Date();
    query.isActive = true;
    query.startDate = { $lte: now };
    query.endDate = { $gte: now };
  } else if (status === 'inactive') {
    query.isActive = false;
  } else if (status === 'expired') {
    query.endDate = { $lt: new Date() };
  } else if (status === 'scheduled') {
    query.startDate = { $gt: new Date() };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [coupons, total] = await Promise.all([
    Coupon.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('applicableCategories', 'name')
      .lean(),
    Coupon.countDocuments(query),
  ]);

  // Add computed fields
  const now = new Date();
  const couponsWithStatus = coupons.map((coupon) => ({
    ...coupon,
    status: getCouponStatus(coupon, now),
    remainingUses:
      coupon.usageLimit !== null
        ? Math.max(0, coupon.usageLimit - coupon.usageCount)
        : null,
  }));

  res.status(200).json({
    success: true,
    data: couponsWithStatus,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// @desc    Get single coupon
// @route   GET /api/coupons/:id
// @access  Private (Admin)
const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('applicableCategories', 'name')
    .populate('applicableProducts', 'name price')
    .populate('excludedProducts', 'name');

  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }

  const now = new Date();
  const couponData = coupon.toObject();
  couponData.status = getCouponStatus(couponData, now);
  couponData.remainingUses =
    coupon.usageLimit !== null
      ? Math.max(0, coupon.usageLimit - coupon.usageCount)
      : null;

  res.status(200).json({
    success: true,
    data: couponData,
  });
});

// @desc    Create new coupon
// @route   POST /api/coupons
// @access  Private (Admin)
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minimumPurchase,
    maximumDiscount,
    usageLimit,
    perUserLimit,
    startDate,
    endDate,
    isActive,
    applicableProducts,
    applicableCategories,
    excludedProducts,
    applicableToAll,
    firstTimeUserOnly,
    freeShipping,
  } = req.body;

  // Check if coupon code already exists
  const existingCoupon = await Coupon.findOne({
    code: code.toUpperCase().trim(),
  });

  if (existingCoupon) {
    res.status(400);
    throw new Error('Coupon code already exists');
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    res.status(400);
    throw new Error('End date must be after start date');
  }

  // Validate discount value
  if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
    res.status(400);
    throw new Error('Percentage discount must be between 0 and 100');
  }

  if (discountValue <= 0) {
    res.status(400);
    throw new Error('Discount value must be greater than 0');
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    description,
    discountType,
    discountValue,
    minimumPurchase: minimumPurchase || 0,
    maximumDiscount: maximumDiscount || null,
    usageLimit: usageLimit || null,
    perUserLimit: perUserLimit || null,
    startDate: start,
    endDate: end,
    isActive: isActive !== undefined ? isActive : true,
    applicableProducts: applicableProducts || [],
    applicableCategories: applicableCategories || [],
    excludedProducts: excludedProducts || [],
    applicableToAll: applicableToAll !== undefined ? applicableToAll : true,
    firstTimeUserOnly: firstTimeUserOnly || false,
    freeShipping: freeShipping || false,
    createdBy: req.user?._id || req.user?.id,
  });

  const populatedCoupon = await Coupon.findById(coupon._id)
    .populate('createdBy', 'name email')
    .populate('applicableCategories', 'name');

  res.status(201).json({
    success: true,
    message: 'Coupon created successfully',
    data: populatedCoupon,
  });
});

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private (Admin)
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }

  const {
    code,
    description,
    discountType,
    discountValue,
    minimumPurchase,
    maximumDiscount,
    usageLimit,
    perUserLimit,
    startDate,
    endDate,
    isActive,
    applicableProducts,
    applicableCategories,
    excludedProducts,
    applicableToAll,
    firstTimeUserOnly,
    freeShipping,
  } = req.body;

  // Check if code is being changed and if new code already exists
  if (code && code.toUpperCase().trim() !== coupon.code) {
    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase().trim(),
      _id: { $ne: req.params.id },
    });

    if (existingCoupon) {
      res.status(400);
      throw new Error('Coupon code already exists');
    }
  }

  // Validate dates if provided
  const start = startDate ? new Date(startDate) : coupon.startDate;
  const end = endDate ? new Date(endDate) : coupon.endDate;

  if (end <= start) {
    res.status(400);
    throw new Error('End date must be after start date');
  }

  // Validate discount value if provided
  if (discountType === 'percentage' && discountValue) {
    if (discountValue <= 0 || discountValue > 100) {
      res.status(400);
      throw new Error('Percentage discount must be between 0 and 100');
    }
  }

  // Update fields
  if (code) coupon.code = code.toUpperCase().trim();
  if (description !== undefined) coupon.description = description;
  if (discountType) coupon.discountType = discountType;
  if (discountValue !== undefined) coupon.discountValue = discountValue;
  if (minimumPurchase !== undefined) coupon.minimumPurchase = minimumPurchase;
  if (maximumDiscount !== undefined) coupon.maximumDiscount = maximumDiscount;
  if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
  if (perUserLimit !== undefined) coupon.perUserLimit = perUserLimit;
  if (startDate) coupon.startDate = start;
  if (endDate) coupon.endDate = end;
  if (isActive !== undefined) coupon.isActive = isActive;
  if (applicableProducts !== undefined) coupon.applicableProducts = applicableProducts;
  if (applicableCategories !== undefined) coupon.applicableCategories = applicableCategories;
  if (excludedProducts !== undefined) coupon.excludedProducts = excludedProducts;
  if (applicableToAll !== undefined) coupon.applicableToAll = applicableToAll;
  if (firstTimeUserOnly !== undefined) coupon.firstTimeUserOnly = firstTimeUserOnly;
  if (freeShipping !== undefined) coupon.freeShipping = freeShipping;

  await coupon.save();

  const updatedCoupon = await Coupon.findById(coupon._id)
    .populate('createdBy', 'name email')
    .populate('applicableCategories', 'name');

  res.status(200).json({
    success: true,
    message: 'Coupon updated successfully',
    data: updatedCoupon,
  });
});

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private (Admin)
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }

  await coupon.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Coupon deleted successfully',
  });
});

// @desc    Toggle coupon status
// @route   PATCH /api/coupons/:id/toggle
// @access  Private (Admin)
const toggleCouponStatus = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();

  res.status(200).json({
    success: true,
    message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
    data: coupon,
  });
});

// @desc    Validate coupon code (for customers)
// @route   POST /api/coupons/validate
// @access  Public
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount, customerId, productIds } = req.body;

  if (!code || !orderAmount) {
    res.status(400);
    throw new Error('Coupon code and order amount are required');
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

  if (!coupon) {
    res.status(404);
    throw new Error('Invalid coupon code');
  }

  // Check if coupon can be used
  const canUse = coupon.canBeUsed();
  if (!canUse.valid) {
    res.status(400);
    throw new Error(canUse.message);
  }

  // Check minimum purchase
  if (orderAmount < coupon.minimumPurchase) {
    res.status(400);
    throw new Error(`Minimum purchase of ₹${coupon.minimumPurchase} required`);
  }

  // Calculate discount
  const discountResult = coupon.calculateDiscount(orderAmount);

  if (!discountResult.valid) {
    res.status(400);
    throw new Error(discountResult.message);
  }

  res.status(200).json({
    success: true,
    message: 'Coupon is valid',
    data: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount: discountResult.discount,
      finalAmount: discountResult.finalAmount,
      freeShipping: coupon.freeShipping,
    },
  });
});

// @desc    Get coupon statistics
// @route   GET /api/coupons/stats
// @access  Private (Admin)
const getCouponStats = asyncHandler(async (req, res) => {
  const now = new Date();

  const [total, active, expired, scheduled, mostUsed] = await Promise.all([
    Coupon.countDocuments(),
    Coupon.countDocuments({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }),
    Coupon.countDocuments({ endDate: { $lt: now } }),
    Coupon.countDocuments({ startDate: { $gt: now } }),
    Coupon.find()
      .sort({ usageCount: -1 })
      .limit(5)
      .select('code usageCount discountType discountValue')
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      active,
      expired,
      scheduled,
      inactive: total - active - expired - scheduled,
      mostUsed,
    },
  });
});

// @desc    Get active coupons for website (public)
// @route   GET /api/coupons/active
// @access  Public
const getActiveCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  
  // Find all active coupons that are currently valid
  const coupons = await Coupon.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { usageLimit: null },
      { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
    ]
  })
    .select('code description discountType discountValue minimumPurchase maximumDiscount endDate')
    .sort({ createdAt: -1 })
    .lean();

  // Format coupons for frontend
  const formattedCoupons = coupons.map(coupon => ({
    id: coupon._id.toString(),
    code: coupon.code,
    title: `${coupon.discountType === 'percentage' ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue} Off`}`,
    description: coupon.description || `Get ${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} discount`,
    type: coupon.discountType,
    value: coupon.discountValue,
    minAmount: coupon.minimumPurchase,
    maxDiscount: coupon.maximumDiscount,
    expiryDate: coupon.endDate,
    terms: [
      `Valid on minimum purchase of ₹${coupon.minimumPurchase}`,
      ...(coupon.maximumDiscount ? [`Maximum discount ₹${coupon.maximumDiscount}`] : []),
      `Valid till ${new Date(coupon.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    ]
  }));

  res.status(200).json({
    success: true,
    data: formattedCoupons,
  });
});

// Helper function to determine coupon status
const getCouponStatus = (coupon, now) => {
  if (!coupon.isActive) return 'inactive';
  if (now < new Date(coupon.startDate)) return 'scheduled';
  if (now > new Date(coupon.endDate)) return 'expired';
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return 'limit_reached';
  }
  return 'active';
};

module.exports = {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon,
  getCouponStats,
  getActiveCoupons,
};