"use strict";

const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

module.exports = Object.freeze({
  PORT: Number(process.env.PORT) || 3000,
  ROOT_DIR,
  CLIENT_DIR: path.join(ROOT_DIR, "client"),
  DATA_DIR: path.join(ROOT_DIR, "data"),
  DATABASE_URL: String(process.env.DATABASE_URL || "").trim(),
  DATABASE_SSL: String(process.env.DATABASE_SSL || "false").toLowerCase() === "true",
  MIGRATE_LEGACY_JSON: String(process.env.MIGRATE_LEGACY_JSON || "false").toLowerCase() === "true",
  NODE_ID: String(process.env.FIBRO_NODE_ID || "").trim(),
  NODE_REGION: String(process.env.FIBRO_NODE_REGION || "unknown").trim(),
  APP_VERSION: "0.4.1",
  PROTOCOL_VERSION: "1.1"
});
