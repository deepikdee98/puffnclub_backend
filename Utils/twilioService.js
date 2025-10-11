const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;

const initializeTwilio = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured. SMS sending will be disabled.');
    return null;
  }
  
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('Twilio client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error.message);
    return null;
  }
};

/**
 * Send SMS using Twilio
 * @param {string} to - Phone number with country code (e.g., +919876543210)
 * @param {string} message - Message to send
 * @returns {Promise<object>} - Twilio response
 */
const sendSMS = async (to, message) => {
  try {
    // Initialize client if not already done
    if (!twilioClient) {
      twilioClient = initializeTwilio();
    }
    
    // If Twilio is not configured, log to console (for development)
    if (!twilioClient) {
      console.log('='.repeat(50));
      console.log('SMS WOULD BE SENT (Twilio not configured):');
      console.log(`To: ${to}`);
      console.log(`Message: ${message}`);
      console.log('='.repeat(50));
      return {
        success: true,
        message: 'SMS logged to console (Twilio not configured)',
        sid: 'dev-mode-' + Date.now(),
      };
    }
    
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }
    
    // Send SMS via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });
    
    console.log(`SMS sent successfully to ${to}. SID: ${result.sid}`);
    
    return {
      success: true,
      message: 'SMS sent successfully',
      sid: result.sid,
      status: result.status,
    };
  } catch (error) {
    console.error('Failed to send SMS:', error.message);
    
    // In development, log OTP to console instead of failing
    if (process.env.NODE_ENV === 'development') {
      console.log('='.repeat(50));
      console.log('⚠️  SMS FAILED - DEVELOPMENT MODE');
      console.log(`📱 To: ${to}`);
      console.log(`📨 Message: ${message}`);
      console.log('💡 OTP is logged above for testing');
      console.log('='.repeat(50));
      
      // Return success in development mode
      return {
        success: true,
        message: 'SMS logged to console (development mode)',
        sid: 'dev-mode-' + Date.now(),
        error: error.message,
      };
    }
    
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

/**
 * Send OTP via SMS
 * @param {string} phoneNumber - Phone number with country code
 * @param {string} otp - OTP code
 * @returns {Promise<object>}
 */
const sendOtpSMS = async (phoneNumber, otp) => {
  const message = `Your OTP code is ${otp}. It is valid for 5 minutes. Do not share this code with anyone.`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Format phone number to E.164 format (+919876543210)
 * @param {string} phoneNumber - Phone number (10 digits for India)
 * @param {string} countryCode - Country code (default: +91 for India)
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phoneNumber, countryCode = '+91') => {
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If already has country code, return as is
  if (cleaned.length > 10) {
    return '+' + cleaned;
  }
  
  // Add country code
  return countryCode + cleaned;
};

/**
 * Validate Indian phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean}
 */
const validateIndianPhoneNumber = (phoneNumber) => {
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Indian mobile numbers are 10 digits and start with 6-9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  
  return indianMobileRegex.test(cleaned);
};

module.exports = {
  initializeTwilio,
  sendSMS,
  sendOtpSMS,
  formatPhoneNumber,
  validateIndianPhoneNumber,
};