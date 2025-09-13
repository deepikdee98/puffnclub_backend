const Order = require("../Models/order");
const Card = require("../Models/cardDetails");
const Product = require("../Models/productdetails");

const createOrder = async (req, res) => {
  try {
    const { user, items, status, cardDetails } = req.body;

    if (!user || !items || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Missing required fields: user, items" });
    }

    let calculatedTotal = 0;

    for (const item of items) {
      //  Always look up the actual price
      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({ error: `Product not found: ${item.product}` });
      }

      const unitPrice = product.price;
      const lineTotal = unitPrice * item.quantity;

      calculatedTotal += lineTotal;

      // Add real unit price and line total back to the item
      item.price = unitPrice;
      item.total = lineTotal.toFixed(2);
    }

    //  Auto-increment order number
    const lastOrder = await Order.findOne().sort({ createdAt: -1 });
    let orderNumber = "ORD-1001";
    if (lastOrder?.orderNumber) {
      const lastNumber = parseInt(lastOrder.orderNumber.split("-")[1], 10);
      orderNumber = `ORD-${lastNumber + 1}`;
    }

    // Payment processing (unchanged)
    let cardId = null;
    let paymentTypeDisplay = "Cash On Delivery";
    let resolvedPaymentStatus = "Pending";

    if (cardDetails) {
      if (!cardDetails.userId) cardDetails.userId = user;

      if (["DebitCard", "CreditCard"].includes(cardDetails.paymentType)) {
        const requiredFields = [
          "cardNumber",
          "cardHolderName",
          "expiryMonth",
          "expiryYear",
          "cvv",
        ];
        for (const field of requiredFields) {
          if (!cardDetails[field]) {
            return res
              .status(400)
              .json({ error: `Missing required field: ${field}` });
          }
        }

        const cardData = { ...cardDetails };
        delete cardData.cvv;

        const card = new Card(cardData);
        await card.save();
        cardId = card._id;

        const last4 = cardDetails.cardNumber.slice(-4);
        paymentTypeDisplay = `${cardDetails.paymentType
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) =>
            str.toUpperCase()
          )} (XXXX XXXX XXXX ${last4})`;

        resolvedPaymentStatus = "Paid";
      } else if (cardDetails.paymentType === "cashOnDelivery") {
        const cardData = {
          userId: cardDetails.userId,
          paymentType: "cashOnDelivery",
          cardHolderName: cardDetails.cardHolderName || "",
          cardNumber: "",
          expiryMonth: "",
          expiryYear: "",
          cvv: "",
        };
        const card = new Card(cardData);
        await card.save();
        cardId = card._id;
        paymentTypeDisplay = "Cash On Delivery";
      } else if (cardDetails.paymentType === "Upi") {
        if (!cardDetails.cardHolderName) {
          return res
            .status(400)
            .json({ error: "Missing UPI ID (cardHolderName)" });
        }
        const cardData = {
          userId: cardDetails.userId,
          paymentType: "Upi",
          cardHolderName: cardDetails.cardHolderName,
          cardNumber: "",
          expiryMonth: "",
          expiryYear: "",
          cvv: "",
        };
        const card = new Card(cardData);
        await card.save();
        cardId = card._id;
        paymentTypeDisplay = `UPI (${cardDetails.cardHolderName})`;
        resolvedPaymentStatus = "Paid";
      }
    }

    const order = new Order({
      orderNumber,
      user,
      items,
      total: calculatedTotal.toFixed(2),

      paymentStatus: resolvedPaymentStatus,
      card: cardId,
      paymentTypeDisplay,
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: order._id,
      orderNumber: order.orderNumber,
      calculatedTotal: calculatedTotal.toFixed(2),
      items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

//  Get all orders with enhanced features
const getAllOrders = async (req, res) => {
  try {
    // Extract query parameters for filtering and pagination
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      startDate,
      endDate,
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build aggregation pipeline for search functionality
    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $lookup: {
          from: "productdetails",
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $addFields: {
          user: { $arrayElemAt: ["$userDetails", 0] },
          itemsWithProducts: {
            $map: {
              input: "$items",
              as: "item",
              in: {
                $mergeObjects: [
                  "$$item",
                  {
                    productDetails: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$productDetails",
                            cond: { $eq: ["$$this._id", "$$item.product"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          orderNumber: 1,
          user: {
            _id: 1,
            name: 1,
            email: 1,
          },
          items: "$itemsWithProducts",
          total: 1,
          status: 1,
          paymentStatus: 1,
          paymentTypeDisplay: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    // Add search functionality after lookup
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { orderNumber: { $regex: search, $options: "i" } },
            { "user.name": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: sort },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    // Execute aggregation
    const orders = await Order.aggregate(pipeline);

    // Get total count for pagination
    const totalCountPipeline = [{ $match: filter }];

    if (search) {
      totalCountPipeline.push(
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $addFields: {
            user: { $arrayElemAt: ["$userDetails", 0] },
          },
        },
        {
          $match: {
            $or: [
              { orderNumber: { $regex: search, $options: "i" } },
              { "user.name": { $regex: search, $options: "i" } },
              { "user.email": { $regex: search, $options: "i" } },
            ],
          },
        }
      );
    }

    totalCountPipeline.push({ $count: "total" });
    const totalResult = await Order.aggregate(totalCountPipeline);
    const totalOrders = totalResult[0]?.total || 0;

    // Calculate pagination info
    const totalPages = Math.ceil(totalOrders / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Get order statistics
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          pendingOrders: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$status", "Pending"] },
                    { $eq: ["$paymentStatus", "Pending"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          completedOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalOrders,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit),
        },
        statistics: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          completedOrders: 0,
        },
        filters: {
          status,
          paymentStatus,
          search,
          startDate,
          endDate,
          sortBy,
          sortOrder,
        },
      },
    });
  } catch (err) {
    console.error("Get all orders error:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

//  Get single order by ID with detailed information
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching order by ID:", id);

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const order = await Order.findById(id)
      .populate({
        path: "user",
        select: "name email phone shippingAddress billingAddress role",
      })
      .populate({
        path: "items.product",
        select:
          "name sku price images color availableSizes brand category description",
      })
      .populate({
        path: "card",
        select: "paymentType cardHolderName cardNumber",
      });

    if (!order) {
      console.log("Order not found for ID:", id);
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("Order found:", order.orderNumber);
    console.log("Order user:", order.user);
    console.log("Order items count:", order.items.length);

    // Transform the order data to include product details in items
    const transformedOrder = {
      _id: order._id,
      orderNumber: order.orderNumber,
      user: order.user,
      items: order.items.map((item) => {
        console.log(
          "Processing item:",
          item.product?.name || "Unknown product"
        );
        return {
          _id: item._id,
          product: item.product?._id,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
          imageUrl:
            item.imageUrl ||
            (item.product?.images?.[0]
              ? `/uploads/${item.product.images[0].split("/").pop()}`
              : null),
          total: item.total,
          productDetails: item.product
            ? {
                _id: item.product._id,
                name: item.product.name,
                sku: item.product.sku,
                price: item.product.price,
                images:
                  item.product.images?.map((imagePath) => {
                    // Convert full path to just filename
                    const filename = imagePath.split("/").pop();
                    return `/uploads/${filename}`;
                  }) || [],
                color: item.product.color,
                availableSizes: item.product.availableSizes,
                brand: item.product.brand,
                category: item.product.category,
                description: item.product.description,
              }
            : null,
        };
      }),
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentTypeDisplay: order.paymentTypeDisplay,
      card: order.card,
      // Ensure address fields are properly returned - fallback to user addresses if order addresses are incomplete
      shippingAddress:
        order.shippingAddress && order.shippingAddress.name
          ? order.shippingAddress
          : order.user?.shippingAddress || order.shippingAddress,
      billingAddress:
        order.billingAddress && order.billingAddress.name
          ? order.billingAddress
          : order.user?.billingAddress || order.billingAddress,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    console.log(
      "Transformed order items:",
      transformedOrder.items.map((item) => ({
        name: item.productDetails?.name,
        hasProduct: !!item.productDetails,
      }))
    );

    res.status(200).json({ success: true, order: transformedOrder });
  } catch (err) {
    console.error("Error in getOrderById:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

//  Get all orders for a user
const getOrdersByUserId = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId }).select(
      "orderNumber user items total status paymentStatus createdAt"
    );
    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

//  Get order by order number with detailed information
const getOrderByOrderNumber = async (req, res) => {
  try {
    console.log("Fetching order by order number:", req.params.orderNumber);

    const order = await Order.findOne({
      orderNumber: req.params.orderNumber,
    })
      .populate({
        path: "user",
        select: "name email phone shippingAddress billingAddress role",
      })
      .populate({
        path: "items.product",
        select:
          "name sku price images color availableSizes brand category description",
      })
      .populate({
        path: "card",
        select: "paymentType cardHolderName cardNumber",
      });

    if (!order) {
      console.log("Order not found for order number:", req.params.orderNumber);
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    console.log("Order found:", order.orderNumber);
    console.log("Order user:", order.user);
    console.log("Order items count:", order.items.length);

    // Transform the order data to include product details in items
    const transformedOrder = {
      _id: order._id,
      orderNumber: order.orderNumber,
      user: order.user,
      items: order.items.map((item) => {
        console.log(
          "Processing item:",
          item.product?.name || "Unknown product"
        );
        return {
          _id: item._id,
          product: item.product?._id,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
          imageUrl:
            item.imageUrl ||
            (item.product?.images?.[0]
              ? `/uploads/${item.product.images[0].split("/").pop()}`
              : null),
          total: item.total,
          productDetails: item.product
            ? {
                _id: item.product._id,
                name: item.product.name,
                sku: item.product.sku,
                price: item.product.price,
                images:
                  item.product.images?.map((imagePath) => {
                    // Convert full path to just filename
                    const filename = imagePath.split("/").pop();
                    return `/uploads/${filename}`;
                  }) || [],
                color: item.product.color,
                availableSizes: item.product.availableSizes,
                brand: item.product.brand,
                category: item.product.category,
                description: item.product.description,
              }
            : null,
        };
      }),
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentTypeDisplay: order.paymentTypeDisplay,
      card: order.card,
      // Ensure address fields are properly returned - fallback to user addresses if order addresses are incomplete
      shippingAddress:
        order.shippingAddress && order.shippingAddress.name
          ? order.shippingAddress
          : order.user?.shippingAddress || order.shippingAddress,
      billingAddress:
        order.billingAddress && order.billingAddress.name
          ? order.billingAddress
          : order.user?.billingAddress || order.billingAddress,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    console.log(
      "Transformed order items:",
      transformedOrder.items.map((item) => ({
        name: item.productDetails?.name,
        hasProduct: !!item.productDetails,
      }))
    );

    res.status(200).json({ success: true, order: transformedOrder });
  } catch (err) {
    console.error("Error in getOrderByOrderNumber:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

//get Pending orders

const getPendingOrders = async (req, res) => {
  try {
    const pendingOrders = await Order.find({
      $or: [{ status: "Pending" }, { paymentStatus: "Pending" }],
    })
      .populate("user", "name email")
      .select("orderNumber user items total status paymentStatus createdAt");

    res.status(200).json({
      success: true,
      count: pendingOrders.length,
      orders: pendingOrders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error: " + error.message });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const order = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("user", "name email");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
};

// Get orders by status
const getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const orders = await Order.find({ status })
      .populate("user", "name email")
      .select("orderNumber user items total status paymentStatus createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
};

// Delete order (admin only)
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
};

// Debug function to check order data structure
const debugOrderData = async (req, res) => {
  try {
    console.log("Debug: Fetching sample order data...");

    // Get the first order without any population
    const rawOrder = await Order.findOne().limit(1);
    console.log("Raw order data:", JSON.stringify(rawOrder, null, 2));

    // Get the first order with population
    const populatedOrder = await Order.findOne()
      .populate({
        path: "user",
        select: "name email phone shippingAddress billingAddress role",
      })
      .populate({
        path: "items.product",
        select:
          "name sku price images color availableSizes brand category description",
      })
      .limit(1);
    console.log(
      "Populated order data:",
      JSON.stringify(populatedOrder, null, 2)
    );

    // Check if we have any orders at all
    const orderCount = await Order.countDocuments();
    console.log("Total orders in database:", orderCount);

    // Check if we have any products
    const Product = require("../Models/productdetails");
    const productCount = await Product.countDocuments();
    console.log("Total products in database:", productCount);

    // Check if we have any users
    const User = require("../Models/user");
    const userCount = await User.countDocuments();
    console.log("Total users in database:", userCount);

    res.status(200).json({
      success: true,
      debug: {
        orderCount,
        productCount,
        userCount,
        rawOrder,
        populatedOrder,
      },
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: "Debug error: " + err.message });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  getOrderByOrderNumber,
  getPendingOrders,
  updateOrderStatus,
  getOrdersByStatus,
  deleteOrder,
  debugOrderData,
};
