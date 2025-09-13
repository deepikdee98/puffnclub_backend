const asyncHandler = require("express-async-handler");
const User = require("../Models/user");
const StoreSettings = require("../Models/storeSettings");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Admin Login
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("All fields are mandatory");
  }

  const admin = await User.findOne({ email, role: "admin" });
  if (!admin) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  const Password = await bcrypt.compare(password, admin.password);
  if (!Password) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  // Update last login time
  admin.adminProfile = admin.adminProfile || {};
  admin.adminProfile.lastLogin = new Date();
  await admin.save();

  const accessToken = jwt.sign(
    {
      userId: admin._id,
      name: admin.name,
      email: admin.email,
      role: "admin",
      isSuperAdmin: admin.isSuperAdmin,
      adminProfile: admin.adminProfile,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "24h" }
  );

  res.status(200).json({
    accessToken,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isSuperAdmin: admin.isSuperAdmin,
      adminProfile: admin.adminProfile,
    },
  });
});

const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email,
    password: hashedPassword,
    phone,
    role: "admin",
  });
  return res.status(200).json({ message: "New admin created successfully" });
});

const promoteUserToAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const user = await User.findOne({ _id: userId });
  {
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ message: "User is already an admin" });
    }
    user.role = "admin";
    await user.save();
    return res
      .status(200)
      .json({ message: "User promoted to admin successfully" });
  }
});

const demoteAdminToUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  const user = await User.findOne({ _id: userId });
  {
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(400).json({ message: "User is not an admin" });
    }
    if (user.isSuperAdmin) {
      return res.status(403).json({ message: "Cannot demote the Super Admin" });
    }
    user.role = "user";
    await user.save();

    return res
      .status(200)
      .json({ message: "Admin demoted to user successfully" });
  }
});

// Get Store Settings for Login Page
const getStoreSettings = asyncHandler(async (req, res) => {
  try {
    const settings = await StoreSettings.getSettings();

    // Return only public information for login page
    res.status(200).json({
      storeName: settings.storeName,
      storeDescription: settings.storeDescription,
      storeTagline: settings.storeTagline,
      logo: settings.logo,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      featureCards: settings.featureCards.filter((card) => card.isActive),
      contactInfo: {
        email: settings.contactInfo.email,
        phone: settings.contactInfo.phone,
        website: settings.contactInfo.website,
      },
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to fetch store settings");
  }
});

// Get Admin Profile
const getAdminProfile = asyncHandler(async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId).select("-password");
    if (!admin || admin.role !== "admin") {
      res.status(404);
      throw new Error("Admin not found");
    }

    res.status(200).json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      isSuperAdmin: admin.isSuperAdmin,
      adminProfile: admin.adminProfile,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to fetch admin profile");
  }
});

// Update Admin Profile
const updateAdminProfile = asyncHandler(async (req, res) => {
  try {
    const { name, phone, adminProfile } = req.body;

    const admin = await User.findById(req.user.userId);
    if (!admin || admin.role !== "admin") {
      res.status(404);
      throw new Error("Admin not found");
    }

    // Update basic info
    if (name) admin.name = name;
    if (phone) admin.phone = phone;

    // Update admin profile
    if (adminProfile) {
      admin.adminProfile = {
        ...admin.adminProfile,
        ...adminProfile,
      };
    }

    await admin.save();

    res.status(200).json({
      message: "Profile updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        isSuperAdmin: admin.isSuperAdmin,
        adminProfile: admin.adminProfile,
      },
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to update admin profile");
  }
});

// Change Admin Password
const changeAdminPassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error("Current password and new password are required");
    }

    const admin = await User.findById(req.user.userId);
    if (!admin || admin.role !== "admin") {
      res.status(404);
      throw new Error("Admin not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password
    );
    if (!isCurrentPasswordValid) {
      res.status(400);
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedNewPassword;
    await admin.save();

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to change password");
  }
});

// Get All Admins (Super Admin only)
const getAllAdmins = asyncHandler(async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      res.status(403);
      throw new Error("Access denied. Super Admin only.");
    }

    const admins = await User.find({ role: "admin" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      admins,
      total: admins.length,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to fetch admins");
  }
});

// Update Store Settings (Super Admin only)
const updateStoreSettings = asyncHandler(async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      res.status(403);
      throw new Error("Access denied. Super Admin only.");
    }

    const settings = await StoreSettings.updateSettings(
      req.body,
      req.user.userId
    );

    res.status(200).json({
      message: "Store settings updated successfully",
      settings,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to update store settings");
  }
});

// Get Full Store Settings (Admin only)
const getFullStoreSettings = asyncHandler(async (req, res) => {
  try {
    const settings = await StoreSettings.getSettings();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500);
    throw new Error("Failed to fetch store settings");
  }
});

module.exports = {
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
};
