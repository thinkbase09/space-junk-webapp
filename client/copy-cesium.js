// client/copyCesium.js
const fs = require("fs-extra");
const path = require("path");

const source = path.join(__dirname, "node_modules", "cesium", "Build", "Cesium");
const target = path.join(__dirname, "public", "cesium");

fs.ensureDirSync(target);
fs.copySync(source, target);

console.log("✅ Cesium assets copied to public/cesium");
