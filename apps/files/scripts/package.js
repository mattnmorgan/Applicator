const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

async function buildPackage() {
  const appJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "app.json"), "utf8")
  );
  const version = `${appJson.version.major}.${appJson.version.minor}.${appJson.version.dev}`;
  const outputDir = path.resolve(__dirname, "..", "dist");
  const zipPath = path.join(outputDir, `app-${version}.zip`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create a write stream for the zip file
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Maximum compression
  });

  // Listen for events
  output.on("close", () => {
    console.log(
      `✓ Package created: app-${version}.zip (${archive.pointer()} bytes)`
    );
  });

  archive.on("error", (err) => {
    throw err;
  });

  // Pipe archive data to the file
  archive.pipe(output);
  archive
    .file("dist/app.json", { name: "app.json" })
    .file("dist/app.png", { name: "app.png" })
    .file("dist/app.js", { name: "app.js" })
    .directory("dist/api/", "api")
    .directory("dist/assets/", "assets")
    .directory("dist/apps/", "apps")
    .directory("dist/widgets/", "widgets");
  await archive.finalize();
}

buildPackage().catch((err) => {
  console.error("Error building package:", err);
  process.exit(1);
});
