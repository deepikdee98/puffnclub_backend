const CustomerOrder = require("../Models/customerOrder");
const Cart = require("../Models/cart");
const Product = require("../Models/productdetails");
const shiprocketService = require("../Utils/shiprocketService");

// @desc    Create new customer order
// @route   POST /api/website/orders
// @access  Private
const createCustomerOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes,
      selectedCourier,
      shippingCharges,
    } = req.body;
    const customerId = req.customer.id;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Order items are required" });
    }

    if (!shippingAddress || !billingAddress) {
      return res.status(400).json({ error: "Shipping and billing addresses are required" });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    // Validate and process order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, isActive: true });
      
      if (!product) {
        return res.status(404).json({ 
          error: `Product ${item.productId} not found or inactive` 
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Only ${product.stock} available` 
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images && product.images.length > 0 ? product.images[0] : null,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: product.price,
        total: itemTotal,
      });
    }

    // Calculate totals with Shiprocket shipping charges
    const shippingCost = shippingCharges || (subtotal > 100 ? 0 : 10); // Use provided shipping charges or default logic
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shippingCost + tax;

    // Create order
    const order = new CustomerOrder({
      customer: customerId,
      items: orderItems,
      shippingAddress,
      billingAddress,
      paymentMethod,
      subtotal,
      shippingCost,
      tax,
      total,
      notes,
      courierCompanyId: selectedCourier?.courierId,
      courierName: selectedCourier?.courierName,
      shippingCharges: shippingCost,
    });

    const savedOrder = await order.save();

    // Create order in Shiprocket after successful database save
    try {
      const shiprocketOrderData = {
        orderNumber: savedOrder.orderNumber,
        orderDate: savedOrder.createdAt.toISOString().split('T')[0],
        items: orderItems,
        shippingAddress,
        billingAddress,
        paymentMethod,
        subtotal,
        notes,
        shippingIsBilling: JSON.stringify(shippingAddress) === JSON.stringify(billingAddress)
      };

      const shiprocketResponse = await shiprocketService.createOrder(shiprocketOrderData);
      
      if (shiprocketResponse.status === 1 && shiprocketResponse.order_id) {
        // Update order with Shiprocket details
        savedOrder.shiprocketOrderId = shiprocketResponse.order_id.toString();
        savedOrder.shipmentId = shiprocketResponse.shipment_id?.toString();
        await savedOrder.save();
        
        console.log(`Order ${savedOrder.orderNumber} created in Shiprocket with ID: ${shiprocketResponse.order_id}`);
      } else {
        console.error('Failed to create order in Shiprocket:', shiprocketResponse);
        // Order is still created in our system, but not in Shiprocket
        // You might want to handle this case differently
      }
    } catch (shiprocketError) {
      console.error('Shiprocket order creation error:', shiprocketError.message);
      // Order is still created in our system, but not in Shiprocket
      // You might want to implement retry logic or manual sync
    }

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    // Clear customer's cart
    await Cart.findOneAndUpdate(
      { customer: customerId },
      { $set: { items: [] } }
    );

    // Populate order with customer details
    await savedOrder.populate("customer", "firstName lastName email");

    res.status(201).json({
      message: "Order created successfully",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Create customer order error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get customer's orders
// @route   GET /api/website/orders
// @access  Private
const getCustomerOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const customerId = req.customer.id;

    // Build filter
    const filter = { customer: customerId };
    if (status) {
      filter.orderStatus = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get orders
    const orders = await CustomerOrder.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("items.product", "name images");

    // Get total count
    const totalOrders = await CustomerOrder.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get customer orders error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get single customer order by ID
// @route   GET /api/website/orders/:orderId
// @access  Private
const getCustomerOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.customer.id;

    const order = await CustomerOrder.findOne({
      _id: orderId,
      customer: customerId,
    })
      .select("-__v")
      .populate("items.product", "name images category")
      .populate("customer", "firstName lastName email");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ order });
  } catch (error) {
    console.error("Get customer order by ID error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Get order tracking information
// @route   GET /api/website/orders/:orderId/tracking
// @access  Private
const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.customer.id;

    const order = await CustomerOrder.findOne({
      _id: orderId,
      customer: customerId
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.shipmentId) {
      return res.json({
        success: true,
        tracking: {
          status: order.orderStatus,
          message: 'Order is being processed',
          trackingNumber: order.trackingNumber || null,
          estimatedDelivery: order.estimatedDelivery || null
        }
      });
    }

    // Get tracking information from Shiprocket
    const trackingData = await shiprocketService.trackOrder(order.shipmentId);

    res.json({
      success: true,
      tracking: {
        status: order.currentStatus || order.orderStatus,
        awbCode: order.awbCode,
        courierName: order.courierName,
        trackingUrl: order.trackingUrl,
        currentLocation: trackingData.tracking_data?.track_detail?.[0]?.location || null,
        estimatedDelivery: order.expectedDeliveryDate || order.estimatedDelivery,
        trackingHistory: trackingData.tracking_data?.track_detail || [],
        shipmentDetails: trackingData.tracking_data || {},
        trackingNumber: order.trackingNumber || order.awbCode
      }
    });
  } catch (error) {
    console.error('Get order tracking error:', error);
    res.status(500).json({ 
      error: 'Failed to get tracking information',
      details: error.message 
    });
  }
};

// @desc    Cancel customer order
// @route   PUT /api/website/orders/:orderId/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;
    const customerId = req.customer.id;

    const order = await CustomerOrder.findOne({
      _id: orderId,
      customer: customerId,
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if order can be cancelled
    if (order.orderStatus === "cancelled") {
      return res.status(400).json({ error: "Order is already cancelled" });
    }

    if (order.orderStatus === "shipped" || order.orderStatus === "delivered") {
      return res.status(400).json({ 
        error: "Cannot cancel order that has been shipped or delivered" 
      });
    }

    // Update order status
    order.orderStatus = "cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason || "Cancelled by customer";

    await order.save();

    // Cancel order in Shiprocket if it exists
    if (order.shiprocketOrderId) {
      try {
        await shiprocketService.cancelOrder(order.shiprocketOrderId);
        console.log(`Order ${order.orderNumber} cancelled in Shiprocket`);
      } catch (shiprocketError) {
        console.error('Failed to cancel order in Shiprocket:', shiprocketError.message);
        // Order is still cancelled in our system
      }
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
  getOrderTracking,
  cancelOrder,
};