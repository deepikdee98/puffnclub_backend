const Message = require("../Models/message");
const User = require("../Models/user");
const { createSystemNotification } = require("./notificationController");

// Get all messages for admin
const getMessages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      filter = "all", // all, read, unread
      category = "all", // all, support, order, product, general, complaint
      priority = "all", // all, high, medium, low
      status = "all", // all, open, in_progress, resolved, closed
      search = "",
      sort = "createdAt",
      order = "desc",
    } = req.query;

    // Build query for main messages (not replies)
    let query = { parentMessage: null };

    // Filter by read status
    if (filter === "read") query.read = true;
    if (filter === "unread") query.read = false;

    // Filter by category
    if (category !== "all") query.category = category;

    // Filter by priority
    if (priority !== "all") query.priority = priority;

    // Filter by status
    if (status !== "all") query.status = status;

    // Search functionality
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { "sender.name": { $regex: search, $options: "i" } },
        { "sender.email": { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === "desc" ? -1 : 1;

    // Get messages with replies
    const result = await Message.getMessagesWithReplies(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortObj,
      populate: true,
    });

    // Get unread count
    const unreadCount = await Message.getUnreadCount("admin@puffnclub.com");

    // Format response
    const formattedMessages = result.messages.map((message) =>
      message.toAPIResponse()
    );

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: result.pagination,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

// Get single message with replies
const getMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id).populate({
      path: "replies",
      options: { sort: { createdAt: 1 } },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Mark as read if it's unread
    if (!message.read) {
      message.read = true;
      await message.save();
    }

    res.json({
      success: true,
      data: message.toAPIResponse(),
    });
  } catch (error) {
    console.error("Get message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch message",
      error: error.message,
    });
  }
};

// Create new message (from admin or system)
const createMessage = async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      subject,
      content,
      category = "general",
      priority = "medium",
      relatedOrder,
      relatedProduct,
      tags,
    } = req.body;

    // Validate required fields
    if (!recipientEmail || !subject || !content) {
      return res.status(400).json({
        success: false,
        message: "Recipient email, subject, and content are required",
      });
    }

    // Create message data
    const messageData = {
      sender: {
        name: "Admin Support",
        email: "admin@puffnclub.com",
        type: "admin",
      },
      recipient: {
        name: recipientName || "Customer",
        email: recipientEmail,
        type: "customer",
      },
      subject,
      content,
      category,
      priority,
      relatedOrder,
      relatedProduct,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        source: "web",
      },
    };

    const message = await Message.createMessage(messageData);

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message.toAPIResponse(),
    });
  } catch (error) {
    console.error("Create message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

// Reply to a message
const replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Reply content is required",
      });
    }

    // Get original message
    const originalMessage = await Message.findById(id);
    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: "Original message not found",
      });
    }

    // Create reply
    const replyData = {
      sender: {
        name: "Admin Support",
        email: "admin@puffnclub.com",
        type: "admin",
      },
      recipient: originalMessage.sender,
      subject: `Re: ${originalMessage.subject}`,
      content,
      category: originalMessage.category,
      priority: originalMessage.priority,
      parentMessage: originalMessage._id,
      relatedOrder: originalMessage.relatedOrder,
      relatedProduct: originalMessage.relatedProduct,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        source: "web",
      },
    };

    const reply = await Message.createMessage(replyData);

    // Update original message status
    originalMessage.status = "in_progress";
    await originalMessage.save();

    res.status(201).json({
      success: true,
      message: "Reply sent successfully",
      data: reply.toAPIResponse(),
    });
  } catch (error) {
    console.error("Reply to message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send reply",
      error: error.message,
    });
  }
};

// Mark message as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.markAsRead(id, "admin@puffnclub.com");

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.json({
      success: true,
      message: "Message marked as read",
      data: message.toAPIResponse(),
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
      error: error.message,
    });
  }
};

// Mark all messages as read
const markAllAsRead = async (req, res) => {
  try {
    const result = await Message.markAllAsRead("admin@puffnclub.com");

    res.json({
      success: true,
      message: `${result.modifiedCount} messages marked as read`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all messages as read",
      error: error.message,
    });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete message and its replies
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Delete replies first
    if (message.replies && message.replies.length > 0) {
      await Message.deleteMany({ _id: { $in: message.replies } });
    }

    // Delete main message
    await Message.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message,
    });
  }
};

// Update message status
const updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const message = await Message.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.json({
      success: true,
      message: "Message status updated successfully",
      data: message.toAPIResponse(),
    });
  } catch (error) {
    console.error("Update message status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update message status",
      error: error.message,
    });
  }
};

// Get message statistics
const getMessageStats = async (req, res) => {
  try {
    const stats = await Message.aggregate([
      { $match: { parentMessage: null } }, // Only main messages, not replies
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

    const categoryStats = await Message.aggregate([
      { $match: { parentMessage: null } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
        },
      },
    ]);

    const statusStats = await Message.aggregate([
      { $match: { parentMessage: null } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
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
        byCategory: categoryStats,
        byStatus: statusStats,
      },
    });
  } catch (error) {
    console.error("Get message stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch message statistics",
      error: error.message,
    });
  }
};

// Handle incoming customer message (webhook/API endpoint)
const receiveCustomerMessage = async (req, res) => {
  try {
    const {
      senderName,
      senderEmail,
      subject,
      content,
      category = "general",
      priority = "medium",
      relatedOrder,
      relatedProduct,
    } = req.body;

    // Validate required fields
    if (!senderName || !senderEmail || !subject || !content) {
      return res.status(400).json({
        success: false,
        message: "Sender name, email, subject, and content are required",
      });
    }

    // Create message data
    const messageData = {
      sender: {
        name: senderName,
        email: senderEmail,
        type: "customer",
      },
      recipient: {
        name: "Admin Support",
        email: "admin@puffnclub.com",
        type: "admin",
      },
      subject,
      content,
      category,
      priority,
      relatedOrder,
      relatedProduct,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        source: req.body.source || "api",
      },
    };

    const message = await Message.createMessage(messageData);

    // Create notification for admin
    await createSystemNotification(
      "info",
      "New Message Received",
      `New message from ${senderName}: ${subject}`,
      {
        priority: priority,
        actionUrl: `/admin/dashboard/messages/${message._id}`,
        relatedId: message._id,
        relatedModel: "Message",
      }
    );

    res.status(201).json({
      success: true,
      message: "Message received successfully",
      data: {
        messageId: message._id,
        status: "received",
      },
    });
  } catch (error) {
    console.error("Receive customer message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to receive message",
      error: error.message,
    });
  }
};

module.exports = {
  getMessages,
  getMessage,
  createMessage,
  replyToMessage,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  updateMessageStatus,
  getMessageStats,
  receiveCustomerMessage,
};
