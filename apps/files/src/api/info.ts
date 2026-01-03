import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, context: { plugin: any }) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Check if file exists
    const exists = await context.plugin.files.exists(filePath);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get metadata
    const metadata = await context.plugin.files.getMetadata(filePath);
    const fileName = filePath.split('/').pop() || '';

    return NextResponse.json({
      success: true,
      file: {
        name: fileName,
        path: filePath,
        size: metadata.size,
        createdAt: metadata.createdAt,
        modifiedAt: metadata.modifiedAt,
        isDirectory: metadata.isDirectory,
        type: metadata.isDirectory ? 'directory' : getFileType(fileName)
      }
    });
  } catch (error: any) {
    console.error('Info error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get file info' },
      { status: 500 }
    );
  }
}

function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();

  const typeMap: { [key: string]: string } = {
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    svg: 'image',
    webp: 'image',
    pdf: 'document',
    doc: 'document',
    docx: 'document',
    txt: 'document',
    xls: 'spreadsheet',
    xlsx: 'spreadsheet',
    csv: 'spreadsheet',
    zip: 'archive',
    rar: 'archive',
    '7z': 'archive',
    js: 'code',
    ts: 'code',
    tsx: 'code',
    jsx: 'code',
    json: 'code',
    html: 'code',
    css: 'code',
    mp4: 'video',
    avi: 'video',
    mov: 'video',
    mp3: 'audio',
    wav: 'audio',
  };

  return ext ? (typeMap[ext] || 'file') : 'file';
}
