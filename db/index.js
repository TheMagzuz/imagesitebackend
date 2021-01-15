import mongo from "mongodb";
const MongoClient = mongo.MongoClient;
import dotenv from "dotenv";
dotenv.config();

if (process.env.USE_DB != "false") {
  const dbUrl = "mongodb://" + process.env.MONGO_IP;

  const client = new MongoClient(dbUrl, { useUnifiedTopology: true });

  const pageSize = 10;

  await client.connect();
  const database = client.db("imagesite");
  const imagesCollection = database.collection("images");
  const albumsCollection = database.collection("albums");
} else {
  console.log("Starting without database support");
}
export default {
  // GET images
  getImage: async function (id) {
    return await imagesCollection.findOne({ id: id });
  },
  getImagePage: async function (page, sort, searchQuery) {
    let inTags = [];
    let ninTags = [];

    if (searchQuery) {
      for (var tag of searchQuery.split(" ")) {
        if (tag.startsWith("!")) {
          ninTags.push(tag.substr(1));
        } else {
          inTags.push(tag);
        }
      }
    }

    let filter = { tags: {} };

    if (inTags.length > 0) {
      filter.tags.$in = inTags;
    }
    if (ninTags.length > 0) {
      filter.tags.$nin = ninTags;
    }
    if (!filter.tags.$in && !filter.tags.$nin) {
      filter = {};
    }

    let cursor = imagesCollection.find(filter);

    if (sort.sortBy == "upvotes") {
      cursor = cursor.sort({ upvotes: sort.reverse ? 1 : -1 });
    } else {
      cursor = cursor.sort({ _id: sort.reverse ? 1 : -1 });
    }

    return await cursor
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();
  },

  // UPDATE images
  addImage: async function (image) {
    return await imagesCollection.insertOne(image);
  },
  updateImage: async function (id, update) {
    const filter = { id: id };
    return await imagesCollection.updateOne(filter, update);
  },
  upvoteImage: async function (id) {
    const update = { $inc: { upvotes: 1 } };
    return await this.updateImage(id, update);
  },
  downvoteImage: async function (id) {
    const update = { $inc: { upvotes: -1 } };
    return await this.updateImage(id, update);
  },
  updateTags: async function (id, newTags) {
    const update = { $set: { tags: newTags } };
    return await this.updateImage(id, update);
  },

  // GET albums
  getAlbum: async function (id) {
    return await albumsCollection.findOne({ id: id });
  },

  // UPDATE albums
  updateAlbum: async function (id, update) {
    const filter = { id: id };
    return await albumsCollection.updateOne(filter, update);
  },
};
