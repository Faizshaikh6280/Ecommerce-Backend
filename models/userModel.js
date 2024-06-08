const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, "Id is mandatory"],
      unique: [true, "Id must be unique"],
    },
    name: {
      type: String,
      required: [true, "Name is mandatory"],
    },
    photo: {
      type: String,
      default: "default.jpg",
    },
    email: {
      type: String,
      required: [true, "Email is mandatory"],
      validate: [validator.isEmail, "Please provide a valid email."],
      unique: [true, "Email should be unique"],
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Role can be either user or admin",
      },
      default: "user",
    },
    dob: {
      type: Date,
      required: [true, "Please enter Date of birth"],
    },
    gender: {
      type: String,
    },
    password: {
      type: String,
      minlength: 4,
      select: false,
    },
    confirmPassword: {
      type: String,
      minlength: 4,
      select: false,
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same!",
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    isByProvider : {
      type : Boolean,
      default : false,
    }
  },
  {
    timestamps: true,
  }
);

userSchema.virtual("age").get(function () {
  const today = new Date();
  const dob = this.dob;
  let age = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age;
});

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.confirmPassword = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
