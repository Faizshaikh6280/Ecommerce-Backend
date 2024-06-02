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

module.exports = { filterObj, calcChangeRate };
