import express from "express";
var router = express.Router();

import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";

import aws from "aws-sdk";
aws.config.update({ region: "eu-central-1" });
const BUCKET_NAME = "imagesite-content";

const s3 = new aws.S3();

const bucketParams = {
  Bucket: BUCKET_NAME,
};

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
  let data = await s3
    .upload({
      Bucket: BUCKET_NAME,
      Key: imageName,
      Body: image.data,
    })
    .promise();
  console.log(data);
  res.status(200).send(imageId).end();
});

export default router;
