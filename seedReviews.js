const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Review = require("./Models/review");
const Product = require("./Models/productdetails");
const Customer = require("./Models/customer");

// Load environment variables
dotenv.config();

const seedReviews = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("✅ MongoDB connected");

    // Get first product
    const products = await Product.find({ status: "active" }).limit(3);
    if (products.length === 0) {
      console.log("❌ No products found. Please add products first.");
      process.exit(1);
    }

    // Get or create test customers
    const customerEmails = [
      { firstName: "Sai", lastName: "Vamsi", email: "sai.vamsi@example.com", phone: "1234567890" },
      { firstName: "Vistesh", lastName: "Kumar", email: "vistesh@example.com", phone: "1234567891" },
      { firstName: "Priya", lastName: "Sharma", email: "priya@example.com", phone: "1234567892" },
      { firstName: "Rahul", lastName: "Verma", email: "rahul@example.com", phone: "1234567893" },
      { firstName: "Anjali", lastName: "Patel", email: "anjali@example.com", phone: "1234567894" },
    ];

    const customers = [];
    for (const customerData of customerEmails) {
      let customer = await Customer.findOne({ email: customerData.email });
      if (!customer) {
        customer = await Customer.create({
          ...customerData,
          password: "password123", // This will be hashed by the model
          isActive: true,
        });
      }
      customers.push(customer);
    }
    console.log(`✅ Created/found ${customers.length} test customers`);

    // Clear existing reviews
    await Review.deleteMany({});
    console.log("🗑️  Cleared existing reviews");

    // Sample reviews data
    const reviewsData = [
      {
        rating: 5,
        title: "Excellent Quality!",
        comment: "The quality is top-notch! The fabric feels really soft on the skin, and the fit is perfect for everyday wear. The color hasn't faded even after multiple washes. Definitely worth the price.",
      },
      {
        rating: 4,
        title: "Great product, fast delivery",
        comment: "Love the vibrant colors. It makes a simple outfit stand out. The only thing I wish there were more size options, but overall very happy with the purchase.",
      },
      {
        rating: 5,
        title: "Highly Recommended!",
        comment: "This is my second purchase from this brand and I'm not disappointed. The material is durable and comfortable. Perfect for both casual and semi-formal occasions.",
      },
      {
        rating: 4,
        title: "Good value for money",
        comment: "Nice product at a reasonable price. The stitching is neat and the design is exactly as shown in the pictures. Would definitely recommend to others.",
      },
      {
        rating: 3,
        title: "Decent product",
        comment: "The product is okay. It's not exceptional but it's not bad either. The sizing runs a bit small, so I'd recommend ordering a size up.",
      },
    ];

    // Create reviews for each product
    const reviews = [];
    let customerIndex = 0;
    
    for (const product of products) {
      // Add 2-3 reviews per product
      const numReviews = Math.floor(Math.random() * 2) + 2; // 2 or 3 reviews
      
      for (let i = 0; i < numReviews && i < reviewsData.length; i++) {
        const reviewData = reviewsData[i];
        const customer = customers[customerIndex % customers.length];
        customerIndex++;
        
        reviews.push({
          product: product._id,
          customer: customer._id,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment,
          isVerifiedPurchase: Math.random() > 0.3, // 70% verified purchases
          status: "approved",
        });
      }
    }

    // Insert reviews
    const createdReviews = await Review.insertMany(reviews);
    console.log(`✅ Created ${createdReviews.length} reviews`);

    // Display summary
    console.log("\n📊 Review Summary:");
    for (const product of products) {
      const productReviews = await Review.find({ product: product._id });
      const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
      console.log(`\n📦 ${product.name}`);
      console.log(`   Reviews: ${productReviews.length}`);
      console.log(`   Average Rating: ${avgRating.toFixed(1)} ⭐`);
    }

    console.log("\n✅ Review seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding reviews:", error);
    process.exit(1);
  }
};

// Run the seed function
seedReviews();