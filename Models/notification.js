const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["order", "payment", "stock", "system", "info"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      // Can reference different models based on type
    },
    relatedModel: {
      type: String,
      enum: ["Order", "Product", "User", "Payment"],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, read: 1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
  try {
    const notification = new this(data);
    await notification.save();
    return notification;
  } catch (error) {
    throw error;
  }
};

// Static method to mark as read
notificationSchema.statics.markAsRead = async function (
  notificationId,
  userId
) {
  try {
    const result = await this.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true }
    );
    return result;
  } catch (error) {
    throw error;
  }
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function (userId) {
  try {
    const result = await this.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
    return result;
  } catch (error) {
    throw error;
  }
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  try {
    const count = await this.countDocuments({
      recipient: userId,
      read: false,
    });
    return count;
  } catch (error) {
    throw error;
  }
};

// Instance method to format for API response
notificationSchema.methods.toAPIResponse = function () {
  const timeAgo = (date) => {
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    if (diffInDays < 7)
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  };

  return {
    id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    read: this.read,
    priority: this.priority,
    actionUrl: this.actionUrl,
    timestamp: timeAgo(this.createdAt),
    createdAt: this.createdAt,
    relatedId: this.relatedId,
    relatedModel: this.relatedModel,
  };
};

module.exports = mongoose.model("Notification", notificationSchema);
