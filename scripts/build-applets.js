#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Directories to skip — not applets
const SKIP_DIRS = new Set(["system", "system_storage", "template", "node_modules"]);

const ROOT = path.resolve(__dirname, "..", "..");

function log(msg) {
  console.log(msg);
}

function getAppletDirs() {
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SKIP_DIRS.has(entry.name))
    .map((entry) => entry.name)
    .filter((name) => {
      const pkgPath = path.join(ROOT, name, "package.json");
      if (!fs.existsSync(pkgPath)) return false;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      return pkg.scripts && pkg.scripts.build;
    });
}

function getMostRecentZip(distDir) {
  if (!fs.existsSync(distDir)) return null;
  const zips = fs
    .readdirSync(distDir)
    .filter((f) => f.endsWith(".zip"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(distDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return zips.length > 0 ? zips[0].name : null;
}

function versionFromZipName(zipName) {
  // zip names follow: app-{major}.{minor}.{dev}.zip
  const match = zipName.match(/^app-(.+)\.zip$/);
  return match ? match[1] : null;
}

async function main() {
  const requested = process.argv.slice(2);
  const allApplets = getAppletDirs();

  let applets;
  if (requested.length > 0) {
    const unknown = requested.filter((name) => !allApplets.includes(name));
    if (unknown.length > 0) {
      console.error(`Unknown applet(s): ${unknown.join(", ")}`);
      console.error(`Available: ${allApplets.join(", ")}`);
      process.exit(1);
    }
    applets = requested;
  } else {
    applets = allApplets;
  }

  if (applets.length === 0) {
    log("No applets found.");
    process.exit(0);
  }

  log(`Building: ${applets.join(", ")}\n`);

  const results = [];

  for (const applet of applets) {
    const appletDir = path.join(ROOT, applet);
    log(`=== Building ${applet} ===`);
    try {
      execSync("npm run build", {
        cwd: appletDir,
        stdio: "inherit",
        shell: true,
      });

      const distDir = path.join(appletDir, "dist");
      const zipName = getMostRecentZip(distDir);

      if (!zipName) {
        log(`  ! No zip found in ${distDir} after build\n`);
        results.push({ applet, success: false, reason: "no zip produced" });
        continue;
      }

      const version = versionFromZipName(zipName);
      const destName = version ? `${applet}-${version}.zip` : `${applet}.zip`;
      const srcPath = path.join(distDir, zipName);
      const destPath = path.join(ROOT, destName);

      fs.copyFileSync(srcPath, destPath);
      log(`  ✓ Copied to ${destName}\n`);
      results.push({ applet, success: true, dest: destName });
    } catch (err) {
      log(`  ✗ Build failed: ${err.message}\n`);
      results.push({ applet, success: false, reason: err.message });
    }
  }

  log("=== Summary ===");
  for (const r of results) {
    if (r.success) {
      log(`  ✓ ${r.applet} → ${r.dest}`);
    } else {
      log(`  ✗ ${r.applet}: ${r.reason}`);
    }
  }

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
