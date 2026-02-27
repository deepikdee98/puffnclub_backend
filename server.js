const express = require("express");
const connectDb = require("./Config/dbConnection");
const dotenv = require("dotenv").config();
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;

/* ================================
   CORS CONFIG (PRODUCTION SAFE)
================================ */
const allowedOrigins = [
  "https://puffnclub.com",
  "https://www.puffnclub.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow mobile apps, Postman, server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ================================
   BODY PARSERS
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================================
   STATIC FILES
================================ */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================================
   HEALTH CHECK
================================ */
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    port,
    cors: "enabled",
  });
});

/* ================================
   ADMIN ROUTES
================================ */
app.use("/api/admin", require("./Routes/authRoute"));
app.use("/api/upload-products", require("./Routes/uploadsRoute"));
app.use("/api/products", require("./Routes/productRoute"));
app.use("/api/categories", require("./Routes/categoryRoute"));
app.use("/api/user", require("./Routes/userRoute"));
app.use("/api/userOrder", require("./Routes/userOrderRoute"));
app.use("/api/adminorder", require("./Routes/adminOrderRoute"));
app.use("/api/admin/dashboard", require("./Routes/adminDashboardRoute"));
app.use("/api/notifications", require("./Routes/notificationRoute"));
app.use("/api/messages", require("./Routes/messageRoute"));
app.use("/api/banners", require("./Routes/bannerRoute"));
app.use("/api/coupons", require("./Routes/couponRoute"));

/* ================================
   WEBSITE ROUTES
================================ */
app.use("/api/website", require("./Routes/websiteRoute"));
app.use("/api/website/auth", require("./Routes/websiteAuthRoute"));
app.use("/api/website/addresses", require("./Routes/websiteAddressRoute"));
app.use("/api/website/cart", require("./Routes/websiteCartRoute"));
app.use("/api/website/wishlist", require("./Routes/websiteWishlistRoute"));
app.use("/api/website/orders", require("./Routes/websiteOrderRoute"));
app.use("/api/website", require("./Routes/exchangeReturnRoute"));
app.use("/api/website", require("./Routes/websiteContactRoute"));
app.use("/api/website", require("./Routes/shiprocketRoute"));

/* ================================
   SHIPROCKET CHECKOUT
================================ */
app.use("/api/shiprocket", require("./Routes/shiprocketCheckoutRoute"));

/* ================================
   SERVER START
================================ */
const startServer = async () => {
  await connectDb();
  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${port}`);
  });
};

startServer();
