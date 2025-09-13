const jwt = require("jsonwebtoken");
const Customer = require("../Models/customer");
const Otp = require("../Models/otp");
const { sendEmail } = require("../Utils/gmailSender");
const otpStorage = new Map();

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

module.exports = {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  logoutCustomer,
  refreshToken,
};