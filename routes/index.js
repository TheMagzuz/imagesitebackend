import express from "express";
var router = express.Router();

import { v4 as uuid } from "uuid";
import path from "path";
//import fs from "fs";

import db from "../db/index.js";

import aws from "aws-sdk";
aws.config.update({ region: "eu-central-1" });
const BUCKET_NAME = "imagesite-content";

const s3 = new aws.S3();

const videoExtensions = [".mp4", ".mov", ".webm", ".gif"];

/* POST: Upload Image */
router.post("/", async function (req, res) {
  if (!req.files) {
    res.status(400).send("No file given");
    return;
  }
  let image = req.files.photo;
  let imageId = uuid();
  let extension = path.extname(image.name);
  let imageName = imageId + extension;

  // Upload image file
  await s3
    .upload({
      Bucket: BUCKET_NAME,
      Key: imageName,
      Body: image.data,
    })
    .promise();

  let imageData = {
    id: imageId,
    tags: req.body.tags.split(" "),
    path: imageName,
    thumbnailPath: imageName,
    upvotes: 0,
    isAlbum: extension == ".zip",
    isVideo: videoExtensions.includes(extension),
  };

  db.addImage(imageData);

  res.status(200).send(imageId).end();
});

export default router;
