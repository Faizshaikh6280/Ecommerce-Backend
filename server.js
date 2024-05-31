const mongoose = require("mongoose");
const debgr = require("debug")("development:mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("uncaught Exception 💥 Shutting down...");
  process.exit(1);
});

const app = require("./app");
// connection to database
mongoose
  .connect("mongodb://127.0.0.1:27017/EcommerceMERN")
  .then((c) => {
    debgr("Server connected to MongoDB");
    console.log(`DB connected`);
  })
  .catch((err) => console.log(er));

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is working on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("unhandled rejection 💥 Shutting down...");
  server.close(() => {
    process.exit(1);
  });
});
