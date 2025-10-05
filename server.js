const express = require("express");
const connectDb = require("./Config/dbConnection");
const dotenv = require("dotenv").config();
const cors = require("cors");
const path = require("path");

connectDb();
const app = express();

const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: true, // Allow all origins for development
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    port: port,
    cors: "enabled"
  });
});

// Admin routes
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

// Website routes
app.use("/api/website", require("./Routes/websiteRoute"));
app.use("/api/website/auth", require("./Routes/websiteAuthRoute"));
app.use("/api/website/addresses", require("./Routes/websiteAddressRoute"));
app.use("/api/website/cart", require("./Routes/websiteCartRoute"));
app.use("/api/website/wishlist", require("./Routes/websiteWishlistRoute"));
app.use("/api/website/orders", require("./Routes/websiteOrderRoute"));
app.use("/api/website", require("./Routes/websiteContactRoute"));
app.use("/api/website", require("./Routes/shiprocketRoute"));

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
