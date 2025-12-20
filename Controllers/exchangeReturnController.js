const ExchangeReturn = require("../Models/exchangeReturn");
const CustomerOrder = require("../Models/customerOrder");
const Product = require("../Models/productdetails");

// @desc    Submit exchange request
// @route   POST /api/website/orders/:orderId/exchange
// @access  Private
const submitExchangeRequest = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, size, color, reason } = req.body;
    const customerId = req.customer.id;

    // Validate input
    if (!productId || !size || !color) {
      return res.status(400).json({
        error: "Product ID, size, and color are required for exchange",
      });
    }

    // Find the order
    const order = await CustomerOrder.findOne({
      _id: orderId,
      customer: customerId,
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if order is delivered
    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        error: "Exchange can only be requested for delivered orders",
      });
    }

    // Check if order was delivered within exchange period (7 days)
    const EXCHANGE_PERIOD_DAYS = 7;
    if (order.deliveredAt) {
      const daysSinceDelivery = Math.floor(
        (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDelivery > EXCHANGE_PERIOD_DAYS) {
        return res.status(400).json({
          error: `Exchange can only be requested within ${EXCHANGE_PERIOD_DAYS} days of delivery`,
        });
      }
    }

    // Find the product item in the order
    const orderItem = order.items.find(
      (item) => item.product.toString() === productId
    );

    if (!orderItem) {
      return res.status(404).json({
        error: "Product not found in this order",
      });
    }

    // Check if product exists and new variant is available
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if requested size/color is available
    const variant = product.variants?.find(
      (v) => v.color === color && v.totalStock > 0
    );

    if (!variant) {
      return res.status(400).json({
        error: "Requested size/color combination is not available",
      });
    }

    // Check if exchange request already exists for this order item
    const existingRequest = await ExchangeReturn.findOne({
      order: orderId,
      customer: customerId,
      "orderItem.productId": productId,
      type: "exchange",
      status: { $in: ["pending", "approved", "processing"] },
    });

    if (existingRequest) {
      return res.status(400).json({
        error: "An exchange request already exists for this product",
      });
    }

    // Create exchange request
    const exchangeRequest = new ExchangeReturn({
      order: orderId,
      customer: customerId,
      product: productId,
      orderItem: {
        productId: orderItem.product,
        productName: orderItem.productName,
        quantity: orderItem.quantity,
        size: orderItem.size,
        color: orderItem.color,
        price: orderItem.price,
      },
      type: "exchange",
      status: "pending",
      exchangeDetails: {
        requestedSize: size,
        requestedColor: color,
        reason: reason || "Size/Color exchange",
      },
      reason: reason || "Size/Color exchange",
      pickupAddress: order.shippingAddress,
    });

    await exchangeRequest.save();

    res.status(201).json({
      message: "Exchange request submitted successfully",
      request: exchangeRequest,
    });
  } catch (error) {
    console.error("Submit exchange request error:", error);
    res.status(500).json({
      error: "Failed to submit exchange request",
      details: error.message,
    });
  }
};

// @desc    Submit return request
// @route   POST /api/website/orders/:orderId/return
// @access  Private
const submitReturnRequest = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, reason, refundMethod } = req.body;
    const customerId = req.customer.id;

    // Validate input
    if (!productId) {
      return res.status(400).json({
        error: "Product ID is required for return",
      });
    }

    // Find the order
    const order = await CustomerOrder.findOne({
      _id: orderId,
      customer: customerId,
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if order is delivered
    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        error: "Return can only be requested for delivered orders",
      });
    }

    // Check if order was delivered within return period (7 days)
    const RETURN_PERIOD_DAYS = 7;
    if (order.deliveredAt) {
      const daysSinceDelivery = Math.floor(
        (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDelivery > RETURN_PERIOD_DAYS) {
        return res.status(400).json({
          error: `Return can only be requested within ${RETURN_PERIOD_DAYS} days of delivery`,
        });
      }
    }

    // Find the product item in the order
    const orderItem = order.items.find(
      (item) => item.product.toString() === productId
    );

    if (!orderItem) {
      return res.status(404).json({
        error: "Product not found in this order",
      });
    }

    // Check if return request already exists for this order item
    const existingRequest = await ExchangeReturn.findOne({
      order: orderId,
      customer: customerId,
      "orderItem.productId": productId,
      type: "return",
      status: { $in: ["pending", "approved", "processing"] },
    });

    if (existingRequest) {
      return res.status(400).json({
        error: "A return request already exists for this product",
      });
    }

    // Create return request
    const returnRequest = new ExchangeReturn({
      order: orderId,
      customer: customerId,
      product: productId,
      orderItem: {
        productId: orderItem.product,
        productName: orderItem.productName,
        quantity: orderItem.quantity,
        size: orderItem.size,
        color: orderItem.color,
        price: orderItem.price,
      },
      type: "return",
      status: "pending",
      returnDetails: {
        reason: reason || "Product return",
        refundMethod: refundMethod || "original_payment",
      },
      reason: reason || "Product return",
      refundAmount: orderItem.total,
      refundStatus: "pending",
      pickupAddress: order.shippingAddress,
    });

    await returnRequest.save();

    res.status(201).json({
      message: "Return request submitted successfully",
      request: returnRequest,
    });
  } catch (error) {
    console.error("Submit return request error:", error);
    res.status(500).json({
      error: "Failed to submit return request",
      details: error.message,
    });
  }
};

// @desc    Get exchange/return requests for customer
// @route   GET /api/website/exchange-returns
// @access  Private
const getCustomerRequests = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const { type, status } = req.query;

    const filter = { customer: customerId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const requests = await ExchangeReturn.find(filter)
      .populate("order", "orderNumber orderStatus deliveredAt")
      .populate("product", "name images")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get exchange/return requests error:", error);
    res.status(500).json({
      error: "Failed to get requests",
      details: error.message,
    });
  }
};

// @desc    Get single exchange/return request
// @route   GET /api/website/exchange-returns/:requestId
// @access  Private
const getRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const customerId = req.customer.id;

    const request = await ExchangeReturn.findOne({
      _id: requestId,
      customer: customerId,
    })
      .populate("order", "orderNumber orderStatus deliveredAt")
      .populate("product", "name images")
      .populate("exchangeOrder", "orderNumber orderStatus");

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json({
      success: true,
      request,
    });
  } catch (error) {
    console.error("Get request by ID error:", error);
    res.status(500).json({
      error: "Failed to get request",
      details: error.message,
    });
  }
};

// @desc    Cancel exchange/return request
// @route   PUT /api/website/exchange-returns/:requestId/cancel
// @access  Private
const cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const customerId = req.customer.id;

    const request = await ExchangeReturn.findOne({
      _id: requestId,
      customer: customerId,
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Only allow cancellation if request is pending
    if (request.status !== "pending") {
      return res.status(400).json({
        error: "Only pending requests can be cancelled",
      });
    }

    request.status = "cancelled";
    request.cancelledAt = new Date();
    await request.save();

    res.json({
      message: "Request cancelled successfully",
      request,
    });
  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({
      error: "Failed to cancel request",
      details: error.message,
    });
  }
};

module.exports = {
  submitExchangeRequest,
  submitReturnRequest,
  getCustomerRequests,
  getRequestById,
  cancelRequest,
};


