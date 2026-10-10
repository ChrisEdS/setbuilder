const packager = require("@electron/packager");
const path = require("path");

const appDir = path.join(__dirname, "..");

if (process.platform !== "darwin" || process.arch !== "arm64") {
  console.error(
    "SETFORM.app muss auf einem Apple-Silicon-Mac gebaut werden " +
      `(dieser Rechner ist ${process.platform} ${process.arch}).`,
  );
  console.error("Im Ordner setform-mac: npm install && npm run dist");
  process.exit(1);
}

packager({
  dir: appDir,
  name: "SETFORM",
  platform: "darwin",
  arch: "arm64",
  out: path.join(appDir, "dist"),
  overwrite: true,
  asar: true,
  extraResource: [
    path.join(appDir, "bundle", "setform"),
    path.join(appDir, "bundle", "env.example"),
  ],
  appBundleId: "de.setform.desktop",
  appCategoryType: "public.app-category.music",
  darwinDarkModeSupport: true,
  ignore: [/^\/bundle($|\/)/, /^\/dist($|\/)/, /^\/scripts($|\/)/],
})
  .then((paths) => {
    console.log(`App gebaut: ${paths[0]}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
