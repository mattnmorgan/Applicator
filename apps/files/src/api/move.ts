import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;
    const body = await req.json();
    const { sourcePath, destinationDir } = body;

    if (!sourcePath || destinationDir === undefined) {
      return NextResponse.json(
        { error: 'Source path and destination directory are required' },
        { status: 400 }
      );
    }

    // Check if source exists
    const exists = await plugin.files.exists(sourcePath);
    if (!exists) {
      return NextResponse.json(
        { error: 'Source file not found' },
        { status: 404 }
      );
    }

    // Get filename from source path
    const fileName = sourcePath.split('/').pop();

    // Construct destination path
    const destinationPath = destinationDir ? `${destinationDir}/${fileName}` : fileName;

    // Check if destination already exists
    const destExists = await plugin.files.exists(destinationPath);
    if (destExists) {
      return NextResponse.json(
        { error: 'A file with that name already exists in the destination' },
        { status: 409 }
      );
    }

    // Read and write to new location, then delete old
    const content = await plugin.files.readFile(sourcePath);
    await plugin.files.writeFile(destinationPath, content);

    const metadata = await plugin.files.getMetadata(sourcePath);
    if (metadata.isDirectory) {
      await plugin.files.deleteDirectory(sourcePath, true);
    } else {
      await plugin.files.deleteFile(sourcePath);
    }

    return NextResponse.json({
      success: true,
      message: 'File moved successfully',
      destinationPath
    });
  } catch (error: any) {
    console.error('Move error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to move file' },
      { status: 500 }
    );
  }
}
