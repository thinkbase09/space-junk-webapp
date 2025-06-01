const fs = require("fs-extra");
const path = require("path");

const source = path.join("node_modules", "cesium", "Build", "Cesium");
const target = path.join("public", "cesium");

fs.ensureDirSync(target);              // 폴더 없으면 만들어줌
fs.copySync(source, target);          // 복사

console.log("✅ Cesium assets copied to public/cesium");

