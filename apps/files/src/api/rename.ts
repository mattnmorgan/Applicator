import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;
    const body = await req.json();
    const { oldPath, newName } = body;

    if (!oldPath || !newName) {
      return NextResponse.json(
        { error: 'Old path and new name are required' },
        { status: 400 }
      );
    }

    // Check if file exists
    const exists = await plugin.files.exists(oldPath);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get directory path
    const pathParts = oldPath.split('/');
    pathParts.pop(); // Remove old filename
    const directory = pathParts.join('/');

    // Construct new path
    const newPath = directory ? `${directory}/${newName}` : newName;

    // Check if new path already exists
    const newExists = await plugin.files.exists(newPath);
    if (newExists) {
      return NextResponse.json(
        { error: 'A file with that name already exists' },
        { status: 409 }
      );
    }

    // Read and write to new location, then delete old
    const content = await plugin.files.readFile(oldPath);
    await plugin.files.writeFile(newPath, content);

    const metadata = await plugin.files.getMetadata(oldPath);
    if (metadata.isDirectory) {
      await plugin.files.deleteDirectory(oldPath, true);
    } else {
      await plugin.files.deleteFile(oldPath);
    }

    return NextResponse.json({
      success: true,
      message: 'File renamed successfully',
      newPath
    });
  } catch (error: any) {
    console.error('Rename error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rename file' },
      { status: 500 }
    );
  }
}
