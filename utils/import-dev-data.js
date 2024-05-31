const Product = require("../models/productModel");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { faker } = require("@faker-js/faker");

dotenv.config({ path: "./config.env" });

mongoose
  .connect("mongodb://127.0.0.1:27017/EcommerceMERN")
  .then((c) => {
    console.log(`DB connected`);
  })
  .catch((err) => console.log(er));

const importData = async function (num) {
  try {
    const products = [];
    for (let i = 1; i <= num; i++) {
      const product = {
        name: faker.commerce.product(),
        price: faker.commerce.price({ min: 100, max: 200, dec: 0 }),
        stock: faker.commerce.price({ min: 0, max: 50, dec: 0 }),
        category: faker.commerce.department(),
        photo: "f8330a10-3fde-4b44-b064-6e5d2a10e2ae.JPG",
        createdAt: new Date(faker.date.past()),
        updatedAt: new Date(faker.date.recent()),
      };
      products.push(product);
    }

    await Product.create(products);
  } catch (error) {
    console.log(error);
  } finally {
    process.exit();
  }
};

const deleteData = async function () {
  try {
    await Product.deleteMany().skip(3);
  } catch (error) {
    console.log(error);
  } finally {
    process.exit();
  }
};

if (process.argv[2] === "--import") {
  importData(41);
} else if (process.argv[2] === "--delete") {
  deleteData();
}
