const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

async function buildPackage() {
  // Read app.json to get version
  const appJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "app.json"), "utf8")
  );
  const version = `${appJson.version.major}.${appJson.version.minor}.${appJson.version.dev}`;

  const outputDir = path.resolve(__dirname, "dist");
  const zipPath = path.join(outputDir, `task-${version}.zip`);

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
      `✓ Package created: task-${version}.zip (${archive.pointer()} bytes)`
    );
    console.log(`  Version: ${version}`);
    console.log("  Package contents:");
    console.log("    - app.json (metadata)");
    console.log("    - app.png (icon)");
    console.log("    - task.js (UI bundle)");
    console.log("    - api/*.js (API handlers)");
    console.log("    - assets (Assets)");
  });

  archive.on("error", (err) => {
    throw err;
  });

  // Pipe archive data to the file
  archive.pipe(output);

  // Add files to the archive
  archive.file("app.json", { name: "app.json" });
  archive.file("app.png", { name: "app.png" });
  archive.file("dist/task.js", { name: "task.js" });

  // Add all API handler files
  archive.directory("dist/api/", "api");

  // Add all asset files
  archive.directory("dist/assets/", "assets");

  // Finalize the archive
  await archive.finalize();
}

buildPackage().catch((err) => {
  console.error("Error building package:", err);
  process.exit(1);
});
