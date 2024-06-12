const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgetPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

// Below all routes will be protected now
router.get("/:id", userController.getUser);
module.exports = router;
