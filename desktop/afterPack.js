// electron-builder leaves out node_modules folders in extraResources, but Slyd's server
// needs its own. So the server is copied in here, after packing and before signing.
const { cpSync } = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack({ appOutDir, packager, electronPlatformName }) {
  const resources =
    electronPlatformName === "darwin"
      ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(appOutDir, "resources");
  cpSync(path.join(__dirname, "server"), path.join(resources, "server"), { recursive: true });
};
