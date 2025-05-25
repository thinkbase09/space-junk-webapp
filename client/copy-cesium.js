// client/copy-cesium.js
const path = require("path");
const fse = require("fs-extra");

const source = path.join(__dirname, "public", "cesium");
const destination = path.join(__dirname, "build", "cesium");

fse.copy(source, destination)
  .then(() => console.log("✅ Cesium assets copied!"))
  .catch((err) => {
    console.error("❌ Cesium copy failed:", err);
    process.exit(1);
  });
