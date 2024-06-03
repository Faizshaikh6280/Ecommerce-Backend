const productModel = require("../models/productModel");

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) newObj[key] = obj[key];
  });

  return newObj;
};

const calcChangeRate = (thisMonth, lastMonth) => {
  if (lastMonth === 0) return thisMonth * 100;
  const perc = ((thisMonth - lastMonth) / lastMonth) * 100;
  return Number(perc.toFixed(0));
};
const getNoOfProductBasedOnCategory = async function(productCount){
  const result = await productModel.aggregate([
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
  return result;

}
module.exports = { filterObj, calcChangeRate,getNoOfProductBasedOnCategory };
