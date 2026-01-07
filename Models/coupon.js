const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [20, 'Coupon code must not exceed 20 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description must not exceed 200 characters'],
    },
    discountType: {
      type: String,
      required: [true, 'Discount type is required'],
      enum: {
        values: ['percentage', 'fixed'],
        message: 'Discount type must be either percentage or fixed',
      },
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value must be positive'],
      validate: {
        validator: function (value) {
          if (this.discountType === 'percentage') {
            return value > 0 && value <= 100;
          }
          return value > 0;
        },
        message: 'Percentage discount must be between 0 and 100',
      },
    },
    minimumPurchase: {
      type: Number,
      default: 0,
      min: [0, 'Minimum purchase must be positive'],
    },
    maximumDiscount: {
      type: Number,
      default: null,
      min: [0, 'Maximum discount must be positive'],
    },
    usageLimit: {
      type: Number,
      default: null,
      min: [1, 'Usage limit must be at least 1'],
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative'],
    },
    perUserLimit: {
      type: Number,
      default: null,
      min: [1, 'Per user limit must be at least 1'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'productdetails',
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    excludedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'productdetails',
      },
    ],
    applicableToAll: {
      type: Boolean,
      default: true,
    },
    firstTimeUserOnly: {
      type: Boolean,
      default: false,
    },
    freeShipping: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Virtual for checking if coupon is currently valid
couponSchema.virtual('isValid').get(function () {
  const now = new Date();
  return (
    this.isActive &&
    this.startDate <= now &&
    this.endDate >= now &&
    (this.usageLimit === null || this.usageCount < this.usageLimit)
  );
});

// Method to check if coupon can be used
couponSchema.methods.canBeUsed = function () {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) {
    return { valid: false, message: 'Coupon is not active' };
  }
  
  // Check date range
  if (now < this.startDate) {
    return { valid: false, message: 'Coupon is not yet valid' };
  }
  
  if (now > this.endDate) {
    return { valid: false, message: 'Coupon has expired' };
  }
  
  // Check usage limit
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) {
    return { valid: false, message: 'Coupon usage limit reached' };
  }
  
  return { valid: true, message: 'Coupon is valid' };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function (orderAmount) {
  if (orderAmount < this.minimumPurchase) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum purchase of ₹${this.minimumPurchase} required`,
    };
  }
  
  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;
    
    // Apply maximum discount cap if set
    if (this.maximumDiscount !== null && discount > this.maximumDiscount) {
      discount = this.maximumDiscount;
    }
  } else {
    // Fixed discount
    discount = this.discountValue;
  }
  
  // Discount cannot exceed order amount
  discount = Math.min(discount, orderAmount);
  
  return {
    valid: true,
    discount: Math.round(discount * 100) / 100, // Round to 2 decimal places
    finalAmount: Math.round((orderAmount - discount) * 100) / 100,
    message: 'Coupon applied successfully',
  };
};

// Pre-save middleware to uppercase code
couponSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.toUpperCase().trim();
  }
  next();
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;