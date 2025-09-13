const asyncHandler = require("express-async-handler");
const Upload = require("../Models/uploadModels");
const fs = require("fs");

//GET the all files  metadata
const getAllFiles = asyncHandler(async (req, res) => {
  const files = await Upload.find();
  res.status(200).json(files);
});

//POST the File
const uploadfile = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    console.error("No file uploaded");
    res.status(400);
    throw new Error("No file uploaded");
  }

  const uploaded = await Upload.create({
    path: file.path,
    text: req.body.text,
  });
  res.status(200).json(uploaded);
});

// Get a File by id
const getFileById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = await Upload.findById(id);
  res.status(200).json(file);
});

//Update the files

const updateFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.body && !req.file) {
    return res.status(400).json({ error: "No data provided for update." });
  }

  const updateData = {};
  if (typeof req.body.text !== "undefined") {
    updateData.text = req.body.text;
  }

  if (req.file) {
    updateData.path = req.file.path;

    // If replacing the old file, delete old one:
    const oldFile = await Upload.findById(id);
    if (oldFile && oldFile.path) {
      fs.unlink(oldFile.path, (err) => {
        if (err) console.error("Failed to delete old file:", err);
      });
    }
  }

  const updatedFile = await Upload.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  if (!updatedFile) {
    res.status(404);
    throw new Error("File not found");
  }

  res.status(200).json(updatedFile);
});

//Delete the file
const deleteFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = await Upload.findById(id);
  if (!file) {
    res.status(404);
    throw new Error("File not found");
  }

  // Delete file from disk too
  if (file.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
      console.log("File deleted from disk");
    } catch (err) {
      console.error("Failed to delete file from disk:", err);
    }
  }

  await Upload.findByIdAndDelete(id);
  res.status(200).json({ message: "File deleted successfully" });
});

module.exports = {
  uploadfile,
  getAllFiles,
  getFileById,
  updateFiles,
  deleteFile,
};
