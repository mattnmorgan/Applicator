export async function OnUninstallation(context: {
  version: string;
  appId: string;
}) {
  // Empty uninstallation handler for files app
  // This will be called before the app is uninstalled

  console.log(`Files app ${context.version} uninstalling`);
}
