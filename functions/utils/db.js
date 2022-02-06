const mongoose = require("mongoose");
const { MONGO_URL } = require("./config");

mongoose
  .connect(MONGO_URL, {
    // keepAlive: true, TODO:
    useNewUrlParser: true,
  })
  .then(() => console.error("DB connection is successful."))
  .catch((err) => console.error(err));

module.exports = mongoose.connection;
