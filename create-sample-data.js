const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const Product = require('./Models/productdetails');
const Banner = require('./Models/banner');
const User = require('./Models/user');

// Connect to MongoDB
mongoose.connect(process.env.CONNECTION_STRING || 'mongodb://localhost:27017/ecommerce_website');

const createSampleData = async () => {
  try {
    console.log('🚀 Creating sample data...\n');

    // Find or create an admin user for banners
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '1234567890',
        password: 'hashedpassword', // In real app, this would be hashed
        role: 'admin'
      });
      await adminUser.save();
      console.log('✅ Created admin user');
    }

    // Create sample products
    const sampleProducts = [
      {
        name: 'Premium Cotton T-Shirt',
        sku: 'TSH-001',
        description: 'Comfortable and stylish cotton t-shirt perfect for everyday wear. Made from 100% organic cotton.',
        price: 29.99,
        comparePrice: 39.99,
        category: 'T-Shirts',
        brand: 'StyleCraft',
        color: 'Blue',
        stockQuantity: 50,
        status: 'Active',
        isFeatured: true,
        availableSizes: ['S', 'M', 'L', 'XL'],
        tags: ['New Arrival', 'Trending'],
        images: [
          'https://images.pexels.com/photos/1020585/pexels-photo-1020585.jpeg?auto=compress&cs=tinysrgb&w=400',
          'https://images.pexels.com/photos/1020585/pexels-photo-1020585.jpeg?auto=compress&cs=tinysrgb&w=800'
        ]
      },
      {
        name: 'Denim Jacket Classic',
        sku: 'JAC-001',
        description: 'Timeless denim jacket with a modern fit. Perfect for layering and adding style to any outfit.',
        price: 89.99,
        comparePrice: 120.00,
        category: 'Jackets',
        brand: 'UrbanStyle',
        color: 'Blue',
        stockQuantity: 30,
        status: 'Active',
        isFeatured: true,
        availableSizes: ['S', 'M', 'L', 'XL'],
        tags: ['Best Seller'],
        images: [
          'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=400',
          'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800'
        ]
      },
      {
        name: 'Summer Floral Dress',
        sku: 'DRS-001',
        description: 'Beautiful floral dress perfect for summer occasions. Lightweight and breathable fabric.',
        price: 65.99,
        category: 'Dresses',
        brand: 'Floral Fashion',
        color: 'Pink',
        stockQuantity: 25,
        status: 'Active',
        isFeatured: false,
        availableSizes: ['XS', 'S', 'M', 'L'],
        tags: ['New Arrival'],
        images: [
          'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=400',
          'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=800'
        ]
      },
      {
        name: 'Casual Sneakers',
        sku: 'SHO-001',
        description: 'Comfortable sneakers for everyday wear. Perfect for walking, running, or casual outings.',
        price: 79.99,
        comparePrice: 99.99,
        category: 'Shoes',
        brand: 'ComfortWalk',
        color: 'White',
        stockQuantity: 40,
        status: 'Active',
        isFeatured: true,
        availableSizes: ['S', 'M', 'L', 'XL'],
        tags: ['Trending', 'Best Seller'],
        images: [
          'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400',
          'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800'
        ]
      },
      {
        name: 'Leather Handbag',
        sku: 'ACC-001',
        description: 'Elegant leather handbag with multiple compartments. Perfect for work or special occasions.',
        price: 149.99,
        comparePrice: 199.99,
        category: 'Accessories',
        brand: 'StyleCraft',
        color: 'Black',
        stockQuantity: 15,
        status: 'Active',
        isFeatured: false,
        availableSizes: ['M'],
        tags: ['Limited Edition'],
        images: [
          'https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=400',
          'https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800'
        ]
      },
      {
        name: 'Classic White T-Shirt',
        sku: 'TSH-002',
        description: 'Essential white t-shirt for your wardrobe. Soft cotton blend for maximum comfort.',
        price: 24.99,
        category: 'T-Shirts',
        brand: 'TrendyWear',
        color: 'White',
        stockQuantity: 60,
        status: 'Active',
        isFeatured: true,
        availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
        tags: ['Sale'],
        images: [
          'https://images.pexels.com/photos/1020585/pexels-photo-1020585.jpeg?auto=compress&cs=tinysrgb&w=400'
        ]
      }
    ];

    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');

    // Insert sample products
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`✅ Created ${createdProducts.length} sample products`);

    // Create sample banners
    const sampleBanners = [
      {
        title: 'Summer Sale',
        subtitle: 'Up to 50% off on selected items',
        buttonText: 'Shop Now',
        buttonLink: 'https://localhost:3000/website/products',
        targetUrl: 'https://localhost:3000/website/products?category=clothing',
        image: 'https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg?auto=compress&cs=tinysrgb&w=1200',
        isActive: true,
        order: 1,
        createdBy: adminUser._id
      },
      {
        title: 'New Arrivals',
        subtitle: 'Check out our latest collection',
        buttonText: 'Explore',
        buttonLink: 'https://localhost:3000/website/products',
        targetUrl: 'https://localhost:3000/website/products?sort=newest',
        image: 'https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?auto=compress&cs=tinysrgb&w=1200',
        isActive: true,
        order: 2,
        createdBy: adminUser._id
      },
      {
        title: 'Free Shipping',
        subtitle: 'On orders over $100',
        buttonText: 'Learn More',
        buttonLink: 'https://localhost:3000/website/about',
        targetUrl: 'https://localhost:3000/website/shipping-info',
        image: 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=1200',
        isActive: true,
        order: 3,
        createdBy: adminUser._id
      }
    ];

    // Clear existing banners
    await Banner.deleteMany({});
    console.log('🗑️  Cleared existing banners');

    // Insert sample banners
    const createdBanners = await Banner.insertMany(sampleBanners);
    console.log(`✅ Created ${createdBanners.length} sample banners`);

    console.log('\n🎉 Sample data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Products: ${createdProducts.length}`);
    console.log(`- Featured Products: ${createdProducts.filter(p => p.isFeatured).length}`);
    console.log(`- Banners: ${createdBanners.length}`);
    console.log(`- Categories: ${[...new Set(createdProducts.map(p => p.category))].join(', ')}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    process.exit(1);
  }
};

createSampleData();