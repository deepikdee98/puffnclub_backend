const mongoose = require("mongoose");

// Size stock schema for individual size inventory tracking
const sizeStockSchema = new mongoose.Schema({
  size: {
    type: String,
    required: false, // Conditionally required based on product status (validated in controller)
  },
  stock: {
    type: Number,
    required: false, // Conditionally required based on product status (validated in controller)
    min: 0,
    default: 0,
  },
  available: {
    type: Boolean,
    required: false, // Conditionally required based on product status (validated in controller)
    default: false,
  }
}, { _id: false });

// Variant schema for product variants
const variantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: false, // Conditionally required based on product status (validated in controller)
  },
  sizeStocks: {
    type: [sizeStockSchema],
    required: false, // Conditionally required based on product status (validated in controller)
    validate: {
      validator: function(v) {
        // Validation handled in controller based on product status
        return true;
      },
      message: 'At least one size must be specified when product status is active'
    }
  },
  totalStock: {
    type: Number,
    required: false, // Conditionally required based on product status (validated in controller)
    min: 0,
    default: 0,
  },
  images: {
    type: [String],
    required: false, // Conditionally required based on product status (validated in controller)
    validate: {
      validator: function(v) {
        // Validation handled in controller based on product status
        return true;
      },
      message: 'At least one image must be specified when product status is active'
    }
  },
  
  // Legacy fields for backward compatibility (optional)
  stock: {
    type: Number,
    min: 0,
  },
  sizes: {
    type: [String],
  }
}, { _id: true });

const productDetailsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false, // Conditionally required based on status (validated in controller)
  },
  sku: {
    type: String,
    required: false, // Conditionally required based on status (validated in controller)
    unique: true,
    sparse: true, // Allow multiple null/undefined values
  },
  description: {
    type: String,
    required: false, // Conditionally required based on status (validated in controller)
  },
  category: {
    type: String,
    required: false, // Conditionally required based on status (validated in controller)
  },
  brand: {
    type: String,
    required: false, // Conditionally required based on status (validated in controller)
  },
  price: {
    type: Number,
    // Keep for backward compatibility
  },
  comparePrice: {
    type: Number,
    // Keep for backward compatibility
  },
  customerPrice: {
    type: Number,
    required: false, // Conditionally required based on status (validated in controller)
  },
  vendorPrice: {
    type: Number,
    required: false, // Conditionally required based on status (validated in controller)
  },
  originalPrice: {
    type: Number,
    required: false, // Conditionally required based on status (validated in controller)
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
    required: false, // Conditionally required based on status (validated in controller)
    validate: {
      validator: function(v) {
        // Only validate if status is active
        if (this.status === 'active') {
          return v && v.length > 0;
        }
        return true; // Allow empty for draft/inactive
      },
      message: 'At least one variant must be specified when status is active'
    }
  },
  metaTitle: {
    type: String,
  },
  metaDescription: {
    type: String,
  },
  
  // Size chart fields
  sizeChartImage: {
    type: String,
  },
  sizeChartMeasurements: [{
    size: {
      type: String,
      required: true,
    },
    length: {
      type: Number,
      required: true,
    },
    chest: {
      type: Number,
      required: true,
    },
    sleeve: {
      type: Number,
      required: true,
    }
  }],
  sizeChartUnit: {
    type: String,
    enum: ["inches", "cm"],
    default: "inches",
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
