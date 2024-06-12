const jwt = require("jsonwebtoken");
const util = require("util");
const catchAsync = require("../utils/catchAsync");
const { filterObj } = require("../utils/helper");
const AppError = require("../utils/appError");
const User = require("../models/userModel");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_TIME,
  });

const createSendToken = (user, res, statusCode, message) => {
  const token = signToken(user.id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_EXPIRE_IN * 24 * 60 * 60 * 1000
    ),
    httpsOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    message,
    token,
    data: user,
  });
};

exports.signup = catchAsync(async function (req, res, next) {
  const filteredBody = filterObj(
    req.body,
    "id",
    "name",
    "photo",
    "email",
    "role",
    "dob",
    "gender",
    "isByProvider",
    "password",
    "confirmPassword"
  );
  const newUser = await User.create(filteredBody);
  createSendToken(newUser, res, 201, "User created successfully!");
});

exports.login = catchAsync(async function (req, res, next) {
  const { email, password, isByProvider, id } = req.body;
  console.log(req.body);
  if (isByProvider) {
    user = await User.findOne({ id });
    if (!user)
      return next(
        new AppError("User does not exits, Please Signup before login!")
      );
  } else {
    if (!email || !password) {
      return next(new AppError("Email or Password is missing!"));
    }
    user = await User.findOne({ email }).select("+password");
    // check whether user exists and password is correct
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError("Email or Password is incorrect", 400));
    }
    user.password = undefined;
  }
  // send token
  createSendToken(user, res, 200, "User login successsfully!");
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  //1. Check is token provided
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token || token === "null") {
    return next(
      new AppError("You are not logged in! Please login to get access")
    );
  }

  // verify token
  const decode = await util.promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  // check if user still exists
  const currentUser = await User.findOne({ id: decode.id });
  if (!currentUser) {
    return next(new AppError("User does not exits,Sign up to get access."));
  }

  //4. Check if user changed password after the token was issued.
  if (currentUser.changedPasswordAfter(decode.iat)) {
    return next(
      new AppError(
        "User recently changed password,Please Log in to get access."
      )
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  let token;

  //1. Check is token provided.
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
    //2. Verfifying token
    const decode = await util.promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET
    );
    //3. Check if user still exits.
    const currentUser = await User.findById(decode.id);
    if (!currentUser) {
      return next();
    }

    //4. Check if user changed password after the token was issued.
    if (currentUser.changedPasswordAfter(decode.iat)) {
      return next();
    }

    // There is a logged in user.
    res.locals.user = currentUser;
    return next();
  }
  next();
});

exports.restrictTo = function (...roles) {
  return (req, _, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You don't have permission to perform this operation.",
          403
        )
      );
    }
    next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  //1. Get Email from user.
  const { email } = req.body;
  //2. Check whether user exits with the posted email.
  const user = await User.findOne({ email });
  if (!user)
    return next(new AppError("There is no user exists with provided email!"));
  //3. Generate reset token
  const resetToken = user.createResetToken();
  await user.save({
    validateBeforeSave: false,
  });
  //4. send to email

  const url = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/reset-password/${resetToken}`;

  const message = `Forget your password? Submit a PATCH request with your new password and passwordConfirm to:${resetUrl}.\nIf you did't forget your password,please ignore this email`;

  //TODO : Sending mail

  res.status(200).json({
    status: "success",
    message: "Token sent to email",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1. Get user based on token in params.
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2. Give error if there is no user
  if (!user) return next(new AppError("Token is invalid or expired", 400));

  //3. Update password
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  createSendToken(user, res, 200, "Password Reseted successfully!");
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. Get user from collection.
  const user = await User.findById(req.user._id).select("+password");
  //2. Check is POSTed password is correct.
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your Current password is wrong!", 401));
  }
  //3. If so,update password.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4. Log user in, send jwt.
  createSendToken(user, res, 200);
});
