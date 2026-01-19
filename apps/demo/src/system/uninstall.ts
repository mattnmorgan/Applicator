/**
 * OnUninstallation Hook
 *
 * Called before the demo app is uninstalled.
 * Demonstrates how to use uninstallation hooks for cleanup.
 */
export async function OnUninstallation(context: {
  version: string;
  appId: string;
}) {
  console.log(`[Demo App] Uninstalling version ${context.version}`);
  console.log(`[Demo App] App ID: ${context.appId}`);

  // Example cleanup operations:
  // - Clear any cached data
  // - Send notifications about app removal
  // - Log uninstallation for audit purposes

  console.log("[Demo App] Performing cleanup before uninstallation...");
  console.log("[Demo App] Cleanup complete. The system will now remove tables, authorities, and agents.");
}
