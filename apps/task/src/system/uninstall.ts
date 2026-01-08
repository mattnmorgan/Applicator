export async function OnUninstallation(context: {
  version: string;
  appId: string;
}) {
  // Empty uninstallation handler for task app
  // This will be called before the app is uninstalled

  console.log(`Task app ${context.version} uninstalling`);
}
