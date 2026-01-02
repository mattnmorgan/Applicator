import { NextRequest, NextResponse } from 'next/server';
import { getSession, userHasAuthorization, getApp, deleteApp, getAllAuthorizations, deleteAuthorization, getAllAuthorities, updateAuthority } from '@/lib/db';
import { getSystemSetting } from '@/lib/db';
import { createRecordManager } from '@/lib/plugin-sdk';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin authorization
    const hasAdmin = await userHasAuthorization(session.userId, 'admin');
    if (!hasAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { appId } = body;

    if (!appId) {
      return NextResponse.json({ error: 'App ID is required' }, { status: 400 });
    }

    // Check if app exists
    const app = await getApp(appId);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Prevent uninstalling system app
    if (appId === 'system') {
      return NextResponse.json(
        { error: 'Cannot uninstall system app' },
        { status: 400 }
      );
    }

    // Delete all app records
    const recordManager = createRecordManager(appId);
    await recordManager.deleteAll();

    // Delete all authorizations for this app
    const allAuthorizations = await getAllAuthorizations();
    const appAuthorizations = allAuthorizations.filter(auth => auth.app === appId);

    for (const auth of appAuthorizations) {
      await deleteAuthorization(auth.id);
    }

    // Remove app from all authorities
    const authorities = await getAllAuthorities();
    for (const authority of authorities) {
      if (authority.apps && authority.apps.includes(appId)) {
        const updatedApps = authority.apps.filter(id => id !== appId);
        await updateAuthority(authority.id, { apps: updatedApps });
      }

      // Also remove app's authorizations from authorities
      const updatedAuthorizations = authority.authorizations.filter(
        authId => !authId.startsWith(`${appId}:`)
      );
      if (updatedAuthorizations.length !== authority.authorizations.length) {
        await updateAuthority(authority.id, { authorizations: updatedAuthorizations });
      }
    }

    // Delete app from database
    await deleteApp(appId);

    // Delete app directory from storage (includes icon, bundle, and API handlers)
    try {
      const storagePath = await getSystemSetting('storage');
      if (storagePath) {
        const appDir = path.join(storagePath, 'apps', appId);
        await fs.rm(appDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Error deleting app files:', error);
      // Continue even if file deletion fails
    }

    return NextResponse.json({
      success: true,
      message: 'App uninstalled successfully',
    });
  } catch (error) {
    console.error('Error uninstalling app:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
