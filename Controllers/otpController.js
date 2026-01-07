const Customer = require("../Models/customer");
const Otp = require("../Models/otp");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../Utils/gmailSender");
const {
  sendOtpSMS,
  sendOtpWhatsApp,
  sendOtp: sendOtpViaTwilio, // Smart function that chooses SMS or WhatsApp based on env/config
  formatPhoneNumber,
  validateIndianPhoneNumber,
} = require("../Utils/twilioService");

// In-memory OTP storage (in production, use Redis or database)
const otpStorage = new Map();

// Auto-clean expired OTPs every 1 minute
setInterval(() => {
  const now = new Date();
  for (const [sessionId, otpData] of otpStorage.entries()) {
    if (now > otpData.expiresAt) {
      otpStorage.delete(sessionId);
    }
  }
}, 60 * 1000);

// Generate random 6-digit OTP
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateSessionId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

const generateRefreshToken = (id) =>
  jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "90d" }
  );



// @desc    Send OTP to mobile or email
// @route   POST /api/website/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  try {
    const { email, mobile } = req.body;
    console.log("Sending OTP to:", email || mobile);

    // Check if either email or mobile is provided
    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: "Email or mobile number is required",
      });
    }

    let identifier, identifierType;

    // Handle mobile number
    if (mobile) {
      // Validate Indian phone number
      if (!validateIndianPhoneNumber(mobile)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 10-digit mobile number",
        });
      }

      identifier = mobile;
      identifierType = "mobile";
    }
    // Handle email
    else if (email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }

      identifier = email;
      identifierType = "email";
    }

    // Generate OTP and session ID
    const otp = generateOTP();
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    console.log(`Generated OTP for ${identifier}: ${otp}`);

    // Store OTP in DB
    await Otp.create({
      sessionId,
      identifier,
      identifierType,
      otp,
      expiresAt,
      attempts: 0,
      maxAttempts: 3,
    });

    // Send OTP based on type
    if (identifierType === "mobile") {
      // Format phone number with country code
      const formattedPhone = formatPhoneNumber(mobile);
      
      // Determine OTP channel (WhatsApp or SMS)
      // Check if WhatsApp is preferred via environment variable or use SMS as default
      const useWhatsApp = process.env.USE_WHATSAPP_OTP === 'true';
      const channel = useWhatsApp ? 'whatsapp' : 'sms';
      
      // Send OTP via preferred channel (with SMS fallback)
      const result = await sendOtpViaTwilio(formattedPhone, otp, channel);
      
      console.log(`OTP sent to mobile via ${result.channel || channel}: ${mobile}, OTP: ${otp}`);
      
      const channelName = result.channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
      res.status(200).json({
        success: true,
        message: `OTP sent to +91 ${mobile} via ${channelName}`,
        sessionId,
        expiresIn: 300, // 5 minutes in seconds
        channel: result.channel || channel,
      });
    } else {
      // Send OTP via Email
      await sendEmail({
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is ${otp}. It is valid for 5 minutes. Do not share this code with anyone.`,
      });

      console.log(`OTP sent to email: ${email}, OTP: ${otp}`);

      res.status(200).json({
        success: true,
        message: `OTP sent to ${email}`,
        sessionId,
        expiresIn: 300,
      });
    }
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// @desc    Verify OTP and login/register user
// @route   POST /api/website/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { mobile, email, otp, sessionId } = req.body;
    console.log("Verifying OTP for:", mobile || email);
    if ((!mobile && !email) || !otp || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Mobile/email, OTP, and session ID are required",
      });
    }

    // Get OTP data from storage
    console.log("Verifying OTP with SessionID:", sessionId);
    const otpData = await Otp.findOne({ sessionId });
    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired session",
      });
    }
    console.log("otpData:", otpData);

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt) {
      await Otp.deleteOne({ sessionId });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Check identifier matches
    const identifier = mobile || email;
    if (otpData.identifier !== identifier) {
      return res.status(400).json({
        success: false,
        message: `${
          otpData.identifierType === "mobile" ? "Mobile number" : "Email"
        } does not match`,
      });
    }

    // Check attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      await Otp.deleteOne({ sessionId });
      return res.status(400).json({
        success: false,
        message: "Maximum attempts exceeded. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      // Increment attempts
      otpData.attempts += 1;
      await otpData.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP is valid, delete from DB
    await Otp.deleteOne({ sessionId });

    // Check if customer exists
    let customer;
    let isNewUser = false;
    if (mobile) {
      customer = await Customer.findOne({ phone: mobile });
      if (!customer) {
        customer = await Customer.create({
          firstName: "User",
          lastName: "",
          email: `${mobile}@temp.com`,
          phone: mobile,
          password: "otp-user",
          isEmailVerified: false,
        });
        isNewUser = true;
      }
    } else if (email) {
      customer = await Customer.findOne({ email });
      if (!customer) {
        customer = await Customer.create({
          firstName: "User",
          lastName: "",
          email,
          phone: "",
          password: "otp-user",
          isEmailVerified: true,
        });
        isNewUser = true;
      }
    }

    // Update last login
    customer.lastLogin = new Date();
    await customer.save();

    // Generate tokens
    const token = generateToken(customer._id);
    const refreshToken = generateRefreshToken(customer._id);

    res.json({
      success: true,
      message: isNewUser
        ? "Account created and logged in successfully"
        : "Login successful",
      token,
      user: {
        id: customer._id.toString(),
        mobile: customer.phone,
        name: customer.fullName,
        email: customer.email,
        isNewUser,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};

// @desc    Resend OTP
// @route   POST /api/website/auth/resend-otp
// @access  Public
const resendOtp = async (req, res) => {
  try {
    const { mobile, email, sessionId } = req.body;
    if ((!mobile && !email) || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Mobile/email and session ID are required",
      });
    }

    // Get existing OTP data
    const otpData = await Otp.findOne({ sessionId });
    if (!otpData) {
      return res.status(400).json({ success: false, message: "Invalid session" });
    }
    const identifier = mobile || email;
    if (otpData.identifier !== identifier) {
      return res.status(400).json({
        success: false,
        message: `${
          otpData.identifierType === "mobile" ? "Mobile number" : "Email"
        } does not match`,
      });
    }
    const otp = generateOTP();
    const newSessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await Otp.deleteOne({ sessionId });
    await Otp.create({
      sessionId: newSessionId,
      identifier,
      identifierType: otpData.identifierType,
      otp,
      expiresAt,
      attempts: 0,
      maxAttempts: 3,
    });

    // Send OTP
    if (otpData.identifierType === "mobile") {
      // Format phone number with country code
      const formattedPhone = formatPhoneNumber(mobile);
      
      // Determine OTP channel (WhatsApp or SMS)
      const useWhatsApp = process.env.USE_WHATSAPP_OTP === 'true';
      const channel = useWhatsApp ? 'whatsapp' : 'sms';
      
      // Send OTP via preferred channel (with SMS fallback)
      const result = await sendOtpViaTwilio(formattedPhone, otp, channel);
      
      const channelName = result.channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
      console.log(`Resent OTP for ${mobile} via ${result.channel || channel}: ${otp} (Session: ${newSessionId})`);
      
      res.json({
        success: true,
        message: `OTP resent to +91 ${mobile} via ${channelName}`,
        sessionId: newSessionId,
        expiresIn: 300,
        channel: result.channel || channel,
      });
    } else {
      await sendEmail({
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is ${otp}. It is valid for 5 minutes. Do not share this code with anyone.`,
      });
      console.log(`Resent OTP for ${email}: ${otp} (Session: ${newSessionId})`);
      res.json({
        success: true,
        message: `OTP resent to ${email}`,
        sessionId: newSessionId,
        expiresIn: 300,
      });
    }
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to resend OTP" });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
};
