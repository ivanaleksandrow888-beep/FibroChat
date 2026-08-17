"use strict";

const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

module.exports = Object.freeze({
  PORT: Number(process.env.PORT) || 3000,
  ROOT_DIR,
  CLIENT_DIR: path.join(ROOT_DIR, "client"),
  DATA_DIR: path.join(ROOT_DIR, "data"),
  ATTACHMENTS_DIR: path.join(ROOT_DIR, "data", "attachments"),
  MAX_ATTACHMENT_BYTES: Math.max(1024, Number(process.env.MAX_ATTACHMENT_BYTES) || 10 * 1024 * 1024),
  DATABASE_URL: String(process.env.DATABASE_URL || "").trim(),
  DATABASE_SSL: String(process.env.DATABASE_SSL || "false").toLowerCase() === "true",
  MIGRATE_LEGACY_JSON: String(process.env.MIGRATE_LEGACY_JSON || "false").toLowerCase() === "true",
  NODE_ID: String(process.env.FIBRO_NODE_ID || "").trim(),
  NODE_REGION: String(process.env.FIBRO_NODE_REGION || "unknown").trim(),
  APP_VERSION: "0.7.0-alpha7.7",
  MAX_JSON_BODY_BYTES: Math.max(16 * 1024, Number(process.env.MAX_JSON_BODY_BYTES) || 512 * 1024),
  API_RATE_WINDOW_MS: Math.max(10_000, Number(process.env.API_RATE_WINDOW_MS) || 60_000),
  API_RATE_MAX_REQUESTS: Math.max(30, Number(process.env.API_RATE_MAX_REQUESTS) || 240),
  PUBLIC_INVITE_RATE_WINDOW_MS: Math.max(60_000, Number(process.env.PUBLIC_INVITE_RATE_WINDOW_MS) || 10 * 60_000),
  PUBLIC_INVITE_RATE_MAX_REQUESTS: Math.max(2, Number(process.env.PUBLIC_INVITE_RATE_MAX_REQUESTS) || 8),
  TURN_URLS: String(process.env.TURN_URLS || "").split(",").map(value => value.trim()).filter(Boolean),
  TURN_USERNAME: String(process.env.TURN_USERNAME || "").trim(),
  TURN_CREDENTIAL: String(process.env.TURN_CREDENTIAL || "").trim(),
  TURN_SHARED_SECRET: String(process.env.TURN_SHARED_SECRET || "").trim(),
  TURN_REALM: String(process.env.TURN_REALM || "").trim(),
  TURN_TTL_SECONDS: Math.max(300, Number(process.env.TURN_TTL_SECONDS) || 3600),
  PROTOCOL_VERSION: "1.2"
});
