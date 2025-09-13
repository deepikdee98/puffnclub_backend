const express = require("express");
const {
  submitContactForm,
  subscribeNewsletter,
  unsubscribeNewsletter,
} = require("../Controllers/websiteContactController");

const router = express.Router();

// Public routes (no authentication required)
router.post("/contact", submitContactForm);
router.post("/newsletter/subscribe", subscribeNewsletter);
router.post("/newsletter/unsubscribe", unsubscribeNewsletter);

module.exports = router;