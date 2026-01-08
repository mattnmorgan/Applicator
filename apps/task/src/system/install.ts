export async function OnInstallation(context: {
  priorVersion: string | undefined;
  currentVersion: string;
  appId: string;
}) {
  // Empty installation handler for task app
  // This will be called on both fresh install and upgrade

  if (context.priorVersion === undefined) {
    // Fresh installation
    console.log(`Task app ${context.currentVersion} installed`);
  } else {
    // Upgrade from previous version
    console.log(`Task app upgraded from ${context.priorVersion} to ${context.currentVersion}`);
  }
}
