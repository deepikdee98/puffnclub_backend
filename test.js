const nodemailer = require("nodemailer");
require("dotenv").config();

async function testMail() {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
      
    });
    let info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: "deepikayekambaram98@gmail.com", // try a different email too
      subject: "Test Email",
      text: "Hello! This is a test email using App Password.",
    });

    console.log("Message sent:", info.messageId);
  } catch (err) {
    console.error("Error:", err);
  }
}

testMail();
