import express from "express";
var router = express.Router();

import db from "../db/index.js";

router.get("/page/:page", async (req, res) => {
  let page = req.params.page;
  let data = await db.getImagePage();
  if (data.length > 0) {
    res.status(200).send(data);
  } else {
    res.status(404).end();
  }
});

export default router;
