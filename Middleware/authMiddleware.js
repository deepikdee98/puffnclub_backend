const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

// ✅ Shared helper to verify token & admin role
const verifyAdminToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized, no token");
  }

  const token = authHeader.split(" ")[1];

  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  if (decoded.role !== "admin") {
    throw new Error("Forbidden, not an admin");
  }

  return decoded;
};

// ✅ General admin validation middleware
const adminValidation = asyncHandler(async (req, res, next) => {
  try {
    req.admin = verifyAdminToken(req);
    next();
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ✅ Super admin validation middleware
const verifySuperAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin = verifyAdminToken(req);

    if (!admin.isSuperAdmin) {
      return res.status(403).json({ message: "Forbidden, not a super admin" });
    }

    req.admin = admin;
    next();
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// ✅ Alias for authenticateAdmin (used by notification and message routes)
const authenticateAdmin = adminValidation;

module.exports = { adminValidation, verifySuperAdmin, authenticateAdmin };
