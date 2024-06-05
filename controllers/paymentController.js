const catchAsync = require("../utils/catchAsync");
const Coupon = require("../models/couponModel");
const AppError = require("../utils/appError");
const stripe = require("../services/stripe");

exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const {amount} = req.body;

  if(!amount) return next(new AppError("Amount is not provided!"));
  const paymentIntent = await stripe.paymentIntents.create({
    amount : Number(amount)* 100,
    currency : "inr"
  })

  res.status(201).json({
    status : "success",
    clintSecret : paymentIntent.client_secret
  })

});

exports.applyDiscount = catchAsync(async (req, res, next) => {
  const { coupon } = req.query;
  const couponDoc = await Coupon.findOne({ code: coupon });
  if (!couponDoc) return next(new AppError("Coupon is inavlid"));
  res.status(200).json({
    status: "success",
    data: couponDoc,
  });
});

exports.createCoupon = catchAsync(async (req, res, next) => {
  const { coupon, amount } = req.body;

  if (!coupon || !amount) {
    return next("coupon or amount is missing");
  }

  const couponDoc = await Coupon.create({
    code: coupon,
    amount,
  });

  res.status(201).json({
    status: "success",
    message: `Coupon ${couponDoc.code} is created!`,
  });
});

exports.getAllCoupon = catchAsync(async (req, res, next) => {
  const coupons = await Coupon.find();
  res.status(200).json({
    status: "success",
    length: coupons.length,
    data: coupons,
  });
});

exports.deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    return next("No product found with given ID", 404);
  }

  res.status(204).json({
    status: "success",
    message: `Coupon ${coupon.code} deleted successfully!`,
    data: coupon,
  });
});
