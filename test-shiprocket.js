const dotenv = require('dotenv').config();
const shiprocketService = require('./Utils/shiprocketService');

async function testShiprocketIntegration() {
  console.log('🚀 Testing Shiprocket Integration...\n');

  try {
    // Test 1: Authentication
    console.log('1. Testing Authentication...');
    const token = await shiprocketService.authenticate();
    console.log('✅ Authentication successful');
    console.log(`Token: ${token.substring(0, 20)}...\n`);

    // Test 2: Check Serviceability
    console.log('2. Testing Serviceability Check...');
    const serviceability = await shiprocketService.checkServiceability('110001', '400001', 1);
    console.log('✅ Serviceability check successful');
    console.log(`Serviceable: ${serviceability.status === 200 ? 'Yes' : 'No'}\n`);

    // Test 3: Get Shipping Rates
    console.log('3. Testing Shipping Rates...');
    const rates = await shiprocketService.getShippingRates('110001', '400001', 1, 1000);
    console.log('✅ Shipping rates retrieved successfully');
    if (rates.data && rates.data.available_courier_companies) {
      console.log(`Available couriers: ${rates.data.available_courier_companies.length}`);
      rates.data.available_courier_companies.slice(0, 3).forEach(courier => {
        console.log(`- ${courier.courier_name}: ₹${courier.rate} (${courier.estimated_delivery_days} days)`);
      });
    }
    console.log('');

    // Test 4: Get Pickup Locations
    console.log('4. Testing Pickup Locations...');
    const pickupLocations = await shiprocketService.getPickupLocations();
    console.log('✅ Pickup locations retrieved successfully');
    if (pickupLocations.data && pickupLocations.data.length > 0) {
      console.log(`Available pickup locations: ${pickupLocations.data.length}`);
      pickupLocations.data.slice(0, 3).forEach(location => {
        console.log(`- ${location.pickup_location} (${location.city}, ${location.state})`);
      });
    }
    console.log('');

    console.log('🎉 All tests passed! Shiprocket integration is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nPlease check your Shiprocket credentials in the .env file:');
    console.error('- SHIPROCKET_EMAIL');
    console.error('- SHIPROCKET_PASSWORD');
    console.error('- SHIPROCKET_API_URL');
    console.error('\nMake sure you have signed up for Shiprocket and have valid credentials.');
  }
}

// Run the test
testShiprocketIntegration();