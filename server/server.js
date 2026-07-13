"use strict";

const { startServer } = require("./application");

startServer().catch((error) => {
  console.error("FibroChat failed to start:", error);
  process.exit(1);
});
