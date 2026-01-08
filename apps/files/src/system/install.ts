export async function OnInstallation(context: {
  priorVersion: string | undefined;
  currentVersion: string;
  appId: string;
}) {
  // Empty installation handler for files app
  // This will be called on both fresh install and upgrade

  if (context.priorVersion === undefined) {
    // Fresh installation
    console.log(`Files app ${context.currentVersion} installed`);
  } else {
    // Upgrade from previous version
    console.log(`Files app upgraded from ${context.priorVersion} to ${context.currentVersion}`);
  }
}
