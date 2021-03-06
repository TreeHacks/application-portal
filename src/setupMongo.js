const MongodbMemoryServer = require('mongodb-memory-server');

const mongoServer = new MongodbMemoryServer.MongoMemoryServer({
  binary: { version: "latest" },
  instance: { port: 65210, dbName: "test" }
});

// mongoose.Promise = Promise;
console.warn("Setting up mongodb server...");
module.exports = async function () {
  await mongoServer.getConnectionString().then((uri) => {
    process.env.MONGODB_URI = uri;
    console.log("Mongodb server running on url", uri);

    // Set reference to mongod in order to close the server during teardown.
    global.__MONGOD__ = mongoServer;
  });
};