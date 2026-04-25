require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const routes = require("./routes");
const errorHandler = require("./middlewares/error");

const app = express();

// CORS full open sementara
app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads"))
);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Dimsum API running" });
});

app.use("/api", routes);
app.use(errorHandler);

module.exports = app;