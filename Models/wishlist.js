const mongoose = require("mongoose");

const wishlistItemSchema = mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "productdetails",
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const wishlistSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },
    items: [wishlistItemSchema],
    totalItems: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals before saving
wishlistSchema.pre("save", function (next) {
  this.totalItems = this.items.length;
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model("Wishlist", wishlistSchema);