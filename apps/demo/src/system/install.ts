/**
 * OnInstallation Hook
 *
 * Called when the demo app is installed or upgraded.
 * Demonstrates how to use installation hooks for app initialization.
 */
export async function OnInstallation(context: {
  priorVersion: string | undefined;
  currentVersion: string;
  appId: string;
}) {
  if (context.priorVersion === undefined) {
    // Fresh installation
    console.log(
      `[Demo App] Fresh installation of version ${context.currentVersion}`
    );
    console.log(`[Demo App] App ID: ${context.appId}`);
    console.log(
      "[Demo App] Installation hook completed - tables, authorities, and agents have been set up by the system."
    );
  } else {
    // Upgrade from previous version
    console.log(
      `[Demo App] Upgrading from version ${context.priorVersion} to ${context.currentVersion}`
    );
    console.log(`[Demo App] App ID: ${context.appId}`);

    // Example: Handle version-specific migrations
    const priorParts = context.priorVersion.split(".").map(Number);
    const currentParts = context.currentVersion.split(".").map(Number);

    if (priorParts[0] < currentParts[0]) {
      console.log("[Demo App] Major version upgrade detected - running migration logic...");
    }

    console.log("[Demo App] Upgrade hook completed successfully.");
  }
}
