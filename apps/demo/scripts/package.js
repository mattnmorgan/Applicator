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
      `Package created: app-${version}.zip (${archive.pointer()} bytes)`
    );
  });

  archive.on("error", (err) => {
    throw err;
  });

  // Pipe archive data to the file
  archive.pipe(output);
  archive
    .file("dist/app.json", { name: "app.json" })
    .file("dist/app.js", { name: "app.js" })
    .directory("dist/api/", "api")
    .directory("dist/apps/", "apps");

  // Add widgets directory if it exists
  const widgetsDir = path.join(outputDir, "widgets");
  if (fs.existsSync(widgetsDir)) {
    archive.directory("dist/widgets/", "widgets");
  }

  // Add agents directory if it exists
  const agentsDir = path.join(outputDir, "agents");
  if (fs.existsSync(agentsDir)) {
    archive.directory("dist/agents/", "agents");
  }

  // Add system directory if it exists
  const systemDir = path.join(outputDir, "system");
  if (fs.existsSync(systemDir)) {
    archive.directory("dist/system/", "system");
  }

  // Add assets directory if it exists
  const assetsDir = path.join(outputDir, "assets");
  if (fs.existsSync(assetsDir)) {
    archive.directory("dist/assets/", "assets");
  }

  // Add tables directory if it exists
  const tablesDir = path.join(outputDir, "tables");
  if (fs.existsSync(tablesDir)) {
    archive.directory("dist/tables/", "tables");
  }

  // Add app.png if it exists
  const appPng = path.join(outputDir, "app.png");
  if (fs.existsSync(appPng)) {
    archive.file("dist/app.png", { name: "app.png" });
  }

  await archive.finalize();
}

buildPackage().catch((err) => {
  console.error("Error building package:", err);
  process.exit(1);
});
