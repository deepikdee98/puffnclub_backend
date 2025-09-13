const express = require("express");
const {
  createUser,
  getAllUsers,
  getUserById,
} = require("../Controllers/userController");
const router = express.Router();

router.post("/user", createUser);
router.get("/users", getAllUsers);
router.get("/user/:id", getUserById);

module.exports = router;
