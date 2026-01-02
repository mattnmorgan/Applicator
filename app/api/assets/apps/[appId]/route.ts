import { NextRequest, NextResponse } from 'next/server';
import { getSystemSetting } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    // Get storage path
    const storagePath = await getSystemSetting('storage');
    if (!storagePath) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      );
    }

    // Get the bundle file
    const bundlePath = path.join(storagePath, 'system', 'apps', `${appId}.js`);

    try {
      const content = await fs.readFile(bundlePath, 'utf-8');

      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error serving app bundle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
