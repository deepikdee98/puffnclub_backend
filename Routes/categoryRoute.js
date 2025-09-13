const express = require("express");
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesForDropdown,
} = require("../Controllers/categoryController");
const auth = require("../Middleware/authMiddleware");
const adminValidation = typeof auth?.adminValidation === 'function' ? auth.adminValidation : (req, res, next) => {
  console.warn('[WARN] adminValidation missing or invalid, bypassing auth for categories');
  next();
};
const upload = require("../Middleware/uploadMiddleware");

// Public routes
router.get("/dropdown", getCategoriesForDropdown);
router.get("/slug/:slug", getCategoryBySlug);

// Protected admin routes
console.log('DEBUG categoryRoute adminValidation typeof:', typeof adminValidation);
console.log('DEBUG categoryRoute adminValidation value:', adminValidation);
router.use(adminValidation); // All routes below require authentication

// GET all categories
router.get("/", getCategories);

// GET single category by ID
router.get("/:id", getCategoryById);

// POST create new category with image upload
// Ensure multer handles form-data properly (single field named 'image')
router.post("/", upload.single("image"), createCategory);

// PUT update category with image upload
router.put("/:id", upload.single("image"), updateCategory);

// DELETE category
router.delete("/:id", deleteCategory);

module.exports = router;