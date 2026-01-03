import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    const inline = searchParams.get('inline') === 'true';

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Check if file exists
    const exists = await plugin.files.exists(filePath);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await plugin.files.readFile(filePath);
    const fileName = filePath.split('/').pop() || 'download';

    // Determine content type based on file extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    let contentType = 'application/octet-stream';

    const contentTypeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
    };

    if (contentTypeMap[ext]) {
      contentType = contentTypeMap[ext];
    }

    // Return file for viewing or download
    const disposition = inline ? 'inline' : 'attachment';
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Type': contentType,
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download file' },
      { status: 500 }
    );
  }
}
