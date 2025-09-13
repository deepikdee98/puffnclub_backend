const express = require("express");
const router = express.Router();
const {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
} = require("../Controllers/notificationController");
const { authenticateAdmin } = require("../Middleware/authMiddleware");

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// GET /api/notifications - Get all notifications with filtering and pagination
router.get("/", getNotifications);

// GET /api/notifications/stats - Get notification statistics
router.get("/stats", getNotificationStats);

// POST /api/notifications - Create new notification
router.post("/", createNotification);

// PUT /api/notifications/:id/read - Mark specific notification as read
router.put("/:id/read", markAsRead);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put("/read-all", markAllAsRead);

// DELETE /api/notifications/:id - Delete specific notification
router.delete("/:id", deleteNotification);

module.exports = router;
