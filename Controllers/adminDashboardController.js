const asyncHandler = require("express-async-handler");
const Order = require("../Models/order");
const Product = require("../Models/productdetails");

// Get top products by sales count within the last week
const getTopProducts = asyncHandler(async (req, res) => {
  try {
    // Calculate date range for the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get the limit from query params (default to 5)
    const limit = parseInt(req.query.limit) || 5;

    // Aggregate orders from the last week to find top products
    const topProductsAggregation = await Order.aggregate([
      // Match orders from the last week
      {
        $match: {
          createdAt: { $gte: oneWeekAgo },
          status: { $nin: ["Cancelled"] }, // Exclude cancelled orders
        },
      },
      // Unwind the items array to process each item separately
      {
        $unwind: "$items",
      },
      // Group by product and sum the quantities
      {
        $group: {
          _id: "$items.product",
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
          orderCount: { $sum: 1 },
        },
      },
      // Sort by total quantity sold (descending)
      {
        $sort: { totalQuantitySold: -1 },
      },
      // Limit to top N products
      {
        $limit: limit,
      },
      // Lookup product details
      {
        $lookup: {
          from: "productdetails",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      // Unwind product details
      {
        $unwind: {
          path: "$productDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project the final structure
      {
        $project: {
          _id: "$_id",
          name: "$productDetails.name",
          category: "$productDetails.category",
          price: "$productDetails.price",
          images: {
            $ifNull: ["$productDetails.images", []],
          },
          image: {
            $ifNull: [{ $arrayElemAt: ["$productDetails.images", 0] }, null],
          },
          sales: "$totalQuantitySold",
          revenue: "$totalRevenue",
          orderCount: "$orderCount",
          stock: {
            $ifNull: ["$productDetails.stockQuantity", 0],
          },
          brand: "$productDetails.brand",
          color: "$productDetails.color",
          sku: "$productDetails.sku",
        },
      },
    ]);

    // If no products found in the last week, fall back to all-time top products
    if (topProductsAggregation.length === 0) {
      console.log(
        "No products sold in the last week, falling back to all-time data"
      );
      const fallbackProducts = await Product.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("name category price images stockQuantity brand color sku")
        .lean();

      // Format fallback data to match expected structure
      const formattedFallback = fallbackProducts.map((product) => ({
        _id: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        images: product.images || [],
        image: product.images?.[0] || null,
        sales: 0, // No actual sales data for fallback
        revenue: 0,
        orderCount: 0,
        stock: product.stockQuantity || 0,
        brand: product.brand,
        color: product.color,
        sku: product.sku,
        image:
          product.images && product.images.length > 0
            ? `http://localhost:8080/${product.images[0]}`
            : null,
        images: product.images
          ? product.images.map((img) => `http://localhost:8080/${img}`)
          : [],
      }));

      return res.json(formattedFallback);
    }

    res.json(topProductsAggregation);
  } catch (err) {
    console.error("Error fetching top products:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get recent orders
const getRecentOrders = asyncHandler(async (req, res) => {
  try {
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name email")
      .select("orderNumber total status createdAt");
    res.json(recentOrders);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get order details by orderId

const getOrderDetails = asyncHandler(async (req, res) => {
  const orderId = req.params.id || req.params.orderId;
  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  try {
    const order = await Order.findOne({ orderNumber: orderId })
      .populate({
        path: "user",
        select: "name email phone shippingAddress billingAddress",
      })
      .populate({
        path: "items.product",
        select: "name sku size color price images",
      });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Build order items
    const orderItems = order.items.map((item) => ({
      product: {
        name: item.product?.name || "",
        image: item.product?.images?.[0] || "",
      },
      sku: item.product?.sku || "",
      quantity: item.quantity,
      colour: item.color || "",
      size: item.size || "",
      price: item.product?.price || 0,
      total: item.product
        ? (item.product.price * item.quantity).toFixed(2)
        : "0.00",
    }));

    // Customer info
    const customer = {
      name: order.user?.name || "",
      email: order.user?.email || "",
      phone: order.user?.phone || "",
    };

    const shippingAddress = order.user?.shippingAddress || {};
    const billingAddress = order.user?.billingAddress || {};

    const orderSummary = {
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      orderDate: order.createdAt,
    };

    // Total calculation
    const orderTotal = orderItems.reduce((sum, item) => {
      return sum + parseFloat(item.total);
    }, 0);

    const ordersTotal = {
      Total: orderTotal.toFixed(2),
    };

    // Payment info
    let paymentTypeDisplay = order.paymentTypeDisplay || "N/A";

    if (!order.paymentTypeDisplay && order.paymentMethod) {
      if (order.paymentMethod === "Debit Card" && order.cardLast4) {
        paymentTypeDisplay = `Debit Card (XXXX XXXX XXXX ${order.cardLast4})`;
      } else {
        paymentTypeDisplay =
          order.paymentMethod.charAt(0).toUpperCase() +
          order.paymentMethod.slice(1);
      }
    }

    const paymentInfo = {
      method: paymentTypeDisplay,
      status: order.paymentStatus || "",
    };

    // Build timeline
    const timeline = [];

    timeline.push({
      status: "Order Placed",
      date: order.createdAt,
    });
    switch (order.paymentStatus) {
      case "Paid":
        timeline.push({
          status: "Payment Confirmed",
          date: order.updatedAt,
        });
        break;
      case "Pending":
        timeline.push({
          status: "Payment Pending",
          date: order.updatedAt,
        });
        break;
      case "Failed":
        timeline.push({
          status: "Payment Failed",
          date: order.updatedAt,
        });
        break;
      case "Refunded":
        timeline.push({
          status: "Payment Refunded",
          date: order.updatedAt,
        });
        break;
      default:
        break;
    }

    // Add order status if it's not Pending
    if (order.status && order.status !== "Pending") {
      timeline.push({
        status: order.status,
        date: order.updatedAt,
      });
    }

    res.status(200).json({
      success: true,
      orderId: order._id,
      orderItems,
      customer,
      shippingAddress,
      billingAddress,
      orderSummary,
      paymentInfo,
      ordersTotal,
      timeline,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get dashboard metrics
const getMetrics = asyncHandler(async (req, res) => {
  try {
    // Calculate date ranges
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastWeekStart = new Date(
      weekStart.getTime() - 7 * 24 * 60 * 60 * 1000
    );

    // Revenue calculations
    const todayRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart },
          status: { $nin: ["Cancelled"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const weekRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: weekStart },
          status: { $nin: ["Cancelled"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const monthRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart },
          status: { $nin: ["Cancelled"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const lastWeekRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: lastWeekStart, $lt: weekStart },
          status: { $nin: ["Cancelled"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // Order counts
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "Pending" });
    const processingOrders = await Order.countDocuments({
      status: "Processing",
    });
    const completedOrders = await Order.countDocuments({
      status: { $in: ["Completed", "Delivered"] },
    });
    const cancelledOrders = await Order.countDocuments({ status: "Cancelled" });

    const weekOrders = await Order.countDocuments({
      createdAt: { $gte: weekStart },
    });
    const lastWeekOrders = await Order.countDocuments({
      createdAt: { $gte: lastWeekStart, $lt: weekStart },
    });

    // Customer counts (unique customers who have placed orders)
    const totalCustomers = await Order.distinct("user").then(
      (users) => users.length
    );
    const weekCustomers = await Order.distinct("user", {
      createdAt: { $gte: weekStart },
    }).then((users) => users.length);

    // Product counts
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: "active" });
    const inactiveProducts = await Product.countDocuments({
      status: "inactive",
    });
    const lowStockProducts = await Product.countDocuments({
      stock: { $lte: 10 },
    });

    // Calculate growth percentages
    const revenueGrowth = lastWeekRevenue[0]?.total
      ? (((weekRevenue[0]?.total || 0) - lastWeekRevenue[0].total) /
          lastWeekRevenue[0].total) *
        100
      : 0;

    const ordersGrowth = lastWeekOrders
      ? ((weekOrders - lastWeekOrders) / lastWeekOrders) * 100
      : 0;

    const metrics = {
      revenue: {
        today: todayRevenue[0]?.total || 0,
        week: weekRevenue[0]?.total || 0,
        month: monthRevenue[0]?.total || 0,
        growth: Math.round(revenueGrowth * 100) / 100,
        trend: revenueGrowth >= 0 ? "up" : "down",
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        growth: Math.round(ordersGrowth * 100) / 100,
        trend: ordersGrowth >= 0 ? "up" : "down",
      },
      customers: {
        total: totalCustomers,
        new: weekCustomers,
        returning: Math.max(0, totalCustomers - weekCustomers),
        growth: 0, // Would need more complex calculation
        trend: "up",
      },
      products: {
        total: totalProducts,
        active: activeProducts || totalProducts,
        inactive: inactiveProducts || 0,
        lowStock: lowStockProducts,
        growth: 0, // Would need historical data
        trend: "up",
      },
    };

    res.json(metrics);
  } catch (err) {
    console.error("Error fetching metrics:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get sales chart data
const getSalesChart = asyncHandler(async (req, res) => {
  try {
    const period = req.query.period || '6months';
    const now = new Date();
    let startDate;
    let groupBy;
    
    // Determine date range and grouping based on period
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = { $dayOfYear: "$createdAt" };
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = { $dayOfMonth: "$createdAt" };
        break;
      case '6months':
      default:
        startDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
        groupBy = { $month: "$createdAt" };
        break;
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $nin: ["Cancelled"] }
        }
      },
      {
        $group: {
          _id: groupBy,
          sales: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // Format data for chart
    const labels = [];
    const data = [];
    
    if (period === '6months') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 0; i < 6; i++) {
        const monthIndex = (now.getMonth() - 5 + i + 12) % 12;
        labels.push(months[monthIndex]);
        const monthData = salesData.find(item => item._id === monthIndex + 1);
        data.push(monthData ? monthData.sales : 0);
      }
    } else {
      // For daily data, create a more detailed response
      salesData.forEach(item => {
        labels.push(item._id.toString());
        data.push(item.sales);
      });
    }

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Sales',
          data,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
        }
      ]
    };

    res.json(chartData);
  } catch (err) {
    console.error("Error fetching sales chart:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get recent activity
const getRecentActivity = asyncHandler(async (req, res) => {
  try {
    const activities = [];
    
    // Get recent orders
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .select('orderNumber createdAt status');
    
    recentOrders.forEach(order => {
      activities.push({
        id: order._id.toString(),
        type: 'order',
        message: `New order ${order.orderNumber} received`,
        time: getTimeAgo(order.createdAt),
        icon: 'shopping-cart'
      });
    });

    // Get recently added products
    const recentProducts = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(2)
      .select('name createdAt');
    
    recentProducts.forEach(product => {
      activities.push({
        id: product._id.toString(),
        type: 'product',
        message: `Product '${product.name}' updated`,
        time: getTimeAgo(product.createdAt),
        icon: 'package'
      });
    });

    // Sort all activities by time (most recent first)
    activities.sort((a, b) => {
      // This is a simple sort, in a real app you'd want to sort by actual timestamp
      return 0;
    });

    res.json(activities.slice(0, 5)); // Return top 5 activities
  } catch (err) {
    console.error("Error fetching recent activity:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
}

module.exports = {
  getTopProducts,
  getRecentOrders,
  getOrderDetails,
  getMetrics,
  getSalesChart,
  getRecentActivity,
};
