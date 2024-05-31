const express = require("express");
const orderController = require("../controllers/orderController.js");
const authController = require("../controllers/authController.js");
const router = express.Router();

router.use(authController.protect);
// Below all routes are protected now.
router.post("/new", orderController.createOrder);
router.get("/my-order", orderController.getMyOrders);
router.get("/admin-order", orderController.getAllOrders);

router.use(authController.restrictTo("admin"));
// These routes can access by admin only!
router
  .route("/:id")
  .get(orderController.getOrder)
  .delete(orderController.deleteOrder);

module.exports = router;
