const sendErrorDev = function (err, req, res) {
  // A:) Check for API Error
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }

  //B:) Check Redndered webiste Errror
  console.log("Error💥", err);
  res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: err.message,
  });
};

const sendErrorProd = function (err, req, res) {
  // A:) Check for API Error
  if (req.originalUrl.startsWith("/api")) {
    // 1. Check is operational Error
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    //2. Programmming or unknown error : Don't leak error details,
    console.error("ERROR 💥", err);
    return res.status(err.statusCode).json({  
      status: "error",
      message: "Something went wrong!",
    });
  }

  // B:) Check for Render website Error

  // 1. Check is operational Error
  if (err.isOperational) {
    return res.status(err.statusCode).render({
      title: "Error",
      message: err.message,
    });
  }
  //2. Programmming or unknown error : Don't leak error details,
  console.error("ERROR 💥", err);
  return res.status(err.statusCode).render({
    title: "error",
    message: "Please try again later",
  });
};

module.exports = function (err, req, res, next) {
  console.log(process.env.NODE_ENV);
  err.statusCode ||= 400;
  err.status ||= "Error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    sendErrorProd(err, req, res, next);
  }
};
