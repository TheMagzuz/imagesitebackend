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

/* GET: Image */
router.get("/image/:filename(*)", async (req, res) => {
  let filename = req.params.filename;

  if (!filename) {
    res.status(400).send("Invalid file name");
    return;
  }

  console.log(filename);

  let data;

  try {
    data = await s3.getObject({ Key: filename, Bucket: BUCKET_NAME }).promise();
  } catch (e) {
    if (e.code == "NoSuchKey") {
      res.status(404).send("File not found");
      return;
    } else {
      res.status(500).end();
      return;
    }
  }

  res.write(data.Body);
  res.status(200);
  res.end();
});

export default router;
