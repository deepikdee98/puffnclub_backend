const express = require("express");
const {
  uploadfile,
  getAllFiles,
  getFileById,
  deleteFile,
  updateFiles,
} = require("../Controllers/uploadController");
const router = express.Router();
const upload = require("../Middleware/uploadMiddleware");
const {adminValidation} = require("../Middleware/authMiddleware");

router.use(adminValidation);
router.post("/upload", upload.single("file"), uploadfile);
router.get("/uploads", getAllFiles);
router.get("/upload/:id", getFileById);
router.put("/upload/:id", upload.single("file"), updateFiles);
router.delete("/upload/:id", deleteFile);

module.exports = router;
