const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const { mycache, invalidCache } = require("../utils/nodeCache");

// Need to invalid cache here.
exports.createOrder = catchAsync(async (req, res) => {
  const newOrder = await Order.create(req.body);

  // Reducing stock of given order.
  newOrder.orderItems.forEach(async (item) => {
    const product = await Product.findById(item.productId);
    product.stock -= item.quantity;
    await product.save();
  });

  invalidCache({ order: true, userId: req.user.id });

  res.status(201).json({
    status: "success",
    data: newOrder,
  });
});

exports.getMyOrders = catchAsync(async (req, res) => {
  let myOrders;

  let key = `myorders-${req.user.id}`;
  if (mycache.has(key)) {
    myOrders = JSON.parse(mycache.get(key));
  } else {
    myOrders = await Order.find({ user: req.user.id });
    mycache.set(key, JSON.stringify(myOrders));
  }

  res.status(200).json({
    status: "success",
    length: myOrders.length,
    data: myOrders,
  });
});

exports.getAllOrders = catchAsync(async (req, res) => {
  let orders;

  let key = "admin-orders";
  if (mycache.has(key)) {
    orders = JSON.parse(mycache.get(key));
  } else {
    orders = await Order.find();
    mycache.set(key, JSON.stringify(orders));
  }

  res.status(200).json({
    status: "success",
    length: orders.length,
    data: orders,
  });
});

exports.getOrder = catchAsync(async (req, res) => {
  let order;
  let key = `order-${req.params.id}`;

  if (mycache.has(key)) {
    order = JSON.parse(mycache.get(key));
  } else {
    order = await Order.find({ _id: req.params.id });
    if (!order) return next("Cannot find Order with given ID!");
    mycache.set(key, JSON.stringify(order));
  }
  res.status(200).json({
    status: "success",
    data: order,
  });
});

// Need to invalid cache here.
exports.deleteOrder = catchAsync(async (req, res) => {
  const order = await Order.findByIdAndDelete({ _id: req.params.id });
  if (!order) return next("Cannot find Order with given ID!");

  invalidCache({ order: true, userId: order.user, itemId: order._id });

  res.status(204).json({
    status: "success",
    message: "Order deleted successfully!",
    data: order,
  });
});

exports.processOrder = catchAsync(async (req, res) => {
  const order = await Order.findById({ _id: req.params.id });
  if (!order) return next("Cannot find Order with given ID!");

  switch (order.status) {
    case "processing":
      order.status = "shipped";
      break;
    case "shipped":
      order.status = "delivered";
      break;
    default:
      order.status = "delivered";
  }
  await order.save();

  invalidCache({
    order: true,
    userId: order.user,
    itemId: order._id,
  });

  res.status(204).json({
    status: "success",
    message: "Order deleted successfully!",
    data: order,
  });
});
