const mongoose = require("mongoose");

const exchangeReturnSchema = mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerOrder",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "productdetails",
      required: true,
    },
    orderItem: {
      // Reference to the specific item in the order
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "productdetails",
        required: true,
      },
      productName: String,
      quantity: Number,
      size: String,
      color: String,
      price: Number,
    },
    type: {
      type: String,
      enum: ["exchange", "return"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "processing", "completed", "cancelled"],
      default: "pending",
    },
    // Exchange specific fields
    exchangeDetails: {
      requestedSize: String,
      requestedColor: String,
      reason: String,
    },
    // Return specific fields
    returnDetails: {
      reason: String,
      refundMethod: {
        type: String,
        enum: ["original_payment", "store_credit", "wallet"],
        default: "original_payment",
      },
    },
    // Common fields
    reason: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Admin response
    adminResponse: {
      type: String,
      trim: true,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    // Tracking
    pickupScheduled: {
      type: Boolean,
      default: false,
    },
    pickupDate: {
      type: Date,
    },
    pickupAddress: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    // For exchange - new order created
    exchangeOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerOrder",
    },
    // For return - refund details
    refundAmount: {
      type: Number,
    },
    refundStatus: {
      type: String,
      enum: ["pending", "processed", "completed", "failed"],
    },
    refundTransactionId: {
      type: String,
    },
    // Shiprocket integration
    returnShipmentId: {
      type: String,
    },
    returnAwbCode: {
      type: String,
    },
    // Timestamps
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Generate request number before saving
exchangeReturnSchema.pre("save", function (next) {
  if (!this.requestNumber) {
    const prefix = this.type === "exchange" ? "EX" : "RT";
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    this.requestNumber = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

// Indexes for efficient queries
exchangeReturnSchema.index({ order: 1, customer: 1 });
exchangeReturnSchema.index({ customer: 1, status: 1 });
exchangeReturnSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ExchangeReturn", exchangeReturnSchema);


