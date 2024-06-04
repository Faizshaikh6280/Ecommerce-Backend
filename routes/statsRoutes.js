const express = require("express");
const authController = require("../controllers/authController.js");
const statsController = require("../controllers/statsController.js");
const router = express.Router();

router.use(authController.protect);
// Below all routes are protected now.
router.use(authController.restrictTo("admin"));
// Only admin can access.

router.get("/dashboard", statsController.getDashBoardStats);
router.get("/pie-chart", statsController.getPieChart);
// router.route("/bar-chart").delete(statsController.getBarChart);
// router.route("/line-chart").delete(statsController.getLineChart);

module.exports = router;
