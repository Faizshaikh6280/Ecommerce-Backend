const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  filename: function (req, file, cb) {
    const uniqueFilename = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueFilename}${ext}`);
  },
});

const upload = multer({ storage });
module.exports = upload;
