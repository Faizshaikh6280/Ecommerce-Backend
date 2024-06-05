const express = require("express");
const authController = require("../controllers/authController.js");
const paymentController = require("../controllers/paymentController.js");
const router = express.Router();

router.use(authController.protect);
// Below all routes are protected now.
router.get("/discount", paymentController.applyDiscount);
router.post("/create", paymentController.createPaymentIntent);

router.use(authController.restrictTo("admin"));
// Only admin can access.
router.post("/new-coupon", paymentController.createCoupon);
router.get("/all-coupon", paymentController.getAllCoupon);
router.route("/coupon/:id").delete(paymentController.deleteCoupon);

module.exports = router;
