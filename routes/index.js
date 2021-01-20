import express from "express";
var router = express.Router();

import { v4 as uuid } from "uuid";
import path from "path";
import extract from "extract-zip";
import fs from "fs/promises";
import naturalSort from "natural-sort";
import FfmpegCommand from "fluent-ffmpeg";
import { once } from "events";

import mime from "mime-types";

import db from "../db/index.js";

import aws from "aws-sdk";
aws.config.update({ region: "eu-central-1" });
const BUCKET_NAME = "imagesite-content";
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

// The number of bytes a file has to be for it to be streamed
const STREAM_LIMIT = 10000000;

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
      Body: await fs.readFile(image.tempFilePath),
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

  await db.addImage(imageData);

  if (imageData.isAlbum) {
    await image.mv("/tmp/imagesite/" + imageData.id + "/" + imageName);
    await handleAlbum(imageData);
  }
  if (imageData.isVideo) {
    const basePath = path.join("/tmp/imagesite/", imageData.id);
    await image.mv(path.join(basePath, imageName));
    await handleVideo(imageData);
  }

  fs.rmdir("/tmp/imagesite/" + imageData.id, { recursive: true });

  res.status(200).send(imageId).end();
});

/* GET: Image */
router.get("/image/:filename(*)", async (req, res) => {
  let filename = req.params.filename;

  if (!filename) {
    res.status(400).send("Invalid file name");
    return;
  }

  res.redirect(process.env.CLOUDFRONT_FULL_URL + "/" + filename);
});

/* GET: Resized image */
router.get("/thumbnail/:filename(*)", async (req, res) => {
  const filename = req.params.filename;
  const width = req.query.w;

  if (!filename) {
    res.status(400).send("Invalid file name");
    return;
  }

  const imageRequest = {
    bucket: BUCKET_NAME,
    key: filename,
    edits: {
      resize: {
        width: width,
      },
    },
  };

  const requestString = JSON.stringify(imageRequest);
  const b64Buff = Buffer.from(requestString);
  const encoded = b64Buff.toString("base64");

  res.redirect(`${CLOUDFRONT_URL}/${encoded}`);
});

async function handleAlbum(imageData) {
  const rootDir = "/tmp/imagesite/" + imageData.id + "/";
  const imagesDir = rootDir + "/ext";

  // Unzip files
  await extract(rootDir + imageData.path, { dir: imagesDir });
  let toAwait = [];

  // Get all files in the images directory
  let files = await fs.readdir(imagesDir);
  for (let file of files) {
    // Upload each file to S3
    toAwait.push(uploadAlbumFile(imageData.id, file));
  }

  // Sort the file names
  files.sort(naturalSort());
  let albumData = { id: imageData.id, images: files };

  // Register the album in the database
  toAwait.push(db.addAlbum(albumData));

  // Set the thumbnail to be the first image in the album
  let thumbnailPath = imageData.id + "/" + files[0];

  // If the first image is a video...
  if (videoExtensions.includes(path.extname(thumbnailPath))) {
    // ... create a thumbnail ...
    thumbnailPath =
      imageData.id + "/" + (await createThumbnail(files[0], imagesDir));

    // ... and upload it to S3
    toAwait.push(uploadAlbumFile(imageData.id, path.basename(thumbnailPath)));
  }

  // Update the image in the database to have the right thumbnail
  toAwait.push(
    db.updateImage(imageData.id, {
      $set: { thumbnailPath: thumbnailPath },
    })
  );

  // Wait for all the promises to finish
  await Promise.all(toAwait);
}

async function handleVideo(imageData) {
  // Create a thumbnail
  const basePath = path.join("/tmp/imagesite/", imageData.id);
  const thumbnailPath = await createThumbnail(imageData.path, basePath);

  let toAwait = [];

  // Upload the thumbnail
  toAwait.push(
    s3
      .upload({
        Bucket: BUCKET_NAME,
        Key: thumbnailPath,
        Body: await fs.readFile(path.join(basePath, thumbnailPath)),
      })
      .promise()
  );

  toAwait.push(
    db.updateImage(imageData.id, { $set: { thumbnailPath: thumbnailPath } })
  );
  await Promise.all(toAwait);
}

async function uploadAlbumFile(id, file) {
  const rootDir = "/tmp/imagesite/" + id + "/ext/";
  return s3
    .upload({
      Bucket: BUCKET_NAME,
      Key: id + "/" + file,
      Body: await fs.readFile(path.join(rootDir, file)),
    })
    .promise();
}

async function createThumbnail(videoName, basePath) {
  const thumbnailId = uuid();
  const thumbName = "thumb-" + thumbnailId + ".jpg";

  const command = new FfmpegCommand(path.join(basePath, videoName));
  await once(
    command.screenshot({
      timestamps: [0],
      filename: thumbName,
      folder: basePath,
      size: "100%",
    }),
    "end"
  );

  return thumbName;
}

export default router;
