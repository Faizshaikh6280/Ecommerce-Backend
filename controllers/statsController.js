const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const { calcChangeRate } = require("../utils/helper");
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

    const productCountBasedOnCategory = await productModel.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $addFields: {
          category: "$_id",
          stockPercentage: {
            $round: [
              {
                $multiply: [{ $divide: ["$count", productCount] }, 100],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
      {
        $sort: { numTourStarts: -1 },
      },
    ]);

    const orderMonthlyCount = Array(6).fill(0);
    const orderMonthlyRevenue = Array(6).fill(0);

    orderLastSixMonth.forEach((order) => {
      const createdAt = order.createdAt;
      let monthDiff = today.getMonth() - createdAt.getMonth();

      if (monthDiff >= 0) {
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
    stats = {
      changeRate,
      count,
      productCountBasedOnCategory,
      charts,
    };

    return res.status(200).json({
      status: "success",
      data: stats,
    });
  }
});
