import path from "path";
import AdmZip from "adm-zip";
import AppPackage from "@/lib/system/installation/types/package";

/**
 * Extract and parse an app package zip file
 * @param fileBuffer The zip file buffer
 * @returns Extracted package contents
 * @throws Error if package is invalid or missing required files
 */
export async function extractAppPackage(
  fileBuffer: Buffer
): Promise<AppPackage> {
  const zip = new AdmZip(fileBuffer);
  const zipEntries = zip.getEntries();

  // Extract app.json
  const appJsonEntry = zipEntries.find((e) => e.entryName === "app.json");
  if (!appJsonEntry) {
    throw new Error("Invalid app package: missing app.json");
  }

  const appAttributes = JSON.parse(appJsonEntry.getData().toString("utf8"));

  // Extract UI bundle
  const bundleEntry = zipEntries.find((e) => e.entryName === "app.js");
  if (!bundleEntry) {
    throw new Error("Invalid app package: missing UI bundle (app.js)");
  }

  const uiBundle = bundleEntry.getData().toString("utf8");

  // Extract icon if present
  const iconEntry = zipEntries.find(
    (e) => e.entryName === "app.png" || e.entryName === "app.jpg"
  );
  const iconData = iconEntry ? iconEntry.getData() : null;

  // Extract API handlers
  const apiHandlers = new Map<string, Buffer>();
  const apiEntries = zipEntries.filter(
    (e) => e.entryName.startsWith("api/") && e.entryName.endsWith(".js")
  );
  for (const entry of apiEntries) {
    const handlerName = path.basename(entry.entryName, ".js");
    apiHandlers.set(handlerName, entry.getData());
  }

  // Extract assets
  const assets = new Map<string, Buffer>();
  const assetsEntries = zipEntries.filter(
    (e) => e.entryName.startsWith("assets/") && !e.isDirectory
  );
  for (const entry of assetsEntries) {
    assets.set(entry.entryName, entry.getData());
  }

  // Extract tables directory (formula and validator scripts)
  const tables = new Map<string, Buffer>();
  const tablesEntries = zipEntries.filter(
    (e) => e.entryName.startsWith("tables/") && !e.isDirectory
  );
  for (const entry of tablesEntries) {
    tables.set(entry.entryName, entry.getData());
  }

  return {
    appAttributes,
    uiBundle,
    iconData,
    apiHandlers,
    assets,
    tables,
    zip,
  };
}
