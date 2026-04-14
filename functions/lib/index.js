"use strict";

const legacy = require("../index.js");

let security = {};
try {
  security = require("./security");
} catch {
  security = {};
}

module.exports = {
  ...legacy,
  ...(security.onSecurityLogCreated
    ? { onSecurityLogCreated: security.onSecurityLogCreated }
    : {}),
};
