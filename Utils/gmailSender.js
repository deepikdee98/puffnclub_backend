const nodemailer = require("nodemailer");

const {
  GMAIL_USER,
  GMAIL_PASS, // this is your 16-character app password without spaces
} = process.env;

if (!GMAIL_USER || !GMAIL_PASS) {
  console.warn("[gmailSender] Missing GMAIL_USER or GMAIL_PASS env vars");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  
});

async function sendEmail({ to, subject, text, html }) {
  console.log("[gmailSender] Sending email to:", to,GMAIL_USER,GMAIL_PASS);
  if (!to) throw new Error("sendEmail: 'to' is required");
  if (!subject) subject = "OTP Verification";

  await transporter.sendMail({
  from: process.env.GMAIL_USER,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendEmail };
