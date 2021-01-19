import express from "express";
const router = express.Router();

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import fs from "fs";

const JWT_DURATION = "2h";
const BCRYPT_COST = 15;

import db from "../db/index.js";

const PRIVATE_KEY = fs.readFileSync("./private.key");

const ALLOW_REGISTRATION = process.env.ALLOW_REGISTRATION == "true";

router.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const user = await db.getUser(username);

  if (!user) {
    res.status(401).send("Invalid username/password");
    return;
  }

  const passwordCorrect = await bcrypt.compare(password, user.password);

  if (!passwordCorrect) {
    res.status(401).send("Invalid username/password");
    return;
  }

  const token = generateJwt(username);

  res.cookie("jwt", token).status(200).send(token);
});

router.post("/register", async (req, res, next) => {
  if (!ALLOW_REGISTRATION) {
    next();
    return;
  }

  let username = req.body.username;
  let password = req.body.password;

  if (!username || !password) {
    res.status(400).send("Invalid username/password");
    return;
  }

  const salt = await bcrypt.genSalt(BCRYPT_COST);
  const hashed = await bcrypt.hash(password, salt);

  const user = { username: username, password: hashed };
  await db.createUser(user);

  res.status(200).send("User created");
});

function generateJwt(username) {
  return jwt.sign({}, PRIVATE_KEY, {
    algorithm: "RS512",
    expiresIn: JWT_DURATION,
    subject: username,
  });
}

export default router;
