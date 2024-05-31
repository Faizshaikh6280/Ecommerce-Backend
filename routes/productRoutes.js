const express = require("express");
const productController = require("../controllers/productController");
const authController = require("../controllers/authController");
const upload = require("../utils/multer");

const router = express.Router();

// Below all routes will be protected now
router.post(
  "/new",
  authController.restrictTo("admin"),
  upload.single("photo"),
  productController.createProduct
);

router.use(authController.protect);

router.get("/all", productController.getAllProducts);
router.get("/all-categories", productController.getAllCategories);
router.get("/latest-products", productController.getLatestProducts);
router.get("/admin-products", productController.adminProducts);

router.use(authController.restrictTo("admin"));
router
  .route("/:id")
  .get(productController.getProduct)
  .patch(upload.single("photo"), productController.updateProduct)
  .delete(productController.deleteProduct);

module.exports = router;
