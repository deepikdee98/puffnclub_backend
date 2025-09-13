const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Setting up Website Backend...\n');

// Generate random JWT secrets
const generateSecret = () => crypto.randomBytes(64).toString('hex');

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  
  const envContent = `# Database
CONNECTION_STRING=mongodb://localhost:27017/ecommerce_website

# JWT Secrets
JWT_SECRET=${generateSecret()}
JWT_REFRESH_SECRET=${generateSecret()}

# Server Port
PORT=5000

# AWS S3 (optional - for file uploads)
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key
# AWS_REGION=your_aws_region
# AWS_BUCKET_NAME=your_bucket_name
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created with random JWT secrets');
} else {
  console.log('⚠️  .env file already exists, skipping creation');
}

console.log('\n📋 Setup Complete! Next steps:');
console.log('1. Make sure MongoDB is running on your system');
console.log('2. Update the CONNECTION_STRING in .env if needed');
console.log('3. Start the server with: npm run dev');
console.log('4. Test the API with: node test-website-api.js');

console.log('\n🔗 Website API Endpoints:');
console.log('- Products: GET /api/website/products');
console.log('- Customer Auth: POST /api/website/auth/register');
console.log('- Cart: GET /api/website/cart');
console.log('- Orders: GET /api/website/orders');
console.log('- Contact: POST /api/website/contact');

console.log('\n📖 See WEBSITE_API_DOCUMENTATION.md for full API reference');