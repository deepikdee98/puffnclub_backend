const mongoose = require("mongoose");

const storeSettingsSchema = new mongoose.Schema(
  {
    // Store Basic Information
    storeName: {
      type: String,
      required: true,
      default: "E-commerce Admin Panel",
    },
    storeDescription: {
      type: String,
      default:
        "Comprehensive management system for your online store. Manage products, orders, customers, and analytics all in one place.",
    },
    storeTagline: {
      type: String,
      default: "Your Business, Simplified",
    },

    // Branding
    logo: {
      type: String,
      default: "", // URL to logo image
    },
    favicon: {
      type: String,
      default: "", // URL to favicon
    },
    primaryColor: {
      type: String,
      default: "#667eea", // Main brand color
    },
    secondaryColor: {
      type: String,
      default: "#764ba2", // Secondary brand color
    },

    // Contact Information
    contactInfo: {
      email: {
        type: String,
        default: "admin@store.com",
      },
      phone: {
        type: String,
        default: "+1 (555) 123-4567",
      },
      address: {
        street: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        zipCode: { type: String, default: "" },
        country: { type: String, default: "" },
      },
      website: {
        type: String,
        default: "https://yourstore.com",
      },
    },

    // Business Information
    businessInfo: {
      registrationNumber: { type: String, default: "" },
      taxId: { type: String, default: "" },
      businessType: {
        type: String,
        enum: ["retail", "wholesale", "marketplace", "service", "other"],
        default: "retail",
      },
      industry: { type: String, default: "" },
      foundedYear: { type: Number },
      employeeCount: {
        type: String,
        enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
        default: "1-10",
      },
    },

    // Feature Cards for Login Page
    featureCards: [
      {
        title: {
          type: String,
          default: "Dashboard Analytics",
        },
        description: {
          type: String,
          default: "Real-time insights into your business performance.",
        },
        icon: {
          type: String,
          default: "FiTrendingUp",
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
      {
        title: {
          type: String,
          default: "Product Management",
        },
        description: {
          type: String,
          default: "Complete product catalog management.",
        },
        icon: {
          type: String,
          default: "FiShoppingBag",
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
      {
        title: {
          type: String,
          default: "Order Processing",
        },
        description: {
          type: String,
          default: "Streamlined order management system.",
        },
        icon: {
          type: String,
          default: "FiSettings",
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
      {
        title: {
          type: String,
          default: "Easy Navigation",
        },
        description: {
          type: String,
          default: "Intuitive interface for efficient workflow.",
        },
        icon: {
          type: String,
          default: "FiArrowRight",
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // System Settings
    systemSettings: {
      timezone: {
        type: String,
        default: "UTC",
      },
      currency: {
        code: { type: String, default: "USD" },
        symbol: { type: String, default: "$" },
        position: {
          type: String,
          enum: ["before", "after"],
          default: "before",
        },
      },
      dateFormat: {
        type: String,
        enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
        default: "MM/DD/YYYY",
      },
      language: {
        type: String,
        default: "en",
      },
    },

    // Security Settings
    securitySettings: {
      requireTwoFactor: {
        type: Boolean,
        default: false,
      },
      sessionTimeout: {
        type: Number,
        default: 24, // hours
      },
      passwordPolicy: {
        minLength: { type: Number, default: 6 },
        requireUppercase: { type: Boolean, default: false },
        requireNumbers: { type: Boolean, default: false },
        requireSpecialChars: { type: Boolean, default: false },
      },
    },

    // Metadata
    isSetupComplete: {
      type: Boolean,
      default: false,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    // Ensure only one settings document exists
    collection: "storeSettings",
  }
);

// Static method to get or create settings
storeSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Static method to update settings
storeSettingsSchema.statics.updateSettings = async function (
  updates,
  updatedBy
) {
  const settings = await this.getSettings();
  Object.assign(settings, updates);
  settings.lastUpdatedBy = updatedBy;
  return await settings.save();
};

module.exports = mongoose.model("StoreSettings", storeSettingsSchema);
