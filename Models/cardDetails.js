const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["cashOnDelivery", "DebitCard", "CreditCard", "Upi"],
      default: "cashOnDelivery",
      
    },
    cardNumber: {
      type: String,
      
    },
    cardHolderName: {
      type: String,
      
    },
    expiryMonth: {
      type: Number,
      
    },
    expiryYear: {
      type: Number,
      
    },
    cvv: {
      type: String,
      
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Card", cardSchema);
