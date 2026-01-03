import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;
    const { searchParams } = new URL(req.url);
    const directory = searchParams.get('directory') || '';

    // List files in directory
    const files = await plugin.files.listFiles(directory);

    // Get metadata for each file
    const filesWithMetadata = await Promise.all(
      files.map(async (fileName: string) => {
        const filePath = directory ? `${directory}/${fileName}` : fileName;
        try {
    const { plugin } = context;
          const metadata = await plugin.files.getMetadata(filePath);
          return {
            name: fileName,
            path: filePath,
            size: metadata.size,
            modifiedAt: metadata.modifiedAt,
            isDirectory: metadata.isDirectory,
            type: metadata.isDirectory ? 'directory' : getFileType(fileName)
          };
        } catch (error) {
          // If metadata fails, still return basic info
          return {
            name: fileName,
            path: filePath,
            size: 0,
            modifiedAt: new Date(),
            isDirectory: false,
            type: getFileType(fileName)
          };
        }
      })
    );

    // Sort: directories first, then by name
    filesWithMetadata.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      directory,
      files: filesWithMetadata
    });
  } catch (error: any) {
    console.error('List error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}

function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();

  const typeMap: { [key: string]: string } = {
    // Images
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    svg: 'image',
    webp: 'image',

    // Documents
    pdf: 'document',
    doc: 'document',
    docx: 'document',
    txt: 'document',
    rtf: 'document',

    // Spreadsheets
    xls: 'spreadsheet',
    xlsx: 'spreadsheet',
    csv: 'spreadsheet',

    // Archives
    zip: 'archive',
    rar: 'archive',
    '7z': 'archive',
    tar: 'archive',
    gz: 'archive',

    // Code
    js: 'code',
    ts: 'code',
    tsx: 'code',
    jsx: 'code',
    json: 'code',
    html: 'code',
    css: 'code',
    py: 'code',

    // Video
    mp4: 'video',
    avi: 'video',
    mov: 'video',
    mkv: 'video',

    // Audio
    mp3: 'audio',
    wav: 'audio',
    flac: 'audio',
    m4a: 'audio',
  };

  return ext ? (typeMap[ext] || 'file') : 'file';
}
