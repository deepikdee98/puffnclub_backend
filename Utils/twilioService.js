/**
 * SMS/OTP Service using 2Factor.in API
 * This service handles OTP sending via SMS and WhatsApp using 2Factor.in
 * Documentation: https://2factor.in/
 */

const axios = require('axios');

/**
 * Format phone number for 2Factor.in API (removes + and keeps only digits)
 * 2Factor.in expects phone number in format: 919876543210 (country code + number, no +)
 * @param {string} phoneNumber - Phone number with country code (e.g., +919876543210)
 * @returns {string} - Formatted phone number (e.g., 919876543210)
 */
const formatPhoneFor2Factor = (phoneNumber) => {
  // Remove all non-digit characters
  return phoneNumber.replace(/\D/g, '');
};

/**
 * Send OTP via SMS using 2Factor.in API
 * @param {string} phoneNumber - Phone number with country code (e.g., +919876543210)
 * @param {string} otp - OTP code to send
 * @returns {Promise<object>} - Response object
 */
const sendOtpSMS = async (phoneNumber, otp) => {
  try {
    const apiKey = process.env.TWOFACTOR_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  TWOFACTOR_API_KEY not configured. SMS will be logged to console.');
      console.log('='.repeat(50));
      console.log('📱 SMS WOULD BE SENT (2Factor.in not configured):');
      console.log(`To: ${phoneNumber}`);
      console.log(`OTP: ${otp}`);
      console.log('='.repeat(50));
      
      return {
        success: true,
        message: 'SMS logged to console (2Factor.in not configured)',
        sid: 'dev-mode-' + Date.now(),
      };
    }
    
    // Format phone number for 2Factor.in (remove + and keep only digits)
    // 2Factor.in expects: 919876543210 (country code + number, no +)
    const formattedPhone = formatPhoneFor2Factor(phoneNumber);
    
    // 2Factor.in API endpoint for sending custom OTP
    // Format: https://2factor.in/API/V1/{API_KEY}/SMS/{PHONE}/{OTP}
    // This sends the OTP directly in the SMS message
    const apiUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${formattedPhone}/${otp}`;
    
    console.log(`Sending OTP via 2Factor.in to ${formattedPhone}...`);
    
    const response = await axios.get(apiUrl);
    
    if (response.data && response.data.Status === 'Success') {
      console.log(`✅ OTP sent successfully via 2Factor.in to ${formattedPhone}`);
    return {
      success: true,
        message: 'OTP sent successfully',
        sid: response.data.Details || '2factor-' + Date.now(),
        status: response.data.Status,
    };
    } else {
      console.error('❌ 2Factor.in API error:', response.data);
      throw new Error(response.data.Details || 'Failed to send OTP via 2Factor.in');
    }
  } catch (error) {
    console.error('❌ Failed to send OTP via 2Factor.in:', error.message);
    
    // In development, log OTP to console instead of failing
    if (process.env.NODE_ENV === 'development') {
      console.log('='.repeat(50));
      console.log('⚠️  SMS FAILED - DEVELOPMENT MODE');
      console.log(`📱 To: ${phoneNumber}`);
      console.log(`🔑 OTP: ${otp}`);
      console.log('💡 OTP is logged above for testing');
      console.log('='.repeat(50));
      
      return {
        success: true,
        message: 'SMS logged to console (development mode)',
        sid: 'dev-mode-' + Date.now(),
        error: error.message,
      };
    }
    
    throw new Error(`Failed to send OTP via 2Factor.in: ${error.message}`);
  }
};

/**
 * Send OTP via WhatsApp using 2Factor.in API
 * 2Factor.in WhatsApp API: https://2factor.in/API/V1/{API_KEY}/ADDON_SERVICES/SEND/TSMS/{PHONE}/{OTP}
 * @param {string} phoneNumber - Phone number with country code (e.g., +919876543210)
 * @param {string} otp - OTP code to send
 * @returns {Promise<object>} - Response object
 */
const sendOtpWhatsApp = async (phoneNumber, otp) => {
  try {
    const apiKey = process.env.TWOFACTOR_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  TWOFACTOR_API_KEY not configured. WhatsApp OTP will be logged to console.');
      console.log('='.repeat(50));
      console.log('📱 WHATSAPP OTP WOULD BE SENT (2Factor.in not configured):');
      console.log(`To: ${phoneNumber}`);
      console.log(`OTP: ${otp}`);
      console.log('='.repeat(50));
      
      return {
        success: true,
        message: 'WhatsApp OTP logged to console (2Factor.in not configured)',
        sid: 'dev-mode-whatsapp-' + Date.now(),
        channel: 'whatsapp',
      };
    }
    
    // Format phone number for 2Factor.in (remove + and keep only digits)
    const formattedPhone = formatPhoneFor2Factor(phoneNumber);
    
    // 2Factor.in WhatsApp API endpoint for sending OTP
    // Format: https://2factor.in/API/V1/{API_KEY}/ADDON_SERVICES/SEND/TSMS/{PHONE}/{OTP}
    const apiUrl = `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS/${formattedPhone}/${otp}`;
    
    console.log(`Sending OTP via WhatsApp (2Factor.in) to ${formattedPhone}...`);
    
    const response = await axios.get(apiUrl);
    
    if (response.data && response.data.Status === 'Success') {
      console.log(`✅ OTP sent successfully via WhatsApp (2Factor.in) to ${formattedPhone}`);
      return {
        success: true,
        message: 'OTP sent successfully via WhatsApp',
        sid: response.data.Details || '2factor-whatsapp-' + Date.now(),
        status: response.data.Status,
        channel: 'whatsapp',
      };
    } else {
      console.error('❌ 2Factor.in WhatsApp API error:', response.data);
      throw new Error(response.data.Details || 'Failed to send OTP via WhatsApp (2Factor.in)');
    }
  } catch (error) {
    console.error('❌ Failed to send OTP via WhatsApp (2Factor.in):', error.message);
    
    // In development, log OTP to console instead of failing
    if (process.env.NODE_ENV === 'development') {
      console.log('='.repeat(50));
      console.log('⚠️  WHATSAPP OTP FAILED - DEVELOPMENT MODE');
      console.log(`📱 To: ${phoneNumber}`);
      console.log(`🔑 OTP: ${otp}`);
      console.log('💡 OTP is logged above for testing');
      console.log('='.repeat(50));
      
      return {
        success: true,
        message: 'WhatsApp OTP logged to console (development mode)',
        sid: 'dev-mode-whatsapp-' + Date.now(),
        channel: 'whatsapp',
        error: error.message,
      };
    }
    
    throw new Error(`Failed to send OTP via WhatsApp (2Factor.in): ${error.message}`);
  }
};

/**
 * Send OTP via preferred channel (SMS or WhatsApp)
 * Uses environment variable USE_WHATSAPP_OTP to determine channel
 * @param {string} phoneNumber - Phone number with country code (e.g., +919876543210)
 * @param {string} otp - OTP code to send
 * @param {string} preferredChannel - 'sms' or 'whatsapp' (default: from env or 'sms')
 * @returns {Promise<object>} - Response object
 */
const sendOtp = async (phoneNumber, otp, preferredChannel = null) => {
  // Determine channel: prefer parameter > env variable > default to SMS
  const channel = preferredChannel || (process.env.USE_WHATSAPP_OTP === 'true' ? 'whatsapp' : 'sms');
  
  if (channel === 'whatsapp') {
    try {
      return await sendOtpWhatsApp(phoneNumber, otp);
    } catch (error) {
      // Fallback to SMS if WhatsApp fails
      console.warn('⚠️  WhatsApp OTP failed, falling back to SMS:', error.message);
      return await sendOtpSMS(phoneNumber, otp);
    }
  } else {
    return await sendOtpSMS(phoneNumber, otp);
  }
};

/**
 * Send SMS (generic function - currently uses sendOtpSMS)
 * @param {string} to - Phone number with country code (e.g., +919876543210)
 * @param {string} message - Message to send
 * @returns {Promise<object>} - Response object
 */
const sendSMS = async (to, message) => {
  // Extract OTP from message if it's an OTP message
  const otpMatch = message.match(/(\d{6})/);
  if (otpMatch) {
    return await sendOtpSMS(to, otpMatch[1]);
  }
  
  // For non-OTP messages, log to console
  console.log('='.repeat(50));
  console.log('📱 SMS WOULD BE SENT:');
  console.log(`To: ${to}`);
  console.log(`Message: ${message}`);
  console.log('='.repeat(50));
  
  return {
    success: true,
    message: 'SMS logged to console',
    sid: 'dev-mode-' + Date.now(),
  };
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
  sendSMS,
  sendOtpSMS,
  sendOtpWhatsApp,
  sendOtp, // Smart function that chooses SMS or WhatsApp
  formatPhoneNumber,
  validateIndianPhoneNumber,
};
