const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APPS_DIR = path.join(__dirname, '..', 'apps');

// Get all app directories
const apps = fs.readdirSync(APPS_DIR).filter(file => {
  const appPath = path.join(APPS_DIR, file);
  return fs.statSync(appPath).isDirectory() && fs.existsSync(path.join(appPath, 'package.json'));
});

if (apps.length === 0) {
  console.log('No apps found to build.');
  process.exit(0);
}

console.log(`Found ${apps.length} app(s) to build: ${apps.join(', ')}\n`);

// Build each app sequentially
async function buildApps() {
  for (const app of apps) {
    const appPath = path.join(APPS_DIR, app);
    const logFile = path.join(appPath, 'build.log');

    console.log(`Building ${app}...`);

    const logStream = fs.createWriteStream(logFile);

    // Write header to log file
    logStream.write(`Build log for ${app}\n`);
    logStream.write(`Started at: ${new Date().toISOString()}\n`);
    logStream.write(`${'='.repeat(80)}\n\n`);

    await new Promise((resolve, reject) => {
      // Run npm install first
      const install = spawn('npm', ['install'], {
        cwd: appPath,
        shell: true,
        stdio: 'pipe'
      });

      install.stdout.on('data', (data) => {
        logStream.write(data);
      });

      install.stderr.on('data', (data) => {
        logStream.write(data);
      });

      install.on('close', (code) => {
        if (code !== 0) {
          logStream.write(`\n${'='.repeat(80)}\n`);
          logStream.write(`npm install failed with code ${code}\n`);
          logStream.write(`Finished at: ${new Date().toISOString()}\n`);
          logStream.end();
          console.log(`  ✗ ${app} - npm install failed (see apps/${app}/build.log)`);
          resolve(); // Continue with next app even if this one fails
          return;
        }

        logStream.write(`\n${'='.repeat(80)}\n\n`);

        // Run npm run build
        const build = spawn('npm', ['run', 'build'], {
          cwd: appPath,
          shell: true,
          stdio: 'pipe'
        });

        build.stdout.on('data', (data) => {
          logStream.write(data);
        });

        build.stderr.on('data', (data) => {
          logStream.write(data);
        });

        build.on('close', (buildCode) => {
          logStream.write(`\n${'='.repeat(80)}\n`);
          if (buildCode === 0) {
            logStream.write(`Build successful!\n`);
            console.log(`  ✓ ${app} - build successful`);
          } else {
            logStream.write(`Build failed with code ${buildCode}\n`);
            console.log(`  ✗ ${app} - build failed (see apps/${app}/build.log)`);
          }
          logStream.write(`Finished at: ${new Date().toISOString()}\n`);
          logStream.end();
          resolve();
        });
      });
    });
  }

  console.log('\nAll app builds completed. Check each app\'s build.log for details.');
}

buildApps().catch(err => {
  console.error('Error building apps:', err);
  process.exit(1);
});
