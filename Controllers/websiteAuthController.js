const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Customer = require("../Models/customer");
const Otp = require("../Models/otp");
const { sendEmail } = require("../Utils/gmailSender");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: "90d",
  });
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateSessionId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);




// @desc    Register new customer
// @route   POST /api/website/auth/register
// @access  Public
const registerCustomer = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "Please provide first name, last name, email, and password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    // Check if customer already exists
    const customerExists = await Customer.findOne({ email });
    if (customerExists) {
      return res.status(400).json({ error: "Customer already exists with this email" });
    }

    // Create customer
    const customer = await Customer.create({
      firstName,
      lastName,
      email,
      password,
      phone,
    });

    if (customer) {
      // Generate OTP and session ID
      const otp = generateOTP();
      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in DB
      await Otp.create({
        sessionId,
        identifier: email,
        identifierType: "email",
        otp,
        expiresAt,
        attempts: 0,
        maxAttempts: 3,
      });

      // Send OTP via Gmail API (no SMTP)
      await sendEmail({
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
      });

      res.status(201).json({
        message: "Customer registered successfully. OTP sent.",
        sessionId,
        email,
      });
    } else {
      res.status(400).json({ error: "Invalid customer data" });
    }
  } catch (error) {
    console.error("Register customer error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Login customer
// @route   POST /api/website/auth/login
// @access  Public
const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password" });
    }

    // Check for customer
    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!customer.isActive) {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    // Check password
    const isPasswordValid = await customer.matchPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(customer._id);
    const refreshToken = generateRefreshToken(customer._id);

    // Update last login and refresh token
    customer.lastLogin = new Date();
    customer.refreshToken = refreshToken;
    await customer.save();

    res.json({
      message: "Login successful",
      customer: {
        _id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        fullName: customer.fullName,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        addresses: customer.addresses || [],
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Login customer error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get customer profile
// @route   GET /api/website/auth/profile
// @access  Private
const getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id).select("-password -refreshToken");

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({ customer });
  } catch (error) {
    console.error("Get customer profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Update customer profile
// @route   PUT /api/website/auth/profile
// @access  Private
const updateCustomerProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      addresses,
    } = req.body;

    const customer = await Customer.findById(req.customer.id);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Update fields
    if (firstName) customer.firstName = firstName;
    if (lastName) customer.lastName = lastName;
    if (phone) customer.phone = phone;
    if (dateOfBirth) customer.dateOfBirth = dateOfBirth;
    if (gender) customer.gender = gender;
    if (addresses) customer.addresses = addresses;

    const updatedCustomer = await customer.save();

    res.json({
      message: "Profile updated successfully",
      customer: {
        _id: updatedCustomer._id,
        firstName: updatedCustomer.firstName,
        lastName: updatedCustomer.lastName,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        dateOfBirth: updatedCustomer.dateOfBirth,
        gender: updatedCustomer.gender,
        addresses: updatedCustomer.addresses || [],
        fullName: updatedCustomer.fullName,
        isActive: updatedCustomer.isActive,
        createdAt: updatedCustomer.createdAt,
        updatedAt: updatedCustomer.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update customer profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Logout customer
// @route   POST /api/website/auth/logout
// @access  Private
const logoutCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id);

    if (customer) {
      customer.refreshToken = null;
      await customer.save();
    }

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout customer error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Refresh access token
// @route   POST /api/website/auth/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token is required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Find customer with this refresh token
    const customer = await Customer.findOne({
      _id: decoded.id,
      refreshToken: refreshToken,
    });

    if (!customer) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    if (!customer.isActive) {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    // Generate new tokens
    const newToken = generateToken(customer._id);
    const newRefreshToken = generateRefreshToken(customer._id);

    // Update refresh token
    customer.refreshToken = newRefreshToken;
    await customer.save();

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ error: "Invalid refresh token" });
  }
};

// @desc    Forgot password - Send reset token via email
// @route   POST /api/website/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ error: "Please provide email address" });
    }

    // Check if customer exists
    const customer = await Customer.findOne({ email });

    if (!customer) {
      // Don't reveal if email exists or not for security
      return res.json({
        message: "If an account exists with this email, you will receive a password reset link shortly.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Hash token before saving to database
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save hashed token and expiry to customer
    customer.resetPasswordToken = hashedToken;
    customer.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await customer.save();

    // Create reset URL (frontend URL)
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/website/auth/reset-password?token=${resetToken}`;

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .warning { background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${customer.firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>The Support Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      Password Reset Request
      
      Hi ${customer.firstName},
      
      We received a request to reset your password. Click the link below to create a new password:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this, please ignore this email. Your password won't change until you create a new one.
      
      Best regards,
      The Support Team
    `;

    // Send email
    await sendEmail({
      to: customer.email,
      subject: "Password Reset Request",
      text: emailText,
      html: emailHtml,
    });

    console.log(`[forgotPassword] Reset email sent to: ${customer.email}`);

    res.json({
      message: "If an account exists with this email, you will receive a password reset link shortly.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Error sending password reset email. Please try again later." });
  }
};

// @desc    Reset password using token
// @route   POST /api/website/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // Validation
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: "Please provide token, password, and confirm password" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Hash the token from URL to compare with database
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find customer with valid token
    const customer = await Customer.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Token not expired
    });

    if (!customer) {
      return res.status(400).json({ error: "Invalid or expired reset token. Please request a new password reset." });
    }

    // Update password and clear reset token fields
    // Note: Password will be automatically hashed by the pre-save hook in Customer model
    customer.password = password;
    customer.resetPasswordToken = null;
    customer.resetPasswordExpires = null;
    await customer.save();

    console.log(`[resetPassword] Password reset successful for: ${customer.email}`);

    // Send confirmation email
    const confirmationEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .success { background-color: #D1FAE5; padding: 15px; border-left: 4px solid #10B981; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Password Reset Successful</h1>
          </div>
          <div class="content">
            <p>Hi ${customer.firstName},</p>
            <div class="success">
              <strong>Your password has been successfully reset!</strong>
            </div>
            <p>You can now log in to your account using your new password.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <p>Best regards,<br>The Support Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: customer.email,
        subject: "Password Reset Successful",
        text: `Hi ${customer.firstName},\n\nYour password has been successfully reset. You can now log in with your new password.\n\nIf you didn't make this change, please contact support immediately.\n\nBest regards,\nThe Support Team`,
        html: confirmationEmailHtml,
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      // Don't fail the request if confirmation email fails
    }

    res.json({
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Error resetting password. Please try again later." });
  }
};

module.exports = {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  logoutCustomer,
  refreshToken,
  forgotPassword,
  resetPassword,
};