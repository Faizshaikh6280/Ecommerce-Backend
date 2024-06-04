const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const {
  calcChangeRate,
  getNoOfProductBasedOnCategory,
  getPastMonthsData,
} = require("../utils/helper");
const { mycache } = require("../utils/nodeCache");

exports.getDashBoardStats = catchAsync(async (req, res, next) => {
  let stats = {};
  if (mycache.has("admin-dashboard-stats")) {
    stats = JSON.parse(mycache.get("admin-dashboard-stats"));
    return res.status(200).json({
      status: "success",
      data: stats,
    });
  } else {
    const today = new Date();
    const sixMonthAgo = new Date();
    // because we including the six month.
    // Example : curMonth-> june(5) - 5 = january(0); (jan,feb,march,april,may,june)
    sixMonthAgo.setMonth(today.getMonth() - 5);

    const thisMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };
    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };

    const thisMonthProductPromise = productModel.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthProductPromise = productModel.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const thisMonthUserPromise = userModel.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const lastMonthUserPromise = userModel.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const thisMonthOrderPromise = userModel.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const lastMonthOrderPromise = orderModel.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const [
      thisMonthProduct,
      lastMonthProduct,
      thisMonthUser,
      lastMonthUser,
      thisMonthOrder,
      lastMonthOrder,
      productCount,
      userCount,
      allOrders,
      orderLastSixMonth,
      femaleCount,
      latestFourTransaction,
    ] = await Promise.all([
      thisMonthProductPromise,
      lastMonthProductPromise,
      thisMonthUserPromise,
      lastMonthUserPromise,
      thisMonthOrderPromise,
      lastMonthOrderPromise,
      productModel.countDocuments(),
      userModel.countDocuments(),
      orderModel.find().select("total"),
      orderModel.find({
        createdAt: {
          $gte: sixMonthAgo,
          $lte: today,
        },
      }),
      userModel.countDocuments({ gender: "female" }),
      orderModel
        .find({})
        .select(["_id", "status", "orderItems", "total", "discount"])
        .sort("-createdAt")
        .limit(4),
    ]);

    const changeRate = {
      product: calcChangeRate(thisMonthProduct.length, lastMonthProduct.length),
      user: calcChangeRate(thisMonthUser.length, lastMonthUser.length),
      order: calcChangeRate(thisMonthOrder.length, lastMonthOrder.length),
    };
    const count = {
      product: productCount,
      user: userCount,
      order: allOrders.length,
      totalRevenue: allOrders.reduce((acc, cur) => acc + cur.total || 0, 0),
    };

    const productCountBasedOnCategory = await getNoOfProductBasedOnCategory(
      productCount
    );
    const [orderMonthlyCount, orderMonthlyRevenue] = getPastMonthsData(
      orderLastSixMonth,
      6,
      total
    );

    const charts = {
      orderMonthlyCount,
      orderMonthlyRevenue,
    };

    const userRatio = {
      male: userCount - femaleCount,
      female: femaleCount,
    };

    const modifiedLatestFourTransaction = latestFourTransaction.map((doc) => {
      return {
        id: doc._id,
        status: doc.status,
        quantity: doc.orderItems.length,
        amount: doc.total,
        discount: doc.discount,
      };
    });

    stats = {
      changeRate,
      count,
      productCountBasedOnCategory,
      charts,
      userRatio,
      modifiedLatestFourTransaction,
    };

    mycache.set("admin-dashboard-stats", JSON.stringify(stats));

    return res.status(200).json({
      status: "success",
      data: stats,
    });
  }
});

exports.getPieChart = catchAsync(async (req, res, next) => {
  let pieChart = {};
  if (mycache.has("pieChart-data")) {
    stats = JSON.parse(mycache.get("admin-dashboard-stats"));
    return res.status(200).json({
      status: "success",
      data: stats,
    });
  } else {
    const [productOutOfStock, productCount, allOrders, allUsers, adminUsers] =
      await Promise.all([
        productModel.countDocuments({ stock: 0 }),
        productModel.countDocuments(),
        orderModel.find(),
        userModel.find().select("dob"),
        userModel.countDocuments({ role: "admin" }),
      ]);

    //1. no. of orders based on status.
    const numOfOrdersBasedOnStatus = await orderModel.aggregate([
      {
        $group: {
          _id: "$status",
          statusCount: { $sum: 1 },
        },
      },
    ]);

    //2. no. of products based on category.
    const noOfProductsBasedOnCategory = await getNoOfProductBasedOnCategory(
      productCount
    );
    //3. In and out of stock.
    const stock = {
      in: productCount - productOutOfStock,
      out: productOutOfStock,
    };

    //4. revenue distribution
    const grossAmount = allOrders.reduce(
      (acc, order) => acc + order.total || 0,
      0
    );
    const discountAmount = allOrders.reduce(
      (acc, order) => acc + order.discount || 0,
      0
    );

    const productionCost = allOrders.reduce(
      (acc, order) => acc + order.shippingCharges || 0,
      0
    );

    const burnt = allOrders.reduce((acc, order) => acc + order.tax || 0, 0);
    const marketingCost = Math.round(grossAmount * (30 / 100));
    const netMargin =
      grossAmount - discountAmount - productCount - burnt - marketingCost;

    const revenueDistribution = {
      grossAmount,
      discountAmount,
      productionCost,
      burnt,
      marketingCost,
      netMargin,
    };

    //4. User age group.
    const userAgeGroup = {
      teen: allUsers.filter((user) => user.age < 20).length,
      adult: allUsers.filter((user) => user.age >= 20 && user.age < 40).length,
      older: allUsers.filter((user) => user.age > 40).length,
    };

    const userType = {
      admin: adminUsers,
      users: allUsers.length - adminUsers,
    };

    pieChart = {
      numOfOrdersBasedOnStatus,
      noOfProductsBasedOnCategory,
      stock,
      revenueDistribution,
      userAgeGroup,
      userType,
    };

    mycache.set("peiChart-data", JSON.stringify(pieChart));
    return res.status(200).json({
      status: "success",
      data: pieChart,
    });
  }
});

exports.getBarChart = catchAsync(async (req, res, next) => {
  let barChart = {};
  if (mycache.has("admin-barChart-data")) {
    stats = JSON.parse(mycache.get("admin-barChart-data"));
    return res.status(200).json({
      status: "success",
      data: stats,
    });
  } else {
    //1. Last six month Product,Last Six month users,last 12 month orders
    const today = new Date();
    const sixMonthAgo = new Date();
    const twelveMonthAgo = new Date();
    sixMonthAgo.setMonth(today.getMonth() - 6);
    twelveMonthAgo.setMonth(today.getMonth() - 12);
    const [sixMonthsAgoUser, sixMonthsAgoProduct, twelveMonthsAgoOrder] =
      await Promise.all([
        userModel
          .find({
            createdAt: {
              $gt: sixMonthAgo,
              $lte: today,
            },
          })
          .select("createdAt"),
        productModel
          .find({
            createdAt: {
              $gt: sixMonthAgo,
              $lte: today,
            },
          })
          .select("createdAt"),
        orderModel
          .find({
            createdAt: {
              $gt: twelveMonthAgo,
              $lte: today,
            },
          })
          .select("createdAt"),
      ]);

    const [userCount] = getPastMonthsData(sixMonthsAgoUser, 6);
    const [productCount] = getPastMonthsData(sixMonthsAgoProduct, 6);
    const [orderCount] = getPastMonthsData(twelveMonthsAgoOrder, 12);

    barChart = {
      userCount,
      productCount,
      orderCount,
    };

    mycache.set("admin-barChart-data", JSON.stringify(barChart));
    return res.status(200).json({
      status: "success",
      data: barChart,
    });
  }
});

exports.getLineChart = catchAsync(async (req, res, next) => {
  let lineChart = {};
  if (mycache.has("admin-line-data")) {
    stats = JSON.parse(mycache.get("admin-line-data"));
    return res.status(200).json({
      status: "success",
      data: stats,
    });
  } else {
    //1. Last six month Product,Last Six month users,last 12 month orders
    const today = new Date();
    const twelveMonthAgo = new Date();
    twelveMonthAgo.setMonth(today.getMonth() - 12);
    const [twelveMothsAgoUser, twelveMonthsAgoOrder] = await Promise.all([
      userModel
        .find({
          createdAt: {
            $gt: twelveMonthAgo,
            $lte: today,
          },
        })
        .select("createdAt"),
      orderModel
        .find({
          createdAt: {
            $gt: twelveMonthAgo,
            $lte: today,
          },
        })
        .select("createdAt discount total"),
    ]);

    const [userCount] = getPastMonthsData(twelveMothsAgoUser, 12);
    const [_, disCount] = getPastMonthsData(
      twelveMonthsAgoOrder,
      12,
      "discount"
    );
    const [__, revenue] = getPastMonthsData(twelveMonthsAgoOrder, 12, "total");

    lineChart = {
      monthlUser: userCount,
      monthlyDisCount: disCount,
      monthluRevenue: revenue,
    };

    mycache.set("admin-line-data", JSON.stringify(lineChart));
    return res.status(200).json({
      status: "success",
      data: lineChart,
    });
  }
});
