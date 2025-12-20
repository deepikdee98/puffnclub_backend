const crypto = require('crypto');

/**
 * Verify HMAC SHA256 signature for Shiprocket API requests
 * Used to authenticate requests from Shiprocket Checkout
 */
const verifyShiprocketHMAC = (req, res, next) => {
  try {
    const apiKey = process.env.SHIPROCKET_CHECKOUT_API_KEY;
    const secretKey = process.env.SHIPROCKET_CHECKOUT_SECRET_KEY;
    
    if (!apiKey || !secretKey) {
      console.warn('Shiprocket Checkout credentials not configured');
      return next(); // Allow requests if not configured
    }

    // Get HMAC from request headers
    const receivedHmac = req.headers['x-api-hmac-sha256'];
    if (!receivedHmac) {
      // If no HMAC header, allow through (may be optional for some endpoints)
      return next();
    }

    // Get raw body for HMAC calculation
    let rawBody = '';
    
    if (req.body && typeof req.body === 'object') {
      rawBody = JSON.stringify(req.body);
    } else if (req.rawBody) {
      rawBody = req.rawBody;
    }

    // Calculate HMAC SHA256
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(rawBody)
      .digest('base64');

    // Compare HMACs
    if (hmac !== receivedHmac) {
      console.error('HMAC verification failed', {
        received: receivedHmac,
        calculated: hmac
      });
      return res.status(401).json({ 
        error: 'Invalid HMAC signature',
        message: 'Request signature verification failed'
      });
    }

    // Verify API Key
    const receivedApiKey = req.headers['x-api-key'];
    if (receivedApiKey && !receivedApiKey.includes(apiKey)) {
      return res.status(401).json({ 
        error: 'Invalid API Key',
        message: 'API Key verification failed'
      });
    }

    next();
  } catch (error) {
    console.error('HMAC verification error:', error);
    res.status(500).json({ 
      error: 'HMAC verification failed',
      message: error.message 
    });
  }
};

/**
 * Calculate HMAC SHA256 for Shiprocket API requests
 * Use this utility to sign requests to Shiprocket
 */
const calculateHMAC = (requestBody, secretKey) => {
  const bodyString = typeof requestBody === 'string' 
    ? requestBody 
    : JSON.stringify(requestBody);
  
  return crypto
    .createHmac('sha256', secretKey)
    .update(bodyString)
    .digest('base64');
};

module.exports = {
  verifyShiprocketHMAC,
  calculateHMAC
};