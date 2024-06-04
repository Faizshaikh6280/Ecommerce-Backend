const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const {
  calcChangeRate,
  getNoOfProductBasedOnCategory,
} = require("../utils/helper");
const { mycache } = require("../utils/nodeCache");

exports.getDashBoardStats = catchAsync(async (req, res, next) => {
  let stats = {};
  if (mycache.has("dashboard-stats")) {
    stats = JSON.parse(mycache.get("dashboard-stats"));
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
    const orderMonthlyCount = Array(6).fill(0);
    const orderMonthlyRevenue = Array(6).fill(0);

    orderLastSixMonth.forEach((order) => {
      const createdAt = order.createdAt;
      let monthDiff = today.getMonth() - createdAt.getMonth();

      if ((monthDiff >= 0) & (monthDiff < 6)) {
        orderMonthlyCount[5 - monthDiff] = +1;
        orderMonthlyRevenue[5 - monthDiff] += order.total;
      } else {
        let count = 0;
        let n1 = today.getMonth();
        while (n1 != createdAt.getMonth()) {
          n1--;
          count++;
          if (n1 === 0) {
            n1 = 11;
          }
        }
        count++;
        monthDiff = count;
      }
    });
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

    mycache.set("dashboard-stats", JSON.stringify(stats));

    return res.status(200).json({
      status: "success",
      data: stats,
    });
  }
});

exports.getPieChart = catchAsync(async (req, res, next) => {
  let pieChart = {};
  if (mycache.has("pieChart-data")) {
    stats = JSON.parse(mycache.get("dashboard-stats"));
    return res.status(200).json({
      status: "success",
      data: stats,
    });
  } else {
    const [productOutOfStock, productCount, allOrders] = await Promise.all([
      productModel.countDocuments({ stock: 0 }),
      productModel.countDocuments(),
      orderModel.find(),
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
    pieChart = {
      numOfOrdersBasedOnStatus,
      noOfProductsBasedOnCategory,
      stock,
    };
    const revenueDistribution = {
      grossAmount,
      discountAmount,
      productionCost,
      burnt,
      marketingCost,
      netMargin,
    };
    mycache.set("peiChart-data", JSON.stringify(pieChart));
    return res.status(200).json({
      status: "success",
      data: pieChart,
      revenueDistribution,
    });
  }
});
