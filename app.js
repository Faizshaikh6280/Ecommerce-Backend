const express = require("express");
const morgan = require("morgan");
const userRouter = require("./routes/userRoutes.js");
const productRouter = require("./routes/productRoutes.js");
const statsRouter = require("./routes/statsRoutes.js");
const paymentRouter = require("./routes/paymentRoutes.js");
const orderRouter = require("./routes/orderRoutes.js");
const globalErrorHandler = require("./controllers/errorController.js");
const AppError = require("./utils/appError.js");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api/v1/user", userRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/v1/admin", statsRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
