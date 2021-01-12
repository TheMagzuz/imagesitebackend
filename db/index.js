import { MongoClient } from "mongodb";

const dbUrl = "mongodb://" + process.env.MONGO_IP;

const client = new MongoClient(dbUrl);

const pageSize = 10;

await client.connect();
const database = client.db("imagesite");
const imagesCollection = database.collection("images");
const albumsCollection = database.collection("albums");

export default {
  // GET images
  getImage: async function (id) {
    return await imagesCollection.findOne({ id: id });
  },
  getImagePage: async function (page) {
    return await imagesCollection
      .find()
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();
  },

  // UPDATE images
  addImage: async function (image) {
    await imagesCollection.insertOne(image);
  },
  updateImage: function (id, update) {
    const filter = { id: id };
    return imagesCollection.updateOne(filter, update);
  },
  upvoteImage: async function (id) {
    const update = { $inc: { upvotes: 1 } };
    await updateImage(id, update);
  },
  downvoteImage: async function (id) {
    const update = { $inc: { upvotes: -1 } };
    await updateImage(id, update);
  },
  updateTags: async function (id, newTags) {
    const update = { $set: { tags: newTags } };
    await updateImage(id, update);
  },

  // GET albums
  getAlbum: async function (id) {
    return await albumsCollection.findOne({ id: id });
  },

  // UPDATE albums
  updateAlbum: function (id, update) {
    const filter = { id: id };
    return albumsCollection.updateOne(filter, update);
  },
};
