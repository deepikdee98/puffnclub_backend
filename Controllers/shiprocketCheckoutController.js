const Product = require('../Models/productdetails');
const Category = require('../Models/category');
const CustomerOrder = require('../Models/customerOrder');
const crypto = require('crypto');

/**
 * @desc    Fetch all products for Shiprocket catalog sync
 * @route   GET /api/shiprocket/catalog/products
 * @access  Public (but requires Shiprocket API Key)
 * @params  page, limit
 */
const fetchProducts = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch only active products
    const products = await Product.find({ status: 'active' })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Product.countDocuments({ status: 'active' });

    // Transform products to Shiprocket format
    const transformedProducts = products.map(product => formatProductForShiprocket(product));

    res.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      details: error.message
    });
  }
};

/**
 * @desc    Fetch products by collection (category)
 * @route   GET /api/shiprocket/catalog/products/collection/:collectionId
 * @access  Public (but requires Shiprocket API Key)
 */
const fetchProductsByCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find category
    const category = await Category.findById(collectionId).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }

    // Fetch products in this category
    const products = await Product.find({
      status: 'active',
      category: category.name
    })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Product.countDocuments({
      status: 'active',
      category: category.name
    });

    // Transform products
    const transformedProducts = products.map(product => formatProductForShiprocket(product));

    res.json({
      success: true,
      data: {
        collection: {
          id: category._id,
          title: category.name,
          body_html: category.description || '',
          image: {
            src: category.image || ''
          }
        },
        products: transformedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Fetch products by collection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products by collection',
      details: error.message
    });
  }
};

/**
 * @desc    Fetch all collections (categories)
 * @route   GET /api/shiprocket/catalog/collections
 * @access  Public (but requires Shiprocket API Key)
 */
const fetchCollections = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const collections = await Category.find({ isActive: true })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Category.countDocuments({ isActive: true });

    // Transform collections to Shiprocket format
    const transformedCollections = collections.map(collection => ({
      id: collection._id.toString(),
      title: collection.name,
      body_html: collection.description || '',
      updated_at: new Date(collection.updatedAt).toISOString(),
      image: {
        src: collection.image || ''
      }
    }));

    res.json({
      success: true,
      data: {
        collections: transformedCollections,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Fetch collections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collections',
      details: error.message
    });
  }
};

/**
 * @desc    Generate access token for Shiprocket Checkout
 * @route   POST /api/shiprocket/checkout/access-token
 * @access  Public (but requires HMAC authentication)
 * @body    { cart_data, redirect_url, timestamp }
 */
const generateAccessToken = async (req, res) => {
  try {
    const { cart_data, redirect_url, timestamp } = req.body;

    if (!cart_data || !cart_data.items || cart_data.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'cart_data with items is required'
      });
    }

    if (!redirect_url) {
      return res.status(400).json({
        success: false,
        error: 'redirect_url is required'
      });
    }

    // Generate unique token
    const tokenPayload = {
      cart_data,
      redirect_url,
      timestamp: timestamp || new Date().toISOString(),
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min expiry
    };

    // Create token (you can use JWT if preferred)
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    // Optionally store token in cache/session for verification later
    // For now, we'll just return it

    res.json({
      success: true,
      result: {
        token: token,
        expires_in: 1800, // 30 minutes in seconds
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate access token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate access token',
      details: error.message
    });
  }
};

/**
 * @desc    Receive order webhook from Shiprocket
 * @route   POST /api/shiprocket/checkout/order-webhook
 * @access  Public (but should verify HMAC)
 */
const handleOrderWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const {
      order_id,
      cart_data,
      status,
      phone,
      email,
      payment_type,
      total_amount_payable,
      customer_details,
      shipping_address,
      billing_address
    } = webhookData;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id is required'
      });
    }

    console.log('📦 Received order webhook from Shiprocket:', {
      order_id,
      status,
      email,
      phone
    });

    // Check if order already exists
    let order = await CustomerOrder.findOne({ 'shiprocketOrderId': order_id });

    if (!order && email) {
      // Create new order or link to existing customer
      // This depends on your order creation flow
      console.log('Creating new order from Shiprocket webhook');
    }

    // Store webhook data for logging/debugging
    if (order) {
      order.shiprocketWebhookData = webhookData;
      order.shiprocketOrderId = order_id;
      order.paymentMethod = payment_type;
      
      if (status === 'SUCCESS') {
        order.orderStatus = 'confirmed';
      }
      
      await order.save();
    }

    res.json({
      success: true,
      message: 'Order webhook received successfully',
      order_id
    });
  } catch (error) {
    console.error('Order webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process order webhook',
      details: error.message
    });
  }
};

/**
 * @desc    Fetch order details
 * @route   GET /api/shiprocket/checkout/order/:orderId
 * @access  Public (but requires HMAC authentication)
 */
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { timestamp } = req.query;

    const order = await CustomerOrder.findOne({
      $or: [
        { _id: orderId },
        { shiprocketOrderId: orderId }
      ]
    })
      .populate('customer', 'email phone name')
      .populate('items.product')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Transform order data to Shiprocket format
    const orderDetails = {
      order_id: order._id.toString(),
      shiprocket_order_id: order.shiprocketOrderId || '',
      status: order.orderStatus,
      payment_type: order.paymentMethod || 'COD',
      total_amount_payable: order.totalAmount,
      items: order.items.map(item => ({
        variant_id: item.variantId || '',
        product_id: item.product?._id.toString() || '',
        quantity: item.quantity,
        price: item.price,
        name: item.productName
      })),
      customer: {
        email: order.customer?.email || order.email,
        phone: order.customer?.phone || order.phone,
        name: order.customer?.name || order.customerName
      },
      shipping_address: order.shippingAddress,
      billing_address: order.billingAddress,
      created_at: order.createdAt,
      updated_at: order.updatedAt
    };

    res.json({
      success: true,
      result: orderDetails
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order details',
      details: error.message
    });
  }
};

/**
 * @desc    Get available loyalty points
 * @route   POST /api/shiprocket/loyalty/points/fetch
 * @access  Public (but requires HMAC authentication)
 */
const getAvailablePoints = async (req, res) => {
  try {
    const { mobile_number } = req.body;

    if (!mobile_number) {
      return res.status(400).json({
        success: false,
        error: 'mobile_number is required'
      });
    }

    // TODO: Implement loyalty points system
    // For now, returning default response
    const points = {
      available_points: 0,
      blocked_points: 0,
      total_points: 0,
      mobile_number,
      currency: 'INR'
    };

    res.json({
      success: true,
      result: points
    });
  } catch (error) {
    console.error('Get available points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available points',
      details: error.message
    });
  }
};

/**
 * @desc    Block loyalty points at checkout
 * @route   POST /api/shiprocket/loyalty/points/block
 * @access  Public (but requires HMAC authentication)
 */
const blockLoyaltyPoints = async (req, res) => {
  try {
    const { mobile_number, transactional_points, order_id } = req.body;

    if (!mobile_number || !transactional_points || !order_id) {
      return res.status(400).json({
        success: false,
        error: 'mobile_number, transactional_points, and order_id are required'
      });
    }

    // TODO: Implement loyalty points blocking
    const response = {
      success: true,
      blocked_points: transactional_points,
      order_id,
      mobile_number,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      result: response
    });
  } catch (error) {
    console.error('Block loyalty points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block loyalty points',
      details: error.message
    });
  }
};

/**
 * @desc    Unblock loyalty points on cart abandonment
 * @route   POST /api/shiprocket/loyalty/points/unblock
 * @access  Public (but requires HMAC authentication)
 */
const unblockLoyaltyPoints = async (req, res) => {
  try {
    const { order_id, transactional_points } = req.body;

    if (!order_id || transactional_points === undefined) {
      return res.status(400).json({
        success: false,
        error: 'order_id and transactional_points are required'
      });
    }

    // TODO: Implement loyalty points unblocking
    const response = {
      success: true,
      unblocked_points: transactional_points,
      order_id,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      result: response
    });
  } catch (error) {
    console.error('Unblock loyalty points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock loyalty points',
      details: error.message
    });
  }
};

/**
 * Helper function to format product for Shiprocket
 */
const formatProductForShiprocket = (product) => {
  return {
    id: product._id.toString(),
    title: product.name,
    body_html: product.description || '',
    vendor: product.brand || '',
    product_type: product.category || '',
    updated_at: new Date(product.updatedAt).toISOString(),
    status: product.status,
    variants: (product.variants || []).map((variant, index) => ({
      id: variant._id ? variant._id.toString() : `${product._id}-${index}`,
      title: variant.color || `Variant ${index + 1}`,
      price: product.price.toString(),
      quantity: variant.totalStock || 0,
      sku: `${product.sku}-${variant.color}`,
      updated_at: new Date(product.updatedAt).toISOString(),
      image: {
        src: variant.images?.[0] || ''
      },
      weight: 0.5 // Default weight, should be product-specific
    })),
    image: {
      src: product.variants?.[0]?.images?.[0] || ''
    }
  };
};

module.exports = {
  fetchProducts,
  fetchProductsByCollection,
  fetchCollections,
  generateAccessToken,
  handleOrderWebhook,
  getOrderDetails,
  getAvailablePoints,
  blockLoyaltyPoints,
  unblockLoyaltyPoints
};