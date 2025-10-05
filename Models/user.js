const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    // Admin-specific fields
    adminProfile: {
      title: { type: String, default: "" }, // e.g., "Store Manager", "Admin"
      department: { type: String, default: "" }, // e.g., "Operations", "Sales"
      avatar: { type: String, default: "" }, // Profile picture URL
      bio: { type: String, default: "" }, // Short bio/description
      permissions: {
        canManageProducts: { type: Boolean, default: true },
        canManageOrders: { type: Boolean, default: true },
        canManageUsers: { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: true },
        canManageSettings: { type: Boolean, default: false },
      },
      lastLogin: { type: Date },
      isActive: { type: Boolean, default: true },
    },
    shippingAddress: {
      name: String,
      doorNumber: String,
      floor: String,
      building: String,
      area: String,
      address: String,
      landmark: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    billingAddress: {
      name: String,
      doorNumber: String,
      floor: String,
      building: String,
      area: String,
      address: String,
      landmark: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
