const Customer = require("../Models/customer");

// Normalize payload and validate minimal fields
const normalizeAddress = (payload = {}) => {
  const {
    type = "home",
    street = "",
    city = "",
    state = "",
    zipCode = "",
    country = "",
    isDefault = false,
  } = payload;
  return { type, street, city, state, zipCode, country, isDefault };
};

const buildCustomerResponse = (customer) => ({
  _id: customer._id,
  firstName: customer.firstName,
  lastName: customer.lastName,
  email: customer.email,
  phone: customer.phone,
  dateOfBirth: customer.dateOfBirth,
  gender: customer.gender,
  addresses: customer.addresses || [],
  fullName: customer.fullName,
  isActive: customer.isActive,
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

// GET /api/website/addresses
const listAddresses = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id).select(
      "firstName lastName email phone dateOfBirth gender addresses isActive createdAt updatedAt"
    );

    if (!customer) return res.status(404).json({ error: "Customer not found" });

    return res.json({ addresses: customer.addresses || [] });
  } catch (error) {
    console.error("List addresses error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /api/website/addresses
const addAddress = async (req, res) => {
  try {
    const input = normalizeAddress(req.body || {});

    // Minimal validation
    if (!input.street || !input.city || !input.state || !input.zipCode || !input.country) {
      return res.status(400).json({ error: "street, city, state, zipCode, and country are required" });
    }

    const customer = await Customer.findById(req.customer.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    // If first address, force default
    if (!customer.addresses || customer.addresses.length === 0) {
      input.isDefault = true;
    }

    // If setting default, clear default on others
    if (input.isDefault && customer.addresses && customer.addresses.length > 0) {
      customer.addresses.forEach((a) => (a.isDefault = false));
    }

    customer.addresses.push(input);
    const updated = await customer.save();

    return res.status(201).json({
      message: "Address added successfully",
      customer: buildCustomerResponse(updated),
    });
  } catch (error) {
    console.error("Add address error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/website/addresses/:addressId
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const customer = await Customer.findById(req.customer.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const addr = customer.addresses.id(addressId);
    if (!addr) return res.status(404).json({ error: "Address not found" });

    const input = normalizeAddress(req.body || {});

    // Apply partial updates only for provided fields
    ["type", "street", "city", "state", "zipCode", "country", "isDefault"].forEach((key) => {
      if (req.body.hasOwnProperty(key)) {
        addr[key] = input[key];
      }
    });

    // If default set on this, clear others
    if (req.body.hasOwnProperty("isDefault") && addr.isDefault) {
      customer.addresses.forEach((a) => {
        if (a._id.toString() !== addr._id.toString()) a.isDefault = false;
      });
    }

    const updated = await customer.save();

    return res.json({
      message: "Address updated successfully",
      customer: buildCustomerResponse(updated),
    });
  } catch (error) {
    console.error("Update address error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/website/addresses/:addressId
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const customer = await Customer.findById(req.customer.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const addr = customer.addresses.id(addressId);
    if (!addr) return res.status(404).json({ error: "Address not found" });

    const wasDefault = !!addr.isDefault;

    // Remove using array filtering to avoid deprecated subdoc.remove()
    customer.addresses = customer.addresses.filter(
      (a) => a._id.toString() !== addressId
    );

    // If default was removed, set first as default if exists
    if (wasDefault && customer.addresses.length > 0) {
      customer.addresses[0].isDefault = true;
    }

    const updated = await customer.save();

    return res.json({
      message: "Address deleted successfully",
      customer: buildCustomerResponse(updated),
    });
  } catch (error) {
    console.error("Delete address error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/website/addresses/:addressId/default
const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const customer = await Customer.findById(req.customer.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const addr = customer.addresses.id(addressId);
    if (!addr) return res.status(404).json({ error: "Address not found" });

    customer.addresses.forEach((a) => (a.isDefault = false));
    addr.isDefault = true;

    const updated = await customer.save();

    return res.json({
      message: "Default address updated",
      customer: buildCustomerResponse(updated),
    });
  } catch (error) {
    console.error("Set default address error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};