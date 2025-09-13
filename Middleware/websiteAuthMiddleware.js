const jwt = require("jsonwebtoken");
const Customer = require("../Models/customer");

const customerValidation = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get customer from the token
      req.customer = await Customer.findById(decoded.id).select("-password -refreshToken");

      if (!req.customer) {
        return res.status(401).json({ error: "Customer not found" });
      }

      if (!req.customer.isActive) {
        return res.status(401).json({ error: "Account is deactivated" });
      }

      next();
    } catch (error) {
      console.error("Customer authentication error:", error);
      return res.status(401).json({ error: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no token" });
  }
};

const optionalCustomerValidation = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get customer from the token
      req.customer = await Customer.findById(decoded.id).select("-password -refreshToken");

      if (req.customer && !req.customer.isActive) {
        req.customer = null;
      }
    } catch (error) {
      // Token is invalid, but we continue without customer
      req.customer = null;
    }
  }

  next();
};

module.exports = { customerValidation, optionalCustomerValidation };