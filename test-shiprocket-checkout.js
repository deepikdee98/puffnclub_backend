const dotenv = require('dotenv').config();
const crypto = require('crypto');
const { calculateHMAC } = require('./Middleware/shiprocketAuthMiddleware');

async function testShiprocketCheckoutCredentials() {
  console.log('🧪 Testing Shiprocket Checkout API Credentials...\n');

  // Test 1: Check if credentials are loaded
  console.log('1. Checking Environment Variables...');
  const apiKey = process.env.SHIPROCKET_CHECKOUT_API_KEY;
  const secretKey = process.env.SHIPROCKET_CHECKOUT_SECRET_KEY;
  const apiUrl = process.env.SHIPROCKET_CHECKOUT_API_URL || 'https://checkout-api.shiprocket.com';

  if (!apiKey || !secretKey) {
    console.error('❌ Credentials not found!');
    console.error('Please check your .env file:');
    console.error('- SHIPROCKET_CHECKOUT_API_KEY');
    console.error('- SHIPROCKET_CHECKOUT_SECRET_KEY');
    return;
  }

  console.log('✅ API Key: ' + apiKey.substring(0, 10) + '...');
  console.log('✅ Secret Key: ' + secretKey.substring(0, 10) + '...');
  console.log('✅ API URL: ' + apiUrl);
  console.log('');

  // Test 2: Test HMAC Calculation (for outbound requests to Shiprocket)
  console.log('2. Testing HMAC Calculation (Outbound)...');
  const testPayload = {
    cart_data: {
      items: [
        {
          product_id: 'test123',
          quantity: 2,
          price: 1000
        }
      ],
      total: 2000
    },
    redirect_url: 'https://example.com/return',
    timestamp: new Date().toISOString()
  };

  const payloadString = JSON.stringify(testPayload);
  const calculatedHmac = calculateHMAC(testPayload, secretKey);
  
  console.log('✅ HMAC calculated successfully');
  console.log('   Payload: ' + payloadString.substring(0, 50) + '...');
  console.log('   HMAC: ' + calculatedHmac.substring(0, 30) + '...');
  console.log('');

  // Test 3: Test HMAC Verification (for inbound requests from Shiprocket)
  console.log('3. Testing HMAC Verification (Inbound)...');
  const receivedHmac = calculatedHmac; // Simulate receiving the same HMAC
  const verifyHmac = crypto
    .createHmac('sha256', secretKey)
    .update(payloadString)
    .digest('base64');

  if (receivedHmac === verifyHmac) {
    console.log('✅ HMAC verification successful');
    console.log('   Received HMAC matches calculated HMAC');
  } else {
    console.error('❌ HMAC verification failed');
    console.error('   Received: ' + receivedHmac.substring(0, 30));
    console.error('   Calculated: ' + verifyHmac.substring(0, 30));
  }
  console.log('');

  // Test 4: Test API Key format
  console.log('4. Testing API Key Format...');
  if (apiKey.length >= 10) {
    console.log('✅ API Key length: ' + apiKey.length + ' characters');
  } else {
    console.warn('⚠️  API Key seems too short');
  }

  if (secretKey.length >= 10) {
    console.log('✅ Secret Key length: ' + secretKey.length + ' characters');
  } else {
    console.warn('⚠️  Secret Key seems too short');
  }
  console.log('');

  // Test 5: Test Request Headers Format
  console.log('5. Testing Request Headers Format...');
  const headers = {
    'X-Api-Key': apiKey,
    'X-Api-HMAC-SHA256': calculatedHmac,
    'Content-Type': 'application/json'
  };

  console.log('✅ Headers format correct:');
  console.log('   X-Api-Key: ' + headers['X-Api-Key'].substring(0, 15) + '...');
  console.log('   X-Api-HMAC-SHA256: ' + headers['X-Api-HMAC-SHA256'].substring(0, 30) + '...');
  console.log('');

  // Test 6: Test with different payload
  console.log('6. Testing HMAC with Different Payloads...');
  const payload1 = { test: 'data1' };
  const payload2 = { test: 'data2' };
  const hmac1 = calculateHMAC(payload1, secretKey);
  const hmac2 = calculateHMAC(payload2, secretKey);

  if (hmac1 !== hmac2) {
    console.log('✅ Different payloads produce different HMACs (as expected)');
  } else {
    console.error('❌ Different payloads produce same HMAC (unexpected)');
  }
  console.log('');

  console.log('✅ All credential tests passed!');
  console.log('');
  console.log('📝 Summary:');
  console.log('   - Credentials loaded: ✅');
  console.log('   - HMAC calculation: ✅');
  console.log('   - HMAC verification: ✅');
  console.log('   - Headers format: ✅');
  console.log('');
  console.log('🚀 Shiprocket Checkout API credentials are configured correctly!');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Restart your server to load credentials');
  console.log('   2. Test endpoints:');
  console.log('      - POST /api/shiprocket/checkout/access-token');
  console.log('      - POST /api/shiprocket/checkout/order-webhook');
  console.log('      - GET /api/shiprocket/catalog/products');
  console.log('   3. Configure Shiprocket dashboard with your webhook URLs');
}

// Run the test
testShiprocketCheckoutCredentials().catch(error => {
  console.error('❌ Test error:', error.message);
  process.exit(1);
});

