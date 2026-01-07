const asyncHandler = require("express-async-handler");
const Banner = require("../Models/banner");
const fs = require("fs");
const path = require("path");

// Get all banners
const getBanners = asyncHandler(async (req, res) => {
  try {
    const { status, limit, page = 1 } = req.query;

    // Build query
    let query = {};
    if (status !== undefined) {
      query.isActive = status === "active";
    }

    // Calculate pagination
    const pageSize = limit ? parseInt(limit) : 0;
    const skip = pageSize > 0 ? (parseInt(page) - 1) * pageSize : 0;

    // Get banners with pagination
    const bannersQuery = Banner.find(query)
      .sort({ order: 1, createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (pageSize > 0) {
      bannersQuery.skip(skip).limit(pageSize);
    }

    const banners = await bannersQuery;
    const total = await Banner.countDocuments(query);

    res.status(200).json({
      success: true,
      data: banners,
      pagination:
        pageSize > 0
          ? {
              currentPage: parseInt(page),
              totalPages: Math.ceil(total / pageSize),
              totalItems: total,
              itemsPerPage: pageSize,
            }
          : null,
    });
  } catch (error) {
    console.error("Get banners error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
      error: error.message,
    });
  }
});

// Get single banner by ID
const getBannerById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.error("Get banner by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banner",
      error: error.message,
    });
  }
});

// Create new banner
const createBanner = asyncHandler(async (req, res) => {
  try {
    const { title, subtitle, buttonText, buttonLink, targetUrl, isActive } =
      req.body;

    // Check if images were uploaded
    const files = req.files || {};
    const desktopImage = files.image && files.image[0];
    const mobileImage = files.imageMobile && files.imageMobile[0];
    
    if (!desktopImage) {
      return res.status(400).json({
        success: false,
        message: "Desktop banner image is required",
      });
    }
    
    if (!mobileImage) {
      return res.status(400).json({
        success: false,
        message: "Mobile banner image is required",
      });
    }

    // Create banner data (title, subtitle, buttonText, buttonLink are now optional)
    const bannerData = {
      title: title?.trim() || "",
      subtitle: subtitle?.trim() || "",
      buttonText: buttonText?.trim() || "",
      buttonLink: buttonLink?.trim() || "",
      targetUrl: targetUrl?.trim() || "",
      image: desktopImage.path || desktopImage.secure_url,
      imageMobile: mobileImage.path || mobileImage.secure_url,
      isActive: isActive === "true" || isActive === true,
      createdBy: req.admin.userId,
    };

    const banner = new Banner(bannerData);
    await banner.save();

    // Populate the created banner
    await banner.populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Create banner error:", error);

    // Clean up uploaded files if banner creation failed
    if (req.files) {
      const allFiles = [...(req.files.image || []), ...(req.files.imageMobile || [])];
      allFiles.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create banner",
      error: error.message,
    });
  }
});

// Update banner
const updateBanner = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, buttonText, buttonLink, targetUrl, isActive } =
      req.body;

    // Find existing banner
    const existingBanner = await Banner.findById(id);
    if (!existingBanner) {
      // Clean up uploaded file if any
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Prepare update data (title, subtitle, buttonText, buttonLink are now optional)
    const updateData = {
      title: title?.trim() || "",
      subtitle: subtitle?.trim() || "",
      buttonText: buttonText?.trim() || "",
      buttonLink: buttonLink?.trim() || "",
      targetUrl: targetUrl?.trim() || "",
      isActive: isActive === "true" || isActive === true,
      updatedBy: req.admin.userId,
    };

    // Handle image updates
    const files = req.files || {};
    const desktopImage = files.image && files.image[0];
    const mobileImage = files.imageMobile && files.imageMobile[0];
    
    if (desktopImage) {
      // Delete old desktop image file
      if (existingBanner.image && fs.existsSync(existingBanner.image)) {
        fs.unlinkSync(existingBanner.image);
      }
      updateData.image = desktopImage.path || desktopImage.secure_url;
    }
    
    if (mobileImage) {
      // Delete old mobile image file
      if (existingBanner.imageMobile && fs.existsSync(existingBanner.imageMobile)) {
        fs.unlinkSync(existingBanner.imageMobile);
      }
      updateData.imageMobile = mobileImage.path || mobileImage.secure_url;
    }

    // Update banner
    const updatedBanner = await Banner.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: updatedBanner,
    });
  } catch (error) {
    console.error("Update banner error:", error);

    // Clean up uploaded files if banner update failed
    if (req.files) {
      const allFiles = [...(req.files.image || []), ...(req.files.imageMobile || [])];
      allFiles.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update banner",
      error: error.message,
    });
  }
});

// Delete banner
const deleteBanner = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Delete image files
    if (banner.image && fs.existsSync(banner.image)) {
      fs.unlinkSync(banner.image);
    }
    if (banner.imageMobile && fs.existsSync(banner.imageMobile)) {
      fs.unlinkSync(banner.imageMobile);
    }

    // Delete banner
    await Banner.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Delete banner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete banner",
      error: error.message,
    });
  }
});

// Toggle banner status
const toggleBannerStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Toggle status
    banner.isActive = !banner.isActive;
    banner.updatedBy = req.admin.userId;
    await banner.save();

    await banner.populate("createdBy", "name email");
    await banner.populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: `Banner ${
        banner.isActive ? "activated" : "deactivated"
      } successfully`,
      data: banner,
    });
  } catch (error) {
    console.error("Toggle banner status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle banner status",
      error: error.message,
    });
  }
});

// Reorder banners
const reorderBanners = asyncHandler(async (req, res) => {
  try {
    const { banners } = req.body;

    if (!Array.isArray(banners) || banners.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid banners data",
      });
    }

    // Validate banner data
    for (const banner of banners) {
      if (!banner.id || typeof banner.order !== "number") {
        return res.status(400).json({
          success: false,
          message: "Each banner must have id and order",
        });
      }
    }

    // Reorder banners
    await Banner.reorderBanners(banners);

    // Get updated banners
    const updatedBanners = await Banner.find()
      .sort({ order: 1 })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Banners reordered successfully",
      data: updatedBanners,
    });
  } catch (error) {
    console.error("Reorder banners error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reorder banners",
      error: error.message,
    });
  }
});

// Move banner up/down
const moveBanner = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { direction } = req.body;

    if (!["up", "down"].includes(direction)) {
      return res.status(400).json({
        success: false,
        message: "Direction must be 'up' or 'down'",
      });
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Move banner
    await banner.moveOrder(direction);

    // Get updated banners
    const updatedBanners = await Banner.find()
      .sort({ order: 1 })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: `Banner moved ${direction} successfully`,
      data: updatedBanners,
    });
  } catch (error) {
    console.error("Move banner error:", error);

    if (error.message === "Cannot move banner in that direction") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to move banner",
      error: error.message,
    });
  }
});

module.exports = {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
  moveBanner,
};
