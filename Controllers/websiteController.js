const Product = require("../Models/productdetails");
const Banner = require("../Models/banner");
const Newsletter = require("../Models/newsletter");
const Review = require("../Models/review");
const CustomerOrder = require("../Models/customerOrder");

// @desc    Get all public products with pagination and filtering
// @route   GET /api/website/products
// @access  Public
const getPublicProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      sizes,
      colors,
    } = req.query;

    // Build filter object - case insensitive status filter
    const filter = { status: { $regex: '^active$', $options: 'i' } };

    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // For size and color filtering, we need to filter after transformation
    // So we fetch more products initially to account for filtering
    const fetchLimit = (sizes || colors) ? parseInt(limit) * 10 : parseInt(limit);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get products
    const productsRaw = await Product.find(filter)
      .select("-__v")
      .sort(sort)
      .skip(skip)
      .limit(fetchLimit);

    // Transform products data
    let products = productsRaw.map(product => {
      const transformed = transformProductData(product);
      // For listing, return a simplified version
      return {
        _id: transformed._id,
        name: transformed.name,
        sku: transformed.sku,
        description: transformed.description,
        category: transformed.category,
        brand: transformed.brand,
        price: transformed.price,
        comparePrice: transformed.comparePrice,
        status: transformed.status,
        isFeatured: transformed.isFeatured,
        tags: transformed.tags,
        variants: transformed.variants,
        totalStock: transformed.totalStock,
        availableColors: transformed.availableColors,
        availableSizes: transformed.availableSizes,
        primaryImage: transformed.primaryImage,
        createdAt: transformed.createdAt,
        updatedAt: transformed.updatedAt
      };
    });

    // Filter by sizes if provided
    if (sizes) {
      const sizeArray = Array.isArray(sizes) ? sizes : sizes.split(',').map(s => s.trim());
      products = products.filter(product => {
        const productSizes = product.availableSizes || [];
        return sizeArray.some(size => 
          productSizes.some(ps => ps.toLowerCase() === size.toLowerCase())
        );
      });
    }

    // Filter by colors if provided
    if (colors) {
      const colorArray = Array.isArray(colors) ? colors : colors.split(',').map(c => c.trim());
      products = products.filter(product => {
        const productColors = product.availableColors || [];
        return colorArray.some(color => 
          productColors.some(pc => pc.toLowerCase() === color.toLowerCase())
        );
      });
    }

    // Apply pagination limit after filtering
    products = products.slice(0, parseInt(limit));

    // Get total count for pagination (approximate when filtering by size/color)
    const totalProducts = (sizes || colors) ? products.length : await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get public products error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get featured products
// @route   GET /api/website/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const productsRaw = await Product.find({
      status: { $regex: '^active$', $options: 'i' },
      isFeatured: true,
    })
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    console.log(`🔍 Found ${productsRaw.length} featured products`);
    productsRaw.forEach(p => {
      console.log(`  - ${p.name} (${p.sku}): images=${p.images?.length || 0}, sizes=${p.availableSizes?.length || 0}, variants=${p.variants?.length || 0}`);
    });

    // Transform products data
    const products = productsRaw.map(product => {
      const transformed = transformProductData(product);
      console.log(`  ✅ Transformed ${transformed.name}: primaryImage=${transformed.primaryImage ? 'YES' : 'NO'}, variants=${transformed.variants.length}`);
      // For featured products, return a simplified version
      return {
        _id: transformed._id,
        name: transformed.name,
        sku: transformed.sku,
        category: transformed.category,
        brand: transformed.brand,
        price: transformed.price,
        comparePrice: transformed.comparePrice,
        variants: transformed.variants,
        totalStock: transformed.totalStock,
        availableColors: transformed.availableColors,
        availableSizes: transformed.availableSizes,
        primaryImage: transformed.primaryImage,
        images: transformed.allImages,
        isFeatured: transformed.isFeatured
      };
    });

    res.json({ products });
  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get products by category
// @route   GET /api/website/products/category/:category
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { 
      page = 1, 
      limit = 12, 
      sortBy = "createdAt", 
      sortOrder = "desc",
      minPrice,
      maxPrice,
      sizes,
      colors,
    } = req.query;

    const filter = {
      status: { $regex: '^active$', $options: 'i' },
      category: { $regex: category, $options: "i" },
    };

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // For size and color filtering, fetch more products initially
    const fetchLimit = (sizes || colors) ? parseInt(limit) * 10 : parseInt(limit);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const productsRaw = await Product.find(filter)
      .select("-__v")
      .sort(sort)
      .skip(skip)
      .limit(fetchLimit);

    // Transform products data
    let products = productsRaw.map(product => {
      const transformed = transformProductData(product);
      // For category listing, return a simplified version
      return {
        _id: transformed._id,
        name: transformed.name,
        sku: transformed.sku,
        description: transformed.description,
        category: transformed.category,
        brand: transformed.brand,
        price: transformed.price,
        comparePrice: transformed.comparePrice,
        variants: transformed.variants,
        totalStock: transformed.totalStock,
        availableColors: transformed.availableColors,
        availableSizes: transformed.availableSizes,
        primaryImage: transformed.primaryImage,
        createdAt: transformed.createdAt
      };
    });

    // Filter by sizes if provided
    if (sizes) {
      const sizeArray = Array.isArray(sizes) ? sizes : sizes.split(',').map(s => s.trim());
      products = products.filter(product => {
        const productSizes = product.availableSizes || [];
        return sizeArray.some(size => 
          productSizes.some(ps => ps.toLowerCase() === size.toLowerCase())
        );
      });
    }

    // Filter by colors if provided
    if (colors) {
      const colorArray = Array.isArray(colors) ? colors : colors.split(',').map(c => c.trim());
      products = products.filter(product => {
        const productColors = product.availableColors || [];
        return colorArray.some(color => 
          productColors.some(pc => pc.toLowerCase() === color.toLowerCase())
        );
      });
    }

    // Apply pagination limit after filtering
    products = products.slice(0, parseInt(limit));

    const totalProducts = (sizes || colors) ? products.length : await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    res.json({
      products,
      category,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Search products
// @route   GET /api/website/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const filter = {
      status: { $regex: '^active$', $options: 'i' },
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
      ],
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const productsRaw = await Product.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Transform products data
    const products = productsRaw.map(product => {
      const transformed = transformProductData(product);
      // For search results, return a simplified version
      return {
        _id: transformed._id,
        name: transformed.name,
        sku: transformed.sku,
        description: transformed.description,
        category: transformed.category,
        brand: transformed.brand,
        price: transformed.price,
        comparePrice: transformed.comparePrice,
        variants: transformed.variants,
        totalStock: transformed.totalStock,
        availableColors: transformed.availableColors,
        availableSizes: transformed.availableSizes,
        primaryImage: transformed.primaryImage,
        createdAt: transformed.createdAt
      };
    });

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    res.json({
      products,
      searchQuery: q,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Helper function to transform and clean product data
const transformProductData = (product) => {
  const productObj = product.toObject ? product.toObject() : product;
  
  // Clean up variants - remove incomplete/empty variants
  let cleanVariants = [];
  if (productObj.variants && Array.isArray(productObj.variants)) {
    cleanVariants = productObj.variants.filter(variant => {
      // Check for new structure (sizeStocks)
      if (variant.sizeStocks && Array.isArray(variant.sizeStocks)) {
        return variant.color && 
               variant.sizeStocks.length > 0 &&
               variant.totalStock !== undefined &&
               variant.images && variant.images.length > 0;
      }
      // Check for legacy structure (sizes/stock)
      return variant.color && 
             variant.stock !== undefined && 
             variant.sizes && variant.sizes.length > 0 &&
             variant.images && variant.images.length > 0;
    });
  }
  
  // If no valid variants, create a fallback variant from legacy fields
  if (cleanVariants.length === 0) {
    const fallbackVariant = {
      color: productObj.color || 'Default',
      stock: productObj.stockQuantity || productObj.stock || 0,
      totalStock: productObj.stockQuantity || productObj.stock || 0,
      sizes: productObj.availableSizes || [],
      images: productObj.images || []
    };
    
    // Only add fallback if it has required data
    if (fallbackVariant.color && fallbackVariant.sizes.length > 0 && fallbackVariant.images.length > 0) {
      cleanVariants = [fallbackVariant];
    }
  }
  
  // Calculate total stock from variants
  const totalStock = cleanVariants.reduce((sum, variant) => {
    // Use totalStock if available (new structure), otherwise use stock (legacy)
    return sum + (variant.totalStock !== undefined ? variant.totalStock : (variant.stock || 0));
  }, 0);
  
  // Get all available colors
  const availableColors = [...new Set(cleanVariants.map(v => v.color))];
  
  // Get all available sizes (unique)
  const availableSizes = [...new Set(cleanVariants.flatMap(v => {
    // For new structure, extract sizes from sizeStocks
    if (v.sizeStocks && Array.isArray(v.sizeStocks)) {
      return v.sizeStocks.map(ss => ss.size);
    }
    // For legacy structure, use sizes array
    return v.sizes || [];
  }))];
  
  // Get primary image (first image from first variant)
  const primaryImage = cleanVariants.length > 0 && cleanVariants[0].images.length > 0 
    ? cleanVariants[0].images[0] 
    : (productObj.images && productObj.images.length > 0 ? productObj.images[0] : null);
  
  // Get all images from all variants
  const allImages = cleanVariants.flatMap(v => v.images || []);
  
  return {
    _id: productObj._id,
    name: productObj.name,
    sku: productObj.sku,
    description: productObj.description,
    category: productObj.category,
    brand: productObj.brand,
    price: productObj.price,
    comparePrice: productObj.comparePrice,
    status: productObj.status,
    isFeatured: productObj.isFeatured,
    tags: productObj.tags || [],
    
    // Variant-based data
    variants: cleanVariants,
    totalStock: totalStock,
    availableColors: availableColors,
    availableSizes: availableSizes,
    primaryImage: primaryImage,
    allImages: allImages,
    
    // SEO fields
    metaTitle: productObj.metaTitle,
    metaDescription: productObj.metaDescription,
    
    // Timestamps
    createdAt: productObj.createdAt,
    updatedAt: productObj.updatedAt
  };
};

// @desc    Get single product by ID
// @route   GET /api/website/product/:id
// @access  Public
const getPublicProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      status: { $regex: '^active$', $options: 'i' },
    }).select("-__v");

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Transform the product data
    const transformedProduct = transformProductData(product);

    // Get related products (same category, excluding current product)
    const relatedProductsRaw = await Product.find({
      _id: { $ne: id },
      category: product.category,
      status: { $regex: '^active$', $options: 'i' },
    })
      .select("name price variants images category availableSizes stockQuantity stock color")
      .limit(4)
      .sort({ createdAt: -1 });

    // Transform related products
    const relatedProducts = relatedProductsRaw.map(relatedProduct => {
      const transformed = transformProductData(relatedProduct);
      return {
        _id: transformed._id,
        name: transformed.name,
        price: transformed.price,
        comparePrice: transformed.comparePrice,
        category: transformed.category,
        primaryImage: transformed.primaryImage,
        availableColors: transformed.availableColors,
        totalStock: transformed.totalStock
      };
    });

    res.json({
      product: transformedProduct,
      relatedProducts,
    });
  } catch (error) {
    console.error("Get product by ID error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get active banners for website
// @route   GET /api/website/banners
// @access  Public
const getPublicBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .select("-__v -createdBy -updatedBy")
      .sort({ order: 1 });

    res.json({ banners });
  } catch (error) {
    console.error("Get public banners error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Subscribe to newsletter
// @route   POST /api/website/newsletter/subscribe
// @access  Public
const subscribeNewsletter = async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if email already exists
    const existingSubscription = await Newsletter.findOne({ email });
    
    if (existingSubscription) {
      if (existingSubscription.isActive) {
        return res.status(400).json({ error: "Email is already subscribed" });
      } else {
        // Reactivate subscription
        existingSubscription.isActive = true;
        existingSubscription.subscribedAt = new Date();
        existingSubscription.unsubscribedAt = undefined;
        await existingSubscription.save();
        
        return res.json({ 
          message: "Successfully resubscribed to newsletter",
          subscription: existingSubscription 
        });
      }
    }

    // Create new subscription
    const subscription = new Newsletter({
      email,
      firstName,
      lastName,
      source: "website",
    });

    await subscription.save();

    res.status(201).json({
      message: "Successfully subscribed to newsletter",
      subscription,
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email is already subscribed" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get reviews for a product
// @route   GET /api/website/products/:productId/reviews
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get reviews
    const reviews = await Review.find({
      product: productId,
      status: "approved",
    })
      .populate("customer", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format reviews for frontend
    const formattedReviews = reviews.map(review => ({
      _id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      reviewer: review.customer?.name || "Anonymous",
      customerId: review.customer?._id,
      isVerifiedPurchase: review.isVerifiedPurchase,
      helpfulCount: review.helpfulCount || 0,
      date: review.createdAt,
      createdAt: review.createdAt,
    }));

    // Get total count
    const totalReviews = await Review.countDocuments({
      product: productId,
      status: "approved",
    });

    // Calculate average rating
    const ratingStats = await Review.aggregate([
      { 
        $match: { 
          product: product._id,
          status: "approved" 
        } 
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating"
          }
        }
      }
    ]);

    // Calculate rating distribution (1-5 stars)
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (ratingStats.length > 0 && ratingStats[0].ratingDistribution) {
      ratingStats[0].ratingDistribution.forEach(rating => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });
    }

    const averageRating = ratingStats.length > 0 
      ? parseFloat(ratingStats[0].averageRating.toFixed(1))
      : 0;

    const totalPages = Math.ceil(totalReviews / parseInt(limit));

    res.json({
      reviews: formattedReviews,
      averageRating,
      totalReviews,
      ratingDistribution,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalReviews,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Submit a review for a product
// @route   POST /api/website/products/:productId/reviews
// @access  Private (Customer must be authenticated)
const submitReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;

    // Validate required fields
    if (!rating || !title || !comment) {
      return res.status(400).json({ 
        error: "Please provide rating, title, and comment" 
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: "Rating must be between 1 and 5" 
      });
    }

    // Check if customer is authenticated
    if (!req.customer || !req.customer._id) {
      return res.status(401).json({ 
        error: "Please login to submit a review" 
      });
    }

    const customerId = req.customer._id;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if customer already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      customer: customerId,
    });

    if (existingReview) {
      return res.status(400).json({ 
        error: "You have already reviewed this product" 
      });
    }

    // Check if customer purchased this product (optional - for verified purchase badge)
    let isVerifiedPurchase = false;
    try {
      const hasPurchased = await CustomerOrder.findOne({
        customer: customerId,
        "items.product": productId,
        status: { $in: ["delivered", "completed"] },
      });
      isVerifiedPurchase = !!hasPurchased;
    } catch (err) {
      console.log("Could not verify purchase:", err.message);
      // Continue without verified purchase status
    }

    // Create review
    const review = await Review.create({
      product: productId,
      customer: customerId,
      rating: parseInt(rating),
      title: title.trim(),
      comment: comment.trim(),
      isVerifiedPurchase,
      status: "approved", // Auto-approve for now
    });

    // Populate customer data
    await review.populate("customer", "name email");

    // Format response
    const formattedReview = {
      _id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      reviewer: review.customer?.name || "Anonymous",
      isVerifiedPurchase: review.isVerifiedPurchase,
      date: review.createdAt,
      createdAt: review.createdAt,
    };

    res.status(201).json({
      message: "Review submitted successfully",
      review: formattedReview,
    });
  } catch (error) {
    console.error("Submit review error:", error);
    
    // Handle duplicate review error
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: "You have already reviewed this product" 
      });
    }
    
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get review statistics for a product
// @route   GET /api/website/products/:productId/reviews/stats
// @access  Public
const getProductReviewStats = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get review statistics
    const stats = await Review.aggregate([
      { 
        $match: { 
          product: product._id,
          status: "approved" 
        } 
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratings: { $push: "$rating" }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedPurchases: 0,
      });
    }

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats[0].ratings.forEach(rating => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    // Get verified purchases count
    const verifiedPurchases = await Review.countDocuments({
      product: productId,
      status: "approved",
      isVerifiedPurchase: true,
    });

    res.json({
      averageRating: parseFloat(stats[0].averageRating.toFixed(1)),
      totalReviews: stats[0].totalReviews,
      ratingDistribution,
      verifiedPurchases,
    });
  } catch (error) {
    console.error("Get review stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getPublicProducts,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts,
  getPublicProductById,
  getPublicBanners,
  subscribeNewsletter,
  getProductReviews,
  submitReview,
  getProductReviewStats,
};