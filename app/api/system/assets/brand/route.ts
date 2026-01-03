import { NextResponse } from 'next/server';
import { getSystemSetting } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get brand icon path from system settings
    const brandIcon = await getSystemSetting('brandIcon');

    if (!brandIcon) {
      return new NextResponse('Not found', { status: 404 });
    }

    const systemStorage = await getSystemSetting('storage');

    if (!systemStorage) {
      return new NextResponse('Storage not configured', { status: 500 });
    }

    const fullPath = path.join(systemStorage, brandIcon);

    if (!fs.existsSync(fullPath)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    const contentTypeMap: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to serve brand icon:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
