const Wishlist = require("../Models/wishlist");
const Cart = require("../Models/cart");
const Product = require("../Models/productdetails");

// Helper function to transform and clean product data (same as websiteController)
const transformProductData = (product) => {
  const productObj = product.toObject ? product.toObject() : product;
  
  // Clean up variants - remove incomplete/empty variants
  let cleanVariants = [];
  if (productObj.variants && Array.isArray(productObj.variants)) {
    cleanVariants = productObj.variants.filter(variant => 
      variant.color && 
      variant.stock !== undefined && 
      variant.sizes && variant.sizes.length > 0 &&
      variant.images && variant.images.length > 0
    );
  }
  
  // If no valid variants, create a fallback variant from legacy fields
  if (cleanVariants.length === 0) {
    const fallbackVariant = {
      color: productObj.color || 'Default',
      stock: productObj.stockQuantity || productObj.stock || 0,
      sizes: productObj.availableSizes || [],
      images: productObj.images || []
    };
    
    // Only add fallback if it has required data
    if (fallbackVariant.color && fallbackVariant.sizes.length > 0 && fallbackVariant.images.length > 0) {
      cleanVariants = [fallbackVariant];
    }
  }
  
  // Calculate total stock from variants
  const totalStock = cleanVariants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
  
  // Get all available colors
  const availableColors = [...new Set(cleanVariants.map(v => v.color))];
  
  // Get all available sizes (unique)
  const availableSizes = [...new Set(cleanVariants.flatMap(v => v.sizes || []))];
  
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
    images: allImages, // For backward compatibility
    
    // SEO fields
    metaTitle: productObj.metaTitle,
    metaDescription: productObj.metaDescription,
    
    // Timestamps
    createdAt: productObj.createdAt,
    updatedAt: productObj.updatedAt
  };
};

// @desc    Add item to wishlist
// @route   POST /api/website/wishlist/add
// @access  Private
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const customerId = req.customer.id;

    // Validation
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Check if product exists and is active
    const product = await Product.findOne({ _id: productId, status: "active" });
    if (!product) {
      return res.status(404).json({ error: "Product not found or inactive" });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ customer: customerId });
    if (!wishlist) {
      wishlist = new Wishlist({ customer: customerId, items: [] });
    }

    // Check if item already exists in wishlist with same product, color, and size
    const { color, size } = req.body;
    const existingItemIndex = wishlist.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (color ? item.color === color : true) &&
        (size ? item.size === size : true)
    );

    if (existingItemIndex > -1) {
      return res.status(400).json({ error: "Product with selected options is already in wishlist" });
    }

    // Add new item with color and size
    wishlist.items.push({
      product: productId,
      color,
      size,
    });

    await wishlist.save();

    // Populate wishlist with product details
    await wishlist.populate({
      path: "items.product",
      select: "-__v",
    });

    // Transform product data in wishlist items
    const transformedWishlist = {
      ...wishlist.toObject(),
      items: wishlist.items.map((item) => ({
        ...item.toObject(),
        product: transformProductData(item.product)
      }))
    };

    res.json({
      message: "Item added to wishlist successfully",
      wishlist: transformedWishlist,
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get customer's wishlist
// @route   GET /api/website/wishlist
// @access  Private
const getWishlist = async (req, res) => {
  try {
    const customerId = req.customer.id;

    const wishlist = await Wishlist.findOne({ customer: customerId }).populate({
      path: "items.product",
      select: "-__v",
    });

    if (!wishlist) {
      return res.json({
        wishlist: {
          customer: customerId,
          items: [],
          totalItems: 0,
        },
      });
    }

    // Filter out inactive products and transform product data
    wishlist.items = wishlist.items
      .filter((item) => item.product && item.product.status === "active")
      .map((item) => ({
        ...item.toObject(),
        product: transformProductData(item.product)
      }));

    // Recalculate totals after filtering
    await wishlist.save();

    res.json({ wishlist });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Remove item from wishlist
// @route   DELETE /api/website/wishlist/item/:itemId
// @access  Private
const removeFromWishlist = async (req, res) => {
  try {
    const { itemId } = req.params;
    const customerId = req.customer.id;

    const wishlist = await Wishlist.findOne({ customer: customerId });
    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    const itemIndex = wishlist.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in wishlist" });
    }

    // Remove item
    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    // Populate wishlist with product details
    await wishlist.populate({
      path: "items.product",
      select: "-__v",
    });

    // Transform product data in wishlist items
    const transformedWishlist = {
      ...wishlist.toObject(),
      items: wishlist.items.map((item) => ({
        ...item.toObject(),
        product: transformProductData(item.product)
      }))
    };

    res.json({
      message: "Item removed from wishlist successfully",
      wishlist: transformedWishlist,
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Clear entire wishlist
// @route   DELETE /api/website/wishlist/clear
// @access  Private
const clearWishlist = async (req, res) => {
  try {
    const customerId = req.customer.id;

    const wishlist = await Wishlist.findOne({ customer: customerId });
    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    wishlist.items = [];
    await wishlist.save();

    res.json({
      message: "Wishlist cleared successfully",
      wishlist,
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Move item from wishlist to cart
// @route   POST /api/website/wishlist/move-to-cart/:itemId
// @access  Private
const moveToCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity = 1, size, color } = req.body;
    const customerId = req.customer.id;

    // Find wishlist item
    const wishlist = await Wishlist.findOne({ customer: customerId });
    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    const itemIndex = wishlist.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in wishlist" });
    }

    const productId = wishlist.items[itemIndex].product;

    // Check if product exists and is active
    const product = await Product.findOne({ _id: productId, status: "active" });
    if (!product) {
      return res.status(404).json({ error: "Product not found or inactive" });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({ 
        error: `Only ${product.stock} items available in stock` 
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ customer: customerId });
    if (!cart) {
      cart = new Cart({ customer: customerId, items: [] });
    }

    // Check if item already exists in cart
    const existingCartItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );

    if (existingCartItemIndex > -1) {
      // Update existing cart item
      const newQuantity = cart.items[existingCartItemIndex].quantity + quantity;
      
      if (product.stock < newQuantity) {
        return res.status(400).json({ 
          error: `Only ${product.stock} items available in stock` 
        });
      }

      cart.items[existingCartItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity,
        size,
        color,
        price: product.price,
      });
    }

    await cart.save();

    // Remove item from wishlist
    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    // Populate cart with product details
    await cart.populate({
      path: "items.product",
      select: "name price images category stock status",
    });

    res.json({
      message: "Item moved to cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Move to cart error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart,
};