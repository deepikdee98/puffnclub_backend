const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "productdetails",
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // Auto-approve for now, can be changed to "pending" for moderation
      index: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
  },
  { 
    timestamps: true,
  }
);

// Compound index to prevent duplicate reviews from same customer for same product
reviewSchema.index({ product: 1, customer: 1 }, { unique: true });

// Index for efficient queries
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);