const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title must not exceed 100 characters"],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [200, "Subtitle must not exceed 200 characters"],
      default: "",
    },
    buttonText: {
      type: String,
      trim: true,
      maxlength: [50, "Button text must not exceed 50 characters"],
      default: "",
    },
    buttonLink: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow empty values
          return /^https?:\/\/.+/.test(v);
        },
        message: "Please enter a valid URL",
      },
      default: "",
    },
    targetUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow empty values
          return /^https?:\/\/.+/.test(v);
        },
        message: "Please enter a valid URL",
      },
      default: "",
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
bannerSchema.index({ order: 1, isActive: 1 });
bannerSchema.index({ createdAt: -1 });

// Pre-save middleware to handle order assignment
bannerSchema.pre("save", async function (next) {
  if (this.isNew && !this.order) {
    try {
      const lastBanner = await this.constructor.findOne().sort({ order: -1 });
      this.order = lastBanner ? lastBanner.order + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to reorder banners
bannerSchema.statics.reorderBanners = async function (bannerOrders) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const { id, order } of bannerOrders) {
      await this.findByIdAndUpdate(id, { order }, { session });
    }
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Instance method to move banner up/down
bannerSchema.methods.moveOrder = async function (direction) {
  const currentOrder = this.order;
  const targetOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;

  // Find the banner to swap with
  const targetBanner = await this.constructor.findOne({ order: targetOrder });

  if (!targetBanner) {
    throw new Error("Cannot move banner in that direction");
  }

  // Swap orders
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await this.constructor.findByIdAndUpdate(
      this._id,
      { order: targetOrder },
      { session }
    );
    await this.constructor.findByIdAndUpdate(
      targetBanner._id,
      { order: currentOrder },
      { session }
    );

    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = mongoose.model("Banner", bannerSchema);
