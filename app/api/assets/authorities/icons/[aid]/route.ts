import { NextResponse } from 'next/server';
import { getAuthority, getSystemSetting } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ aid: string }> }
) {
  try {
    const { aid } = await params;

    // Get authority to find their icon path
    const authority = await getAuthority(aid);

    if (!authority || !authority.icon) {
      return new NextResponse('Not found', { status: 404 });
    }

    const systemStorage = await getSystemSetting('storage');

    if (!systemStorage) {
      return new NextResponse('Storage not configured', { status: 500 });
    }

    const fullPath = path.join(systemStorage, authority.icon);

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
    console.error('Failed to serve authority icon:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
