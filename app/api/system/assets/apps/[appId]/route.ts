import { NextRequest, NextResponse } from 'next/server';
import { getSystemSetting, getApp, formatVersion } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    // Get app info for version
    const app = await getApp(appId);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Get system storage path
    const storagePath = await getSystemSetting('storage');
    if (!storagePath) {
      return NextResponse.json(
        { error: 'System storage not configured' },
        { status: 500 }
      );
    }

    // Get the bundle file from system storage
    const bundlePath = path.join(storagePath, 'apps', appId, `${appId}.js`);

    try {
      const content = await fs.readFile(bundlePath, 'utf-8');

      // Use version-based cache control
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'ETag': `"${appId}-${formatVersion(app.version)}"`,
        },
      });
    } catch (error) {
      return NextResponse.json({ error: 'App bundle not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error serving app bundle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
