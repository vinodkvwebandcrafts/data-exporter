"use strict";

const path = require("node:path");

module.exports = () => ({
  connection: {
    client: "sqlite",
    connection: {
      filename: path.join(__dirname, "..", "database", "test.db"),
    },
    useNullAsDefault: true,
  },
});
