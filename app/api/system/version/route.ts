import { NextResponse } from 'next/server';
import { getApp } from '@/lib/db';

// Current system version - update this when making system changes
const CURRENT_SYSTEM_VERSION = {
  major: 1,
  minor: 0,
  dev: 1,
};

export async function GET() {
  try {
    // Get system app from database
    const systemApp = await getApp('system');

    if (!systemApp) {
      return NextResponse.json(
        { error: 'System app not found' },
        { status: 404 }
      );
    }

    // Compare versions
    const dbVersion = systemApp.version;
    const needsUpgrade =
      dbVersion.major < CURRENT_SYSTEM_VERSION.major ||
      (dbVersion.major === CURRENT_SYSTEM_VERSION.major && dbVersion.minor < CURRENT_SYSTEM_VERSION.minor) ||
      (dbVersion.major === CURRENT_SYSTEM_VERSION.major && dbVersion.minor === CURRENT_SYSTEM_VERSION.minor && dbVersion.dev < CURRENT_SYSTEM_VERSION.dev);

    return NextResponse.json({
      currentVersion: CURRENT_SYSTEM_VERSION,
      installedVersion: dbVersion,
      needsUpgrade,
      versionString: `${CURRENT_SYSTEM_VERSION.major}.${CURRENT_SYSTEM_VERSION.minor}.${CURRENT_SYSTEM_VERSION.dev}`,
      installedVersionString: `${dbVersion.major}.${dbVersion.minor}.${dbVersion.dev}`,
    });
  } catch (error) {
    console.error('Error checking system version:', error);
    return NextResponse.json(
      { error: 'Failed to check system version' },
      { status: 500 }
    );
  }
}

export { CURRENT_SYSTEM_VERSION };
