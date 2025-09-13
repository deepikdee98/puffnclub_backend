const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/website';

async function testWebsiteAPI() {
  console.log('🧪 Testing Website API Endpoints...\n');

  try {
    // Test 1: Get public products
    console.log('1. Testing GET /api/website/products');
    const productsResponse = await axios.get(`${BASE_URL}/products`);
    console.log('✅ Products endpoint working');
    console.log(`   Found ${productsResponse.data.products?.length || 0} products\n`);

    // Test 2: Get featured products
    console.log('2. Testing GET /api/website/products/featured');
    const featuredResponse = await axios.get(`${BASE_URL}/products/featured`);
    console.log('✅ Featured products endpoint working');
    console.log(`   Found ${featuredResponse.data.products?.length || 0} featured products\n`);

    // Test 3: Test contact form submission
    console.log('3. Testing POST /api/website/contact');
    const contactData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a test message'
    };
    const contactResponse = await axios.post(`${BASE_URL}/contact`, contactData);
    console.log('✅ Contact form endpoint working');
    console.log(`   Response: ${contactResponse.data.message}\n`);

    // Test 4: Test newsletter subscription
    console.log('4. Testing POST /api/website/newsletter/subscribe');
    const newsletterData = {
      email: 'newsletter@example.com',
      firstName: 'Newsletter',
      lastName: 'Subscriber'
    };
    const newsletterResponse = await axios.post(`${BASE_URL}/newsletter/subscribe`, newsletterData);
    console.log('✅ Newsletter subscription endpoint working');
    console.log(`   Response: ${newsletterResponse.data.message}\n`);

    // Test 5: Test customer registration
    console.log('5. Testing POST /api/website/auth/register');
    const customerData = {
      firstName: 'Test',
      lastName: 'Customer',
      email: `test${Date.now()}@example.com`, // Unique email
      password: 'password123',
      phone: '1234567890'
    };
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, customerData);
    console.log('✅ Customer registration endpoint working');
    console.log(`   Customer ID: ${registerResponse.data.customer?.id}\n`);

    const token = registerResponse.data.token;

    // Test 6: Test customer profile
    console.log('6. Testing GET /api/website/auth/profile');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Customer profile endpoint working');
    console.log(`   Customer: ${profileResponse.data.customer?.fullName}\n`);

    // Test 7: Test get cart (empty)
    console.log('7. Testing GET /api/website/cart');
    const cartResponse = await axios.get(`${BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Cart endpoint working');
    console.log(`   Cart items: ${cartResponse.data.cart?.totalItems || 0}\n`);

    console.log('🎉 All website API endpoints are working correctly!');

  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the server is running on port 5000');
      console.log('   Run: npm run dev or npm start in the server directory');
    }
  }
}

// Run the test
testWebsiteAPI();