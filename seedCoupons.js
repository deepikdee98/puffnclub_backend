const mongoose = require('mongoose');
const Coupon = require('./Models/coupon');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.CONNECTION_STRING || 'mongodb://localhost:27017/ecommerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Sample coupons
const sampleCoupons = [
  {
    code: 'SAVE20',
    description: 'Save 20% on your total purchase',
    discountType: 'percentage',
    discountValue: 20,
    minimumPurchase: 500,
    maximumDiscount: 1000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2026-12-31'),
    isActive: true,
    applicableToAll: true,
  },
  {
    code: 'FLAT100',
    description: 'Get instant ₹100 discount',
    discountType: 'fixed',
    discountValue: 100,
    minimumPurchase: 299,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2026-11-30'),
    isActive: true,
    applicableToAll: true,
  },
  {
    code: 'WELCOME15',
    description: 'Special discount for new customers',
    discountType: 'percentage',
    discountValue: 15,
    minimumPurchase: 800,
    maximumDiscount: 500,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2026-10-15'),
    isActive: true,
    applicableToAll: true,
    firstTimeUserOnly: true,
  },
  {
    code: 'FESTIVE25',
    description: 'Celebrate with extra savings',
    discountType: 'percentage',
    discountValue: 25,
    minimumPurchase: 1000,
    maximumDiscount: 2000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2026-11-15'),
    isActive: true,
    applicableToAll: true,
  },
  {
    code: 'FLASH50',
    description: 'Quick discount for limited time',
    discountType: 'fixed',
    discountValue: 50,
    minimumPurchase: 199,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2026-10-10'),
    isActive: true,
    applicableToAll: true,
  },
];

// Seed function
const seedCoupons = async () => {
  try {
    // Clear existing coupons (optional)
    console.log('🗑️  Clearing existing coupons...');
    await Coupon.deleteMany({});
    
    // Insert sample coupons
    console.log('📝 Inserting sample coupons...');
    const createdCoupons = await Coupon.insertMany(sampleCoupons);
    
    console.log(`✅ Successfully created ${createdCoupons.length} coupons:`);
    createdCoupons.forEach(coupon => {
      console.log(`   - ${coupon.code}: ${coupon.description}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding coupons:', error);
    process.exit(1);
  }
};

// Run seed
seedCoupons();