    // Debug log: print product object after setting images
const Cart = require("../Models/cart");
const Product = require("../Models/productdetails");

// @desc    Add item to cart
// @route   POST /api/website/cart/add
// @access  Private
const addToCart = async (req, res) => {
  try {
    console.log('addToCart req.body:', req.body);
    const { productId, quantity = 1, size, color } = req.body;
    const customerId = req.customer.id;

    // Validation
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

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
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingItemIndex > -1) {
      // Update existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ 
          error: `Only ${product.stock} items available in stock` 
        });
      }
      cart.items[existingItemIndex].quantity = newQuantity;
      console.log('Updated existing cart item:', cart.items[existingItemIndex]);
    } else {
      // Add new item
      const newItem = {
        product: productId,
        quantity,
        size,
        color,
        price: product.price,
        
      };
      console.log('Adding new item to cart:', newItem);
      cart.items.push(newItem);
    }

    console.log('Cart before save:', cart);
    await cart.save();
    console.log('Cart after save:', cart);

    // Populate cart with product details
    await cart.populate({
      path: "items.product",
      select: "name price images category stock status variants",
    });

    // For each cart item, set product.images to the selected variant's images if available
    cart.items.forEach((item) => {
      if (item.product && typeof item.product.toObject === 'function') {
        item.product = item.product.toObject();
      }
      if (
        item.product &&
        Array.isArray(item.product.variants) &&
        item.product.variants.length > 0
      ) {
        // Find variant matching color and (if present) size
        let variant = item.product.variants.find(
          (v) =>
            v.color === item.color &&
            (!item.size || (Array.isArray(v.sizes) && v.sizes.includes(item.size)))
        );
        // If not found, fallback to color only
        if (!variant && item.color) {
          variant = item.product.variants.find((v) => v.color === item.color);
        }
        // If found and has images, set product.images to variant images
        if (variant && Array.isArray(variant.images) && variant.images.length > 0) {
          item.product.images = variant.images;
        }
      }
    });

    res.json({
      message: "Item added to cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get customer's cart
// @route   GET /api/website/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const customerId = req.customer.id;

    const cart = await Cart.findOne({ customer: customerId }).populate({
      path: "items.product",
      select: "name price images category stock isActive status variants",
    });

    if (!cart) {
      return res.json({
        cart: {
          customer: customerId,
          items: [],
          totalItems: 0,
          totalAmount: 0,
        },
      });
    }

    // Filter out inactive products
    cart.items = cart.items.filter((item) => item.product && (item.product.isActive || item.product.status === "active"));

    // Set product.images to the selected variant's images for each cart item
    cart.items.forEach((item) => {
      if (
        item.product &&
        Array.isArray(item.product.variants) &&
        item.product.variants.length > 0
      ) {
        // Find variant matching color and (if present) size
        let variant = item.product.variants.find(
          (v) =>
            v.color === item.color &&
            (!item.size || (Array.isArray(v.sizes) && v.sizes.includes(item.size)))
        );
        // If not found, fallback to color only
        if (!variant && item.color) {
          variant = item.product.variants.find((v) => v.color === item.color);
        }
        // If found and has images, set product.images to variant images
        if (variant && Array.isArray(variant.images) && variant.images.length > 0) {
          item.product.images = variant.images;
        }
      }
    });

    // Recalculate totals after filtering
    await cart.save();

    res.json({ cart });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/website/cart/item/:itemId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const customerId = req.customer.id;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Valid quantity is required" });
    }

    const cart = await Cart.findOne({ customer: customerId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    // Check product stock
    const product = await Product.findById(cart.items[itemIndex].product);
    // Product model uses `status` ("active" | "inactive" | "draft") not `isActive`
    if (!product || product.status !== "active") {
      return res.status(404).json({ error: "Product not found or inactive" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ 
        error: `Only ${product.stock} items available in stock` 
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = product.price; // Update price in case it changed

    await cart.save();

    // Populate cart with product details
    await cart.populate({
      path: "items.product",
      select: "name price images category stock status variants",
    });

    res.json({
      message: "Cart item updated successfully",
      cart,
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/website/cart/item/:itemId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const customerId = req.customer.id;

    const cart = await Cart.findOne({ customer: customerId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    // Remove item
    cart.items.splice(itemIndex, 1);
    await cart.save();

    // Populate cart with product details
    await cart.populate({
      path: "items.product",
      select: "name price images category stock",
    });

    res.json({
      message: "Item removed from cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/website/cart/clear
// @access  Private
const clearCart = async (req, res) => {
  try {
    const customerId = req.customer.id;

    const cart = await Cart.findOne({ customer: customerId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    res.json({
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};