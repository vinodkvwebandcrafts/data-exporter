"use strict";

const path = require("node:path");

module.exports = () => ({
  "data-exporter": {
    enabled: true,
    resolve: path.join(__dirname, "..", "..", "..", ".."),
  },
});
