const mongoose = require("mongoose");

// Variant schema for product variants
const variantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
  },
  sizes: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one size must be specified'
    }
  },
  images: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one image must be specified'
    }
  }
}, { _id: true });

const productDetailsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  comparePrice: {
    type: Number,
  },
  status: {
    type: String,
    enum: ["draft", "active", "inactive"],
    default: "draft",
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  tags: {
    type: [String],
    default: [],
  },
  variants: {
    type: [variantSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one variant must be specified'
    }
  },
  metaTitle: {
    type: String,
  },
  metaDescription: {
    type: String,
  },
  
  // Legacy fields for backward compatibility (optional)
  color: {
    type: String,
  },
  stockQuantity: {
    type: Number,
  },
  availableSizes: {
    type: [String],
    default: [],
  },
  images: {
    type: [String],
    default: [],
  },
}, { timestamps: true });
module.exports = mongoose.model("productdetails", productDetailsSchema);
