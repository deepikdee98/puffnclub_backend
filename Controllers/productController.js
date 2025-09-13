const asyncHandler = require("express-async-handler");
const Product = require("../Models/productdetails");
const fs = require("fs");
const path = require("path");

// Create Product
const createProduct = asyncHandler(async (req, res) => {
  try {
    console.log("=== CREATE PRODUCT START ===");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Request body:", req.body);
    console.log("Files:", req.files ? req.files.length : 0);

    // Log each file's fieldname for debugging
    if (req.files && req.files.length > 0) {
      console.log("File details:");
      req.files.forEach((file, index) => {
        console.log(`File ${index}: fieldname="${file.fieldname}", originalname="${file.originalname}"`);
      });
    }

    const {
      name,
      sku,
      description,
      category,
      brand,
      price,
      comparePrice,
      status,
      isFeatured,
      tags,
      metaTitle,
      metaDescription,
    } = req.body;

    // Check basic required fields
    if (!name || !sku || !description || !category || !brand || !price || !status) {
      res.status(400);
      throw new Error("Required fields are missing");
    }

    // Parse variants data
    console.log("=== PARSING VARIANTS FROM BODY ===");
    console.log("req.body.variants type:", typeof req.body.variants);
    console.log("req.body.variants value:", req.body.variants);
    
    let variants = [];
    const variantColors = new Set();

    // Check if variants are already parsed as objects (from FormData with nested structure)
    if (req.body.variants && Array.isArray(req.body.variants)) {
      console.log("Variants received as array of objects");
      variants = req.body.variants.map((variant, index) => {
        console.log(`Processing variant ${index}:`, variant);
        
        const processedVariant = {
          color: variant.color,
          stock: parseInt(variant.stock),
          sizes: typeof variant.sizes === 'string' ? variant.sizes.split(',').map(s => s.trim()).filter(Boolean) : variant.sizes,
          images: []
        };
        
        variantColors.add(variant.color);
        console.log(`Processed variant ${index}:`, processedVariant);
        return processedVariant;
      });
    } else {
      // Fallback: Extract variant data from individual FormData fields
      console.log("Parsing variants from individual FormData fields");
      Object.keys(req.body).forEach(key => {
        if (key !== 'variants') { // Skip the variants array itself
          console.log(`Body key: "${key}" = "${req.body[key]}"`);
          const variantMatch = key.match(/^variants\[(\d+)\]\[(\w+)\]$/);
          if (variantMatch) {
            console.log(`Found variant match: ${key} -> index=${variantMatch[1]}, field=${variantMatch[2]}`);
            const [, index, field] = variantMatch;
            const variantIndex = parseInt(index);
            
            if (!variants[variantIndex]) {
              variants[variantIndex] = { images: [] };
            }
            
            if (field === 'color') {
              variants[variantIndex].color = req.body[key];
              variantColors.add(req.body[key]);
              console.log(`Set variant ${variantIndex} color to: ${req.body[key]}`);
            } else if (field === 'stock') {
              variants[variantIndex].stock = parseInt(req.body[key]);
              console.log(`Set variant ${variantIndex} stock to: ${req.body[key]}`);
            } else if (field === 'sizes') {
              variants[variantIndex].sizes = req.body[key].split(',').map(s => s.trim()).filter(Boolean);
              console.log(`Set variant ${variantIndex} sizes to: ${variants[variantIndex].sizes}`);
            }
          }
        }
      });
    }
    console.log("=== END PARSING VARIANTS ===");

    // Process variant images from uploaded files
    console.log("=== PROCESSING VARIANT IMAGES ===");
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded files`);
      req.files.forEach((file, fileIndex) => {
        console.log(`Processing file ${fileIndex}:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          path: file.path,
          secure_url: file.secure_url
        });
        
        const variantMatch = file.fieldname.match(/^variants\[(\d+)\]\[images\]$/);
        if (variantMatch) {
          const variantIndex = parseInt(variantMatch[1]);
          console.log(`File ${fileIndex} matches variant ${variantIndex}`);
          
          if (variants[variantIndex]) {
            // Use file.path (Cloudinary URL) or file.secure_url, whichever is available
            const imageUrl = file.secure_url || file.path;
            if (imageUrl) {
              variants[variantIndex].images.push(imageUrl);
              console.log(`Added image to variant ${variantIndex}: ${imageUrl}`);
            } else {
              console.warn(`No URL found for file ${fileIndex}`);
            }
          } else {
            console.warn(`Variant ${variantIndex} not found for file ${fileIndex}`);
          }
        } else {
          console.log(`File ${fileIndex} fieldname doesn't match variant pattern: ${file.fieldname}`);
        }
      });
    } else {
      console.log("No files uploaded");
    }
    console.log("=== END PROCESSING VARIANT IMAGES ===");

    console.log("=== VARIANTS VALIDATION ===");
    console.log("Variants array length:", variants.length);
    console.log("Variants array:", JSON.stringify(variants, null, 2));

    // Validate variants
    if (variants.length === 0) {
      res.status(400);
      throw new Error("At least one variant is required");
    }

    // Check if all variants have required fields
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      console.log(`Checking variant ${i + 1}:`, JSON.stringify(variant, null, 2));
      
      if (!variant.color) {
        console.log(`Variant ${i + 1} missing color:`, variant.color);
        res.status(400);
        throw new Error(`Variant ${i + 1} is missing color`);
      }
      if (variant.stock === undefined) {
        console.log(`Variant ${i + 1} missing stock:`, variant.stock);
        res.status(400);
        throw new Error(`Variant ${i + 1} is missing stock`);
      }
      if (!variant.sizes || variant.sizes.length === 0) {
        console.log(`Variant ${i + 1} missing sizes:`, variant.sizes);
        res.status(400);
        throw new Error(`Variant ${i + 1} is missing sizes`);
      }
      if (!variant.images || variant.images.length === 0) {
        console.log(`Variant ${i + 1} missing images:`, variant.images);
        res.status(400);
        throw new Error(`Variant ${i + 1} must have at least one image`);
      }
    }

    console.log("Processed variants:", variants);

    // Create the product with variant structure
    const newProduct = new Product({
      name,
      sku,
      description,
      category,
      brand,
      price: Number(price),
      comparePrice: comparePrice ? Number(comparePrice) : undefined,
      status: status.toLowerCase(), // Convert to lowercase for consistency
      isFeatured: isFeatured === "true" || isFeatured === true,
      tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      variants: variants,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
    });

    console.log("Product to save:", JSON.stringify(newProduct, null, 2));

    await newProduct.save();
    console.log("Product created successfully");
    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Create product error:", err);
    if (err.code === 11000 && err.keyPattern && err.keyPattern.sku) {
      res.status(400).json({ message: "SKU already exists" });
    } else {
      res.status(500).json({ message: err.message || "Error creating product" });
    }
  }
});

// Get All Products
const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({});
  console.log("Found products:", products.length);
  if (products.length > 0) {
    console.log(
      "Sample product IDs:",
      products.slice(0, 3).map((p) => ({ id: p._id, name: p.name }))
    );
  }
  res.status(200).json(products);
});

// Get Product by ID
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.status(200).json(product);
});

// Update Product by ID - Simplified version for debugging
const updateProductById = asyncHandler(async (req, res) => {
  console.log("=== UPDATE PRODUCT START ===");
  console.log("Product ID:", req.params.id);
  console.log("Request body keys:", Object.keys(req.body));
  console.log("Request body:", req.body);
  console.log("Files:", req.files ? req.files.length : 0);
  console.log("Content-Type:", req.headers["content-type"]);

  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Simple update - just update the fields that are provided
    const updateData = {};

    // Basic string fields
    const stringFields = [
      "name",
      "sku",
      "description",
      "category",
      "brand",
      "color",
      "status",
      "metaTitle",
      "metaDescription",
    ];
    for (const field of stringFields) {
      if (req.body[field] && req.body[field].trim()) {
        updateData[field] = field === 'status' ? req.body[field].toLowerCase() : req.body[field].trim();
      }
    }

    // Number fields
    if (req.body.price && !isNaN(Number(req.body.price))) {
      updateData.price = Number(req.body.price);
    }
    if (req.body.comparePrice && !isNaN(Number(req.body.comparePrice))) {
      updateData.comparePrice = Number(req.body.comparePrice);
    }
    if (req.body.stockQuantity && !isNaN(Number(req.body.stockQuantity))) {
      updateData.stockQuantity = Number(req.body.stockQuantity);
    }

    // Boolean field
    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured =
        req.body.isFeatured === "true" || req.body.isFeatured === true;
    }

    // Array fields - simplified handling
    if (req.body.availableSizes) {
      if (Array.isArray(req.body.availableSizes)) {
        updateData.availableSizes = req.body.availableSizes;
      } else if (typeof req.body.availableSizes === "string") {
        try {
          updateData.availableSizes = JSON.parse(req.body.availableSizes);
        } catch (e) {
          updateData.availableSizes = req.body.availableSizes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
    }

    if (req.body.tags) {
      if (Array.isArray(req.body.tags)) {
        updateData.tags = req.body.tags;
      } else if (typeof req.body.tags === "string") {
        try {
          updateData.tags = JSON.parse(req.body.tags);
        } catch (e) {
          updateData.tags = req.body.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
    }

    // Handle variants data - check if it's a variant-based update
    const hasVariantData = Object.keys(req.body).some(key => key.startsWith('variants[')) || req.body.variants;
    
    if (hasVariantData) {
      console.log("Processing variant-based update");
      console.log("Existing product variants:", product.variants ? product.variants.length : 0);
      if (product.variants && product.variants.length > 0) {
        console.log("Existing variant colors:", product.variants.map(v => v.color));
      }
      
      // Parse variants data from FormData
      let variants = [];
      
      // Check if variants are sent as an array (new format) or as individual FormData fields (old format)
      if (req.body.variants && Array.isArray(req.body.variants)) {
        console.log("Processing variants as array format");
        variants = req.body.variants.map((variant, index) => {
          const processedVariant = {
            color: variant.color,
            stock: parseInt(variant.stock),
            sizes: variant.sizes.split(',').map(s => s.trim()).filter(Boolean),
            images: [],
            existingImages: []
          };
          
          // Parse existing images if provided
          if (variant.existingImages) {
            try {
              processedVariant.existingImages = JSON.parse(variant.existingImages);
              console.log(`Parsed existing images for variant ${index} (${variant.color}):`, processedVariant.existingImages);
            } catch (e) {
              console.warn(`Failed to parse existing images for variant ${index}:`, variant.existingImages);
            }
          }
          
          return processedVariant;
        });
      } else {
        console.log("Processing variants as FormData fields format");
        // Extract variant data from FormData (old format)
        Object.keys(req.body).forEach(key => {
          const variantMatch = key.match(/^variants\[(\d+)\]\[(\w+)\]$/);
          if (variantMatch) {
            const [, index, field] = variantMatch;
            const variantIndex = parseInt(index);
            
            if (!variants[variantIndex]) {
              variants[variantIndex] = { images: [], existingImages: [] };
            }
            
            if (field === 'color') {
              variants[variantIndex].color = req.body[key];
            } else if (field === 'stock') {
              variants[variantIndex].stock = parseInt(req.body[key]);
            } else if (field === 'sizes') {
              variants[variantIndex].sizes = req.body[key].split(',').map(s => s.trim()).filter(Boolean);
            } else if (field === 'existingImages') {
              try {
                variants[variantIndex].existingImages = JSON.parse(req.body[key]);
                console.log(`Parsed existing images for variant ${variantIndex}:`, variants[variantIndex].existingImages);
              } catch (e) {
                console.warn(`Failed to parse existing images for variant ${variantIndex}:`, req.body[key]);
                variants[variantIndex].existingImages = [];
              }
            }
          }
        });
      }

      console.log("Parsed variants from FormData:", variants.length);
      console.log("Variant colors received:", variants.map(v => v.color));
      console.log("Detailed variants data:", variants.map((v, i) => ({
        index: i,
        color: v.color,
        stock: v.stock,
        sizes: v.sizes,
        imageCount: v.images ? v.images.length : 0
      })));

      // Process variant images from uploaded files
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          const variantMatch = file.fieldname.match(/^variants\[(\d+)\]\[images\]$/);
          if (variantMatch) {
            const variantIndex = parseInt(variantMatch[1]);
            const imageUrl = file.secure_url || file.path;
            if (variants[variantIndex] && imageUrl) {
              variants[variantIndex].images.push(imageUrl);
              console.log(`Added image to variant ${variantIndex} (${variants[variantIndex].color}): ${imageUrl}`);
            } else {
              console.warn(`Failed to add image to variant ${variantIndex}:`, {
                variantExists: !!variants[variantIndex],
                imageUrl: imageUrl,
                file: file
              });
            }
          }
        });
      }

      console.log("After processing uploaded files:", variants.map((v, i) => ({
        index: i,
        color: v.color,
        imageCount: v.images ? v.images.length : 0,
        images: v.images
      })));

      // Merge existing images with new images for each variant
      variants.forEach((variant, index) => {
        // Start with existing images if they were provided
        const existingImages = variant.existingImages || [];
        const newImages = variant.images || [];
        
        // Combine existing and new images
        variant.images = [...existingImages, ...newImages];
        
        console.log(`Variant ${index} (${variant.color}): ${existingImages.length} existing + ${newImages.length} new = ${variant.images.length} total images`);
      });

      console.log("After merging with existing images:", variants.map((v, i) => ({
        index: i,
        color: v.color,
        imageCount: v.images ? v.images.length : 0,
        isNewVariant: !product.variants || !product.variants.find(existing => existing.color === v.color)
      })));

      // Validate variants
      if (variants.length > 0) {
        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          if (!variant.color || variant.stock === undefined || !variant.sizes || variant.sizes.length === 0) {
            console.log(`Variant ${i + 1} validation failed:`, {
              color: variant.color,
              stock: variant.stock,
              sizes: variant.sizes
            });
            return res.status(400).json({ error: `Variant ${i + 1} (${variant.color || 'Unknown color'}) is missing required fields (color, stock, or sizes)` });
          }
          if (!variant.images || variant.images.length === 0) {
            console.log(`Variant ${i + 1} (${variant.color}) has no images after processing`);
            // For new variants (colors that don't exist in the original product), require at least one image
            const isNewVariant = !product.variants || !product.variants.find(existing => existing.color === variant.color);
            if (isNewVariant) {
              return res.status(400).json({ error: `New variant "${variant.color}" must have at least one image. Please upload images for this color variant.` });
            } else {
              // For existing variants, this shouldn't happen since we preserve existing images above
              console.warn(`Existing variant ${variant.color} has no images - this might indicate a data issue`);
              return res.status(400).json({ error: `Variant "${variant.color}" must have at least one image. Please upload images for this color variant.` });
            }
          }
        }
        
        console.log(`All ${variants.length} variants validated successfully`);
        updateData.variants = variants;
      }
    } else {
      // Legacy single-variant update - handle image uploads for backward compatibility
      if (req.files && req.files.length > 0) {
        console.log("Processing legacy image uploads:", req.files.length);
        const newImagePaths = req.files.map((file) => file.secure_url).filter(Boolean);
        console.log("New image paths:", newImagePaths);
        
        // Get existing images
        const existingImages = product.images || [];
        console.log("Existing images:", existingImages);
        
        // Combine existing and new images, but only keep Cloudinary URLs
        updateData.images = [...existingImages.filter(url => url && url.startsWith('https://res.cloudinary.com/')), ...newImagePaths];
        console.log("Combined images:", updateData.images);
      }
    }

    console.log("Final update data:", updateData);
    
    // Log variants specifically before database update
    if (updateData.variants) {
      console.log("Variants being saved to database:", updateData.variants.map((v, i) => ({
        index: i,
        color: v.color,
        stock: v.stock,
        sizes: v.sizes,
        imageCount: v.images ? v.images.length : 0
      })));
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    
    console.log("Database update completed. Updated product variants:", updatedProduct.variants ? updatedProduct.variants.length : 0);
    if (updatedProduct.variants) {
      console.log("Updated product variant colors:", updatedProduct.variants.map(v => v.color));
    }

    console.log("Product updated successfully");
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Update error:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({
      message: "Error updating product",
      error: error.message,
    });
  }
});

// Delete Product by ID
const deleteProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Delete associated images
  if (product.images && product.images.length > 0) {
    for (const imagePath of product.images) {
      try {
        // Check if it's a Cloudinary URL
        if (imagePath.includes('cloudinary.com')) {
          // Extract public_id from Cloudinary URL for deletion
          const publicId = imagePath.split('/').pop().split('.')[0];
          const cloudinary = require('cloudinary').v2;
          await cloudinary.uploader.destroy(`uploads/${publicId}`);
          console.log(`Deleted Cloudinary image: ${publicId}`);
        } else {
          // Handle local file deletion
          const absolutePath = path.isAbsolute(imagePath)
            ? imagePath
            : path.join(process.cwd(), imagePath);
          
          await fs.promises.unlink(absolutePath);
          console.log(`Deleted local file: ${absolutePath}`);
        }
      } catch (err) {
        console.error(`Failed to delete image ${imagePath}: ${err.message}`);
        // Continue with deletion even if image cleanup fails
      }
    }
  }

  await Product.findByIdAndDelete(id);

  res
    .status(200)
    .json({ message: "Product and associated images deleted successfully" });
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  deleteProductById,
  updateProductById,
};
