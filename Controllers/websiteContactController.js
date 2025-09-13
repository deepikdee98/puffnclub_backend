const ContactForm = require("../Models/contactForm");
const Newsletter = require("../Models/newsletter");

// @desc    Submit contact form
// @route   POST /api/website/contact
// @access  Public
const submitContactForm = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, subject, message } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({
        error: "Please provide first name, last name, email, subject, and message",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address" });
    }

    // Create contact form entry
    const contactForm = new ContactForm({
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
    });

    await contactForm.save();

    res.status(201).json({
      message: "Contact form submitted successfully. We'll get back to you soon!",
      contactId: contactForm._id,
    });
  } catch (error) {
    console.error("Submit contact form error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Subscribe to newsletter
// @route   POST /api/website/newsletter/subscribe
// @access  Public
const subscribeNewsletter = async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address" });
    }

    // Check if email already exists
    let newsletter = await Newsletter.findOne({ email });

    if (newsletter) {
      if (newsletter.isActive) {
        return res.status(400).json({ error: "Email is already subscribed to newsletter" });
      } else {
        // Reactivate subscription
        newsletter.isActive = true;
        newsletter.subscribedAt = new Date();
        newsletter.unsubscribedAt = null;
        if (firstName) newsletter.firstName = firstName;
        if (lastName) newsletter.lastName = lastName;
        await newsletter.save();

        return res.json({
          message: "Newsletter subscription reactivated successfully!",
        });
      }
    }

    // Create new subscription
    newsletter = new Newsletter({
      email,
      firstName,
      lastName,
    });

    await newsletter.save();

    res.status(201).json({
      message: "Successfully subscribed to newsletter!",
    });
  } catch (error) {
    console.error("Subscribe newsletter error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Unsubscribe from newsletter
// @route   POST /api/website/newsletter/unsubscribe
// @access  Public
const unsubscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find and update subscription
    const newsletter = await Newsletter.findOne({ email });

    if (!newsletter) {
      return res.status(404).json({ error: "Email not found in newsletter subscriptions" });
    }

    if (!newsletter.isActive) {
      return res.status(400).json({ error: "Email is already unsubscribed" });
    }

    newsletter.isActive = false;
    newsletter.unsubscribedAt = new Date();
    await newsletter.save();

    res.json({
      message: "Successfully unsubscribed from newsletter",
    });
  } catch (error) {
    console.error("Unsubscribe newsletter error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  submitContactForm,
  subscribeNewsletter,
  unsubscribeNewsletter,
};