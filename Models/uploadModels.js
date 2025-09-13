const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
    },
    text: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Upload", uploadSchema);
