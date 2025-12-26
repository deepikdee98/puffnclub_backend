const multer = require("multer");
require("dotenv").config();

// Pick storage (local or cloud)
const storage =
  process.env.STORAGE_TYPE === "cloud"
    ? require("../Storage/cloud")
    : require("../Storage/local");

// File filter for allowed mime types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new multer.MulterError(
      "LIMIT_UNEXPECTED_FILE",
      file.fieldname
    );
    error.message = `Invalid file type: ${file.mimetype}`;
    cb(error);
  }
};

// Multer upload instance
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter,
});

// Enhanced wrapper for handling dynamic variant fields
const debugUpload = {
  array: (fieldName, maxCount) => {
    return (req, res, next) => {
      console.log('=== UPLOAD MIDDLEWARE DEBUG ===');
      console.log('Storage type:', process.env.STORAGE_TYPE);
      console.log('Field name:', fieldName);
      console.log('Max count:', maxCount);
      
      const uploadHandler = upload.array(fieldName, maxCount);
      
      uploadHandler(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({ error: err.message });
        }
        
        console.log('Files uploaded:', req.files ? req.files.length : 0);
        if (req.files && req.files.length > 0) {
          req.files.forEach((file, index) => {
            console.log(`File ${index}:`, {
              fieldname: file.fieldname,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
              secure_url: file.secure_url,
              public_id: file.public_id
            });
          });
        }
        
        next();
      });
    };
  },

  // New method for handling any field (for variant images)
  any: (maxCount = 20) => {
    return (req, res, next) => {
      console.log('=== UPLOAD ANY FIELD DEBUG ===');
      console.log('Storage type:', process.env.STORAGE_TYPE);
      console.log('Max count:', maxCount);
      
      const uploadHandler = upload.any();
      
      uploadHandler(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({ error: err.message });
        }
        
        console.log('Files uploaded:', req.files ? req.files.length : 0);
        if (req.files && req.files.length > 0) {
          req.files.forEach((file, index) => {
            console.log(`File ${index}:`, {
              fieldname: file.fieldname,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
              secure_url: file.secure_url,
              public_id: file.public_id
            });
          });
        }
        
        next();
      });
    };
  },
  
  single: (fieldName) => {
    return (req, res, next) => {
      console.log('=== SINGLE UPLOAD DEBUG ===');
      console.log('Storage type:', process.env.STORAGE_TYPE);
      console.log('Field name:', fieldName);
      
      const uploadHandler = upload.single(fieldName);
      
      uploadHandler(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({ error: err.message });
        }
        
        console.log('File uploaded:', req.file ? 1 : 0);
        if (req.file) {
          console.log('File details:', {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            secure_url: req.file.secure_url,
            public_id: req.file.public_id
          });
        }
        
        next();
      });
    };
  },
  
  fields: (fields) => {
    return (req, res, next) => {
      console.log('=== FIELDS UPLOAD DEBUG ===');
      console.log('Storage type:', process.env.STORAGE_TYPE);
      console.log('Fields:', fields);
      
      const uploadHandler = upload.fields(fields);
      
      uploadHandler(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({ error: err.message });
        }
        
        console.log('Files uploaded:', req.files ? Object.keys(req.files).length : 0);
        if (req.files) {
          Object.keys(req.files).forEach(fieldname => {
            req.files[fieldname].forEach((file, index) => {
              console.log(`File ${fieldname}[${index}]:`, {
                fieldname: file.fieldname,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path,
                secure_url: file.secure_url,
                public_id: file.public_id
              });
            });
          });
        }
        
        next();
      });
    };
  }
};

module.exports = debugUpload;
