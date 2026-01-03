import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');

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

    // Get metadata to check if it's a directory
    const metadata = await plugin.files.getMetadata(filePath);

    if (metadata.isDirectory) {
      // Delete directory recursively
      await plugin.files.deleteDirectory(filePath, true);
    } else {
      // Delete file
      await plugin.files.deleteFile(filePath);
    }

    return NextResponse.json({
      success: true,
      message: metadata.isDirectory ? 'Directory deleted successfully' : 'File deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
