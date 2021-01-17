import jwt from "jsonwebtoken";
import fs from "fs";

const PUBLIC_KEY = fs.readFileSync("./public.key");

export default async function (req, res, next) {
  let token = req.header("Authorization");

  if (!token) {
    res.status(401).send("Access denied");
    return;
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length).trimLeft();
  }

  try {
    const verified = jwt.verify(token, PUBLIC_KEY);
    if (verified) {
      next();
    } else {
      res.status(401).send("Unauthorized");
      return;
    }
  } catch (err) {
    res.status(400).send("Invalid token");
    return;
  }
}
