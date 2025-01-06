const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const userRouter = require("./src/routes/user.route");
const diamondFilterRouter = require("./src/routes/diamond-filter.route");

const app = express();
dotenv.config();

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors());

app.options("*", cors());

app.get("/", async (req, res) => {
  res.status(200).send("Hello World");
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/diamond-filter", diamondFilterRouter);

app.all("*", (req, res, next) => {
  const err = new Error(`Cant't find ${req.originalUrl} on this server!`);
  err.status = "Fail";
  err.statusCode = 400;

  next(err);
});

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

process.on("uncaughtException", (err) => {
  console.log("uncaughtException! Shutting down....");
  console.log(err.name, err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close();
  process.exit(1);
});
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("DB connected");
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
