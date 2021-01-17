import createError from "http-errors";
import express from "express";
import logger from "morgan";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";
import cors from "cors";
import indexRouter from "./routes/index.js";
import userRouter from "./routes/login.js";
import dbRouter from "./routes/db.js";
import requireAuth from "./middleware/auth.middleware.js";

var app = express();

app.use(logger("dev"));
app.use(fileUpload({ createParentPath: true, useTempFiles: true }));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/user", userRouter);

app.use(requireAuth);
app.use("/", indexRouter);
app.use("/db", dbRouter);

app.get("/favicon.ico", (req, res) => res.status(204).end());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500).end();
});

export default app;
