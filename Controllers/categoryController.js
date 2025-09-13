const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Category = require("../Models/category");
const ProductDetails = require("../Models/productdetails");

// Helper to generate URL-friendly slug
const generateSlug = (value = "") => {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// GET all categories
const getCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('parentCategory', 'name slug')
      .sort({ sortOrder: 1, name: 1 });

    // Get product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await ProductDetails.countDocuments({ category: category.name });
        return {
          ...category.toJSON(),
          count: productCount,
        };
      })
    );

    res.status(200).json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single category by ID
const getCategoryById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id).populate('parentCategory', 'name slug');
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const productCount = await ProductDetails.countDocuments({ category: category.name });
    
    res.status(200).json({
      ...category.toJSON(),
      count: productCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET category by slug
const getCategoryBySlug = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug }).populate('parentCategory', 'name slug');
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const productCount = await ProductDetails.countDocuments({ category: category.name });
    
    res.status(200).json({
      ...category.toJSON(),
      count: productCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new category
const createCategory = asyncHandler(async (req, res) => {
  try {
    const { name, description, parentCategory, isActive, sortOrder, metaTitle, metaDescription } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ error: "Category with this name already exists" });
    }

    // Validate parentCategory if provided
    let normalizedParent = null;
    if (parentCategory) {
      if (!mongoose.Types.ObjectId.isValid(parentCategory)) {
        return res.status(400).json({ error: "Invalid parentCategory id" });
      }
      normalizedParent = parentCategory;
    }

    const categoryData = {
      name: String(name).trim(),
      description,
      parentCategory: normalizedParent,
      isActive: isActive !== undefined ? (String(isActive) === 'true' || isActive === true) : true,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      metaTitle,
      metaDescription,
    };

    // Handle image upload if file is provided
    if (req.file) {
      console.log('Uploaded file info:', req.file);
      // Cloudinary storage often provides the URL in file.path; secure_url may be undefined
      const fileUrl = req.file.secure_url || req.file.path || req.file.url;
      if (fileUrl) {
        categoryData.image = fileUrl;
      }
    }

    // Ensure slug is set (in case pre-save didn't run due to create flow variations)
    if (!categoryData.slug) {
      categoryData.slug = generateSlug(categoryData.name);
    }

    console.log('Creating category with data:', categoryData);
    const category = await Category.create(categoryData);
    const populatedCategory = await Category.findById(category._id).populate('parentCategory', 'name slug');
    
    res.status(201).json({
      ...populatedCategory.toJSON(),
      count: 0,
    });
  } catch (error) {
    console.error('CREATE CATEGORY ERROR:', error);
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({ error: `Category with this ${field} already exists` });
    }
    // Validation or cast errors -> 400
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT update category
const updateCategory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parentCategory, isActive, sortOrder, metaTitle, metaDescription } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if name is being changed and if new name already exists
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name, _id: { $ne: id } });
      if (existingCategory) {
        return res.status(400).json({ error: "Category with this name already exists" });
      }
    }

    const updateData = {
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      parentCategory: parentCategory !== undefined ? (parentCategory || null) : category.parentCategory,
      isActive: isActive !== undefined ? isActive : category.isActive,
      sortOrder: sortOrder !== undefined ? sortOrder : category.sortOrder,
      metaTitle: metaTitle !== undefined ? metaTitle : category.metaTitle,
      metaDescription: metaDescription !== undefined ? metaDescription : category.metaDescription,
    };

    // Handle image upload if file is provided
    if (req.file) {
      // Cloudinary storage often provides the URL in file.path; secure_url may be undefined
      const fileUrl = req.file.secure_url || req.file.path || req.file.url;
      if (fileUrl) {
        updateData.image = fileUrl;
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('parentCategory', 'name slug');

    if (!updatedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    const productCount = await ProductDetails.countDocuments({ category: updatedCategory.name });

    res.status(200).json({
      ...updatedCategory.toJSON(),
      count: productCount,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `Category with this ${field} already exists` });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE category
const deleteCategory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if category has products
    const productCount = await ProductDetails.countDocuments({ category: category.name });
    if (productCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It has ${productCount} products associated with it.` 
      });
    }

    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({ parentCategory: id });
    if (subcategoryCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It has ${subcategoryCount} subcategories.` 
      });
    }

    await Category.findByIdAndDelete(id);
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET categories for dropdown (active only)
const getCategoriesForDropdown = asyncHandler(async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('_id name slug image')
      .sort({ name: 1 });
    
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesForDropdown,
};