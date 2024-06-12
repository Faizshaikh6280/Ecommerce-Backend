const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");
const AppError = require("../utils/appError");

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.find({ id: req.params.id });
  if (!user)
    return next(new AppError("User does not exists with given ID", 400));

  res.status(200).json({
    status: "succes",
    data: user,
  });
});
