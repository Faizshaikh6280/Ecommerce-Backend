const NodeCache = require("node-cache");
const mycache = new NodeCache();

const invalidCache = function ({ product, order, userId, itemId }) {
  if (product) {
    const productKeys = ["latest-products", "admin-products", "categories"];
    // const productIds = await Product.find().select("_id");
    // productIds.forEach((el) => productKeys.push(`product-${el._id}`));
    if (itemId) productKeys.push(`product-${itemId}`);
    mycache.del(productKeys);
  }
  if (order) {
    const orderKeys = ["admin-orders", `myorders-${userId}`];
    // const ordersId = await Product.find().select("_id");
    // ordersId.forEach((el) => orderKeys.push(`order-${el._id}`));
    if (itemId) orderKeys.push(`order-${itemId}`);
    mycache.del(orderKeys);
  }

  // It needs to be invalidate in every scnerio either order or product is updated or created.
  mycache.del([
    "admin-dashboard",
    "admin-pie-chart",
    "admin-bar-chart",
    "admin-line-chart",
  ]);
};

module.exports = { mycache, invalidCache };
