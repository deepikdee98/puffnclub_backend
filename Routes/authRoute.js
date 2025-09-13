const express = require("express");
const {
  loginAdmin,
  createAdmin,
  promoteUserToAdmin,
  demoteAdminToUser,
  getStoreSettings,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAllAdmins,
  updateStoreSettings,
  getFullStoreSettings,
} = require("../Controllers/authController");
const {
  adminValidation,
  verifySuperAdmin,
} = require("../Middleware/authMiddleware");
const router = express.Router();

// Public routes (no authentication required)
router.get("/store-settings", getStoreSettings); // For login page

// Bootstrap route to create first admin (temporary)
router.post("/bootstrap", async (req, res) => {
  try {
    const User = require("../Models/user");
    const bcrypt = require("bcrypt");
    
    // Check if any admin exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }
    
    // Create default admin
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: hashedPassword,
      phone: "1234567890",
      role: "admin",
      isSuperAdmin: true
    });
    
    res.status(201).json({ 
      message: "Bootstrap admin created successfully",
      email: "admin@example.com",
      password: "admin123"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Temporary route to list admin users (for debugging)
router.get("/list-admins", async (req, res) => {
  try {
    const User = require("../Models/user");
    const admins = await User.find({ role: "admin" }).select("name email role isSuperAdmin");
    res.json({ admins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Temporary route to reset admin password (for debugging)
router.post("/reset-admin-password", async (req, res) => {
  try {
    const User = require("../Models/user");
    const bcrypt = require("bcrypt");
    
    const admin = await User.findOne({ email: "admin@puffnclub.com", role: "admin" });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    // Reset password to "admin123"
    const hashedPassword = await bcrypt.hash("admin123", 10);
    admin.password = hashedPassword;
    await admin.save();
    
    res.json({ 
      message: "Admin password reset successfully",
      email: "admin@puffnclub.com",
      password: "admin123"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Authentication routes
router.post("/login", loginAdmin);

// Admin routes (require admin authentication)
router.use(adminValidation); // Apply admin authentication to all routes below

// Admin profile management
router.get("/profile", getAdminProfile);
router.put("/profile", updateAdminProfile);
router.put("/change-password", changeAdminPassword);

// Admin management
router.post("/create", createAdmin);
router.post("/promote", promoteUserToAdmin);

// Store settings (admin can view, super admin can edit)
router.get("/settings", getFullStoreSettings);

// Super Admin only routes
router.get("/admins", verifySuperAdmin, getAllAdmins);
router.put("/settings", verifySuperAdmin, updateStoreSettings);
router.post("/demote", verifySuperAdmin, demoteAdminToUser);

module.exports = router;
