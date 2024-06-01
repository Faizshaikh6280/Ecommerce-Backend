const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, "Amount is required!"],
  },
  code: {
    type: String,
    required: [true, "Code is required"],
  },
});

module.exports = mongoose.model("Coupon", couponSchema);
