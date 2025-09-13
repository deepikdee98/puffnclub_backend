const express = require("express");
const router = express.Router();
const {
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
} = require("../Controllers/messageController");
const { authenticateAdmin } = require("../Middleware/authMiddleware");

// Public endpoint for receiving customer messages
router.post("/receive", receiveCustomerMessage);

// Apply admin authentication to all other routes
router.use(authenticateAdmin);

// GET /api/messages - Get all messages with filtering and pagination
router.get("/", getMessages);

// GET /api/messages/stats - Get message statistics
router.get("/stats", getMessageStats);

// GET /api/messages/:id - Get specific message with replies
router.get("/:id", getMessage);

// POST /api/messages - Create new message (admin to customer)
router.post("/", createMessage);

// POST /api/messages/:id/reply - Reply to a message
router.post("/:id/reply", replyToMessage);

// PUT /api/messages/:id/read - Mark specific message as read
router.put("/:id/read", markAsRead);

// PUT /api/messages/read-all - Mark all messages as read
router.put("/read-all", markAllAsRead);

// PUT /api/messages/:id/status - Update message status
router.put("/:id/status", updateMessageStatus);

// DELETE /api/messages/:id - Delete specific message
router.delete("/:id", deleteMessage);

module.exports = router;
