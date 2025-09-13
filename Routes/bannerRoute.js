const express = require("express");
const {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
  moveBanner,
} = require("../Controllers/bannerController");
const router = express.Router();
const upload = require("../Middleware/uploadMiddleware");
const { adminValidation } = require("../Middleware/authMiddleware");

// Apply admin validation to all routes
router.use(adminValidation);

// Banner CRUD routes
router.get("/", getBanners);
router.get("/:id", getBannerById);
router.post("/", upload.single("image"), createBanner);
router.put("/:id", upload.single("image"), updateBanner);
router.delete("/:id", deleteBanner);

// Banner management routes
router.patch("/:id/toggle-status", toggleBannerStatus);
router.post("/reorder", reorderBanners);
router.patch("/:id/move", moveBanner);

module.exports = router;
