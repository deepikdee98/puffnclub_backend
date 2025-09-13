const express = require("express");
const {
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require("../Controllers/websiteAddressController");
const { customerValidation } = require("../Middleware/websiteAuthMiddleware");

const router = express.Router();

// All routes require authenticated customer
router.use(customerValidation);

// CRUD for addresses
router.get("/", listAddresses);
router.post("/", addAddress);
router.put("/:addressId", updateAddress);
router.delete("/:addressId", deleteAddress);
router.patch("/:addressId/default", setDefaultAddress);

module.exports = router;