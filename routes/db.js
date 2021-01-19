import express from "express";
var router = express.Router();

import db from "../db/index.js";

router.get("/page/:page", async (req, res) => {
  let page = req.params.page;

  if (isNaN(page)) {
    res.status(400).send("Invalid page");
    return;
  }

  let sortBy = req.query.sortBy ?? "default";

  if (sortBy != "upvotes" && sortBy != "default") {
    res.status(400).send("Invalid sort");
    return;
  }

  let reverseSort = false;

  if (req.query.reverseSort == "true") {
    reverseSort = true;
  }

  let data = await db.getImagePage(
    page,
    {
      sortBy: sortBy,
      reverse: reverseSort,
    },
    req.query.search
  );
  if (data.length > 0) {
    res.status(200).send(data);
  } else {
    res.status(404).end();
  }
});

router.get("/image/:image", async (req, res) => {
  let id = req.params.image;

  if (!id) {
    res.status(400).send("Invalid image id");
    return;
  }
  let imageData = await db.getImage(id);

  if (!imageData) {
    res.status(404).send("Image not found");
    return;
  }

  res.status(200).send(imageData);
});

router.delete("/image/:image", async (req, res) => {
  let id = req.params.image;

  if (!id) {
    res.status(400).send("Invalid image id");
    return;
  }

  const result = await db.deleteImage(id);
  if (result.deletedCount <= 0) {
    res.status(404).end();
    return;
  }
  res.status(200).end();
});

router.post("/image/:image/upvote", async (req, res) => {
  let id = req.params.image;

  if (!id) {
    res.status(400).send("Invalid image id");
    return;
  }

  let result = (await db.upvoteImage(id)).result;

  if (result.nModified <= 0) {
    res.status(404).end();
    return;
  }

  res.status(200).end();
});

router.post("/image/:image/downvote", async (req, res) => {
  let id = req.params.image;

  if (!id) {
    res.status(400).send("Invalid image id");
    return;
  }

  let result = (await db.downvoteImage(id)).result;

  if (result.nModified <= 0) {
    res.status(404).end();
    return;
  }

  res.status(200).end();
});

router.post("/image/:image/settags", async (req, res) => {
  let id = req.params.image;
  let newTags = req.query.tags.split(" ");

  if (!id) {
    res.status(400).send("Invalid image id");
    return;
  }

  let result = (await db.updateTags(id, newTags)).result;

  if (result.nModified <= 0) {
    res.status(404).end();
  }

  res.status(200).end();
});

router.get("/album/:album", async (req, res) => {
  let id = req.params.album;

  if (!id) {
    res.status(400).send("Invalid album id");
    return;
  }

  let albumData = await db.getAlbum(id);

  if (!albumData) {
    res.status(404).send("Album not found");
    return;
  }

  res.status(200).send(albumData);
});

router.get("/tags", async (_req, res) => {
  const tags = await db.getTags();
  res.status(200).send(tags);
});

router.get("/randomImages", async (req, res) => {
  const search = req.query.q ?? "";
  let count = req.query.count ?? 10;
  count = parseInt(count);

  if (isNaN(count)) {
    count = 10;
  }

  const images = await db.getRandomImages(count, search);
  res.status(200).send(images);
});

export default router;
