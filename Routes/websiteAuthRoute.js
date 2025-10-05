const express = require("express");
const {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  logoutCustomer,
  refreshToken,
  forgotPassword,
  resetPassword,
} = require("../Controllers/websiteAuthController");
const {
  sendOtp,
  verifyOtp,
  resendOtp,
} = require("../Controllers/otpController");
const { customerValidation } = require("../Middleware/websiteAuthMiddleware");

const router = express.Router();

// Public routes
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.post("/refresh-token", refreshToken);

// Password reset routes (public)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// OTP routes (public)
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

// Protected routes (require customer authentication)
router.use(customerValidation);
router.get("/profile", getCustomerProfile);
router.put("/profile", updateCustomerProfile);
router.post("/logout", logoutCustomer);

module.exports = router;