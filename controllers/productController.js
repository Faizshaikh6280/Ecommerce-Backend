const catchAsync = require("../utils/catchAsync");
const fs = require("fs");
const Product = require("../models/productModel");
const { filterObj } = require("../utils/helper");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const { mycache, invalidCache } = require("../utils/nodeCache");

exports.createProduct = catchAsync(async (req, res, next) => {
  const filtereBody = filterObj(req.body, "name", "price", "stock", "category");
  if (!req.file) {
    return next(new AppError("Please add photo for product.", 400));
  }

  if (!(Object.keys(filtereBody).join(",") === "name,price,stock,category")) {
    fs.rm(req.file.path, () => {
      console.log("Unwanted photo deleted succesfully!");
    });
    return next(new AppError("All fields must be added"));
  }

  filtereBody.photo = req.file.filename;
  const newProduct = await Product.create(filtereBody);
  invalidCache({ product: true });
  res.status(201).json({
    status: "success",
    message: "New product created successfully!",
    data: newProduct,
  });
});

// Need to invalid cache on create,delete,update  and on new order.
exports.getProduct = catchAsync(async (req, res, next) => {
  let product;
  if (mycache.has(`product-${req.params.id}`)) {
    product = JSON.parse(mycache.get(`product-${req.params.id}`));
  } else {
    product = await Product.findById(req.params.id);
    if (!product) {
      return next(new AppError("No document found with that ID", 404));
    }
    mycache.set(`product-${req.params.id}`, JSON.stringify(product));
  }
  res.status(200).json({
    status: "success",
    message: "Product found successfully!",
    data: product,
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return next("No product found with given ID", 404);
  }

  invalidCache({ product: true, itemId: product._id });

  res.status(204).json({
    status: "success",
    message: "Product deleted successfully!",
    data: product,
  });
});
// Need to invalid cache on create,delete,update & on new order.
exports.getLatestProducts = catchAsync(async (req, res, next) => {
  let latestProducts;
  if (mycache.has("latest-products")) {
    latestProducts = JSON.parse(mycache.get("latest-products"));
  } else {
    latestProducts = await Product.find().sort("-createdAt").limit(5);
    mycache.set(`latest-products`, JSON.stringify(latestProducts));
  }
  res.status(200).json({
    status: "success",
    length: 5,
    data: latestProducts,
  });
});

// Need to invalid cache on create,delete,update & on new order.
exports.updateProduct = catchAsync(async (req, res, next) => {
  //1. update fields.
  const filtereBody = filterObj(req.body, "name", "price", "stock", "category");

  //2.if there is new photo then Delete old photo
  const product = await Product.findById(req.params.id);
  if (req.file) {
    fs.rm(`./public/images/${product.photo}`, () => {
      console.log("Old photo deleted succesfully!");
    });
    filtereBody.photo = req.file.filename;
  }

  Object.keys(filtereBody).forEach((el) => (product[el] = filtereBody[el]));
  await product.save();
  invalidCache({ product: Product, itemId: product._id });
  res.status(200).json({
    status: "success",
    message: "Product updated successfully!",
    data: product,
  });
});

// Need to invalid cache on create,delete,update & on new order.
exports.adminProducts = catchAsync(async (req, res, next) => {
  let products;

  if (mycache.has("admin-products")) {
    products = JSON.parse(mycache.get("admin-products"));
  } else {
    products = await Product.find();
    mycache.set(`admin-products`, JSON.stringify(products));
  }

  res.status(200).json({
    status: "success",
    length: products.length,
    data: products,
  });
});

exports.getAllProducts = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Product.find(), req.query)
    .search()
    .filter()
    .limitFields()
    .pagination()
    .sort();

  const products = await features.DBquery;

  res.status(200).json({
    status: "success",
    length: products.length,
    data: products,
  });
});

// Need to invalid cache on create,delete,update & on new order.
exports.getAllCategories = catchAsync(async (req, res, next) => {
  let categories;
  if (mycache.has("categories")) {
    categories = JSON.parse(mycache.get("categories"));
  } else {
    categories = await Product.distinct("category");
    mycache.set(`categories`, JSON.stringify(categories));
  }

  res.status(200).json({
    status: "success",
    length: categories.length,
    data: categories,
  });
});
