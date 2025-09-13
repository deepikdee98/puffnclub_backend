const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      type: {
        type: String,
        enum: ["customer", "supplier", "admin", "system"],
        required: true,
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    recipient: {
      name: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      type: {
        type: String,
        enum: ["customer", "supplier", "admin", "system"],
        default: "admin",
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
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
    category: {
      type: String,
      enum: ["support", "order", "product", "general", "complaint"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String,
      },
    ],
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    relatedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    metadata: {
      ipAddress: String,
      userAgent: String,
      source: {
        type: String,
        enum: ["web", "email", "api", "system"],
        default: "web",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
messageSchema.index({ "sender.email": 1, createdAt: -1 });
messageSchema.index({ "recipient.email": 1, read: 1, createdAt: -1 });
messageSchema.index({ category: 1, status: 1, createdAt: -1 });
messageSchema.index({ priority: 1, read: 1 });
messageSchema.index({ parentMessage: 1 });
messageSchema.index({ relatedOrder: 1 });
messageSchema.index({ subject: "text", content: "text" });

// Virtual for reply count
messageSchema.virtual("replyCount").get(function () {
  return this.replies ? this.replies.length : 0;
});

// Static method to create message
messageSchema.statics.createMessage = async function (data) {
  try {
    const message = new this(data);
    await message.save();

    // If this is a reply, add it to parent's replies array
    if (data.parentMessage) {
      await this.findByIdAndUpdate(data.parentMessage, {
        $push: { replies: message._id },
      });
    }

    return message;
  } catch (error) {
    throw error;
  }
};

// Static method to mark as read
messageSchema.statics.markAsRead = async function (messageId, recipientEmail) {
  try {
    const result = await this.findOneAndUpdate(
      { _id: messageId, "recipient.email": recipientEmail },
      { read: true },
      { new: true }
    );
    return result;
  } catch (error) {
    throw error;
  }
};

// Static method to mark all as read
messageSchema.statics.markAllAsRead = async function (recipientEmail) {
  try {
    const result = await this.updateMany(
      { "recipient.email": recipientEmail, read: false },
      { read: true }
    );
    return result;
  } catch (error) {
    throw error;
  }
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = async function (recipientEmail) {
  try {
    const count = await this.countDocuments({
      "recipient.email": recipientEmail,
      read: false,
    });
    return count;
  } catch (error) {
    throw error;
  }
};

// Static method to get messages with replies
messageSchema.statics.getMessagesWithReplies = async function (
  query = {},
  options = {}
) {
  try {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      populate = true,
    } = options;

    const skip = (page - 1) * limit;

    let messagesQuery = this.find({ parentMessage: null, ...query })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (populate) {
      messagesQuery = messagesQuery.populate({
        path: "replies",
        options: { sort: { createdAt: 1 } },
      });
    }

    const messages = await messagesQuery.exec();
    const total = await this.countDocuments({ parentMessage: null, ...query });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw error;
  }
};

// Instance method to format for API response
messageSchema.methods.toAPIResponse = function () {
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
    sender: this.sender,
    recipient: this.recipient,
    subject: this.subject,
    content: this.content,
    read: this.read,
    priority: this.priority,
    category: this.category,
    status: this.status,
    timestamp: timeAgo(this.createdAt),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    replyCount: this.replyCount,
    replies: this.replies
      ? this.replies.map((reply) =>
          typeof reply === "object" && reply.toAPIResponse
            ? reply.toAPIResponse()
            : reply
        )
      : [],
    attachments: this.attachments,
    relatedOrder: this.relatedOrder,
    relatedProduct: this.relatedProduct,
    tags: this.tags,
  };
};

module.exports = mongoose.model("Message", messageSchema);
