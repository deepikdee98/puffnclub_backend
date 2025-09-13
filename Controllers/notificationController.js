const Notification = require("../Models/notification");
const User = require("../Models/user");

// Get all notifications for admin
const getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      filter = "all", // all, read, unread
      type = "all", // all, order, payment, stock, system, info
      priority = "all", // all, high, medium, low
      sort = "createdAt",
      order = "desc",
    } = req.query;

    // Build query
    let query = {};

    // Add recipient filter (admin user)
    const adminUser = await User.findOne({ role: "admin" });
    if (adminUser) {
      query.recipient = adminUser._id;
    }

    // Filter by read status
    if (filter === "read") query.read = true;
    if (filter === "unread") query.read = false;

    // Filter by type
    if (type !== "all") query.type = type;

    // Filter by priority
    if (priority !== "all") query.priority = priority;

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get notifications
    const notifications = await Notification.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("createdBy", "name email")
      .populate("relatedId");

    // Get total count
    const total = await Notification.countDocuments(query);

    // Get unread count
    const unreadCount = await Notification.getUnreadCount(adminUser?._id);

    // Format response
    const formattedNotifications = notifications.map((notification) =>
      notification.toAPIResponse()
    );

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

// Create new notification
const createNotification = async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      priority = "medium",
      actionUrl,
      relatedId,
      relatedModel,
    } = req.body;

    // Validate required fields
    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Type, title, and message are required",
      });
    }

    // Get admin user as recipient
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found",
      });
    }

    // Create notification
    const notificationData = {
      type,
      title,
      message,
      priority,
      actionUrl,
      relatedId,
      relatedModel,
      recipient: adminUser._id,
      createdBy: req.user?.id,
    };

    const notification = await Notification.createNotification(
      notificationData
    );

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: notification.toAPIResponse(),
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create notification",
      error: error.message,
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Get admin user
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found",
      });
    }

    const notification = await Notification.markAsRead(id, adminUser._id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
      data: notification.toAPIResponse(),
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    // Get admin user
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found",
      });
    }

    const result = await Notification.markAllAsRead(adminUser._id);

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // Get admin user
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found",
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: adminUser._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    // Get admin user
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found",
      });
    }

    const stats = await Notification.aggregate([
      { $match: { recipient: adminUser._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ["$priority", "medium"] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ["$priority", "low"] }, 1, 0] } },
        },
      },
    ]);

    const typeStats = await Notification.aggregate([
      { $match: { recipient: adminUser._id } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total: 0,
          unread: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        byType: typeStats,
      },
    });
  } catch (error) {
    console.error("Get notification stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notification statistics",
      error: error.message,
    });
  }
};

// Helper function to create system notifications
const createSystemNotification = async (type, title, message, options = {}) => {
  try {
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) return null;

    const notificationData = {
      type,
      title,
      message,
      priority: options.priority || "medium",
      actionUrl: options.actionUrl,
      relatedId: options.relatedId,
      relatedModel: options.relatedModel,
      recipient: adminUser._id,
    };

    return await Notification.createNotification(notificationData);
  } catch (error) {
    console.error("Create system notification error:", error);
    return null;
  }
};

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  createSystemNotification,
};
