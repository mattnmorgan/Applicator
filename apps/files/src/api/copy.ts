import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, context: { plugin: any }) {
  try {
    const body = await req.json();
    const { sourcePath, destinationDir } = body;

    if (!sourcePath || destinationDir === undefined) {
      return NextResponse.json(
        { error: 'Source path and destination directory are required' },
        { status: 400 }
      );
    }

    // Check if source exists
    const exists = await context.plugin.files.exists(sourcePath);
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
    const destExists = await context.plugin.files.exists(destinationPath);
    if (destExists) {
      return NextResponse.json(
        { error: 'A file with that name already exists in the destination' },
        { status: 409 }
      );
    }

    // Read and write to new location (don't delete source)
    const content = await context.plugin.files.readFile(sourcePath);
    await context.plugin.files.writeFile(destinationPath, content);

    return NextResponse.json({
      success: true,
      message: 'File copied successfully',
      destinationPath
    });
  } catch (error: any) {
    console.error('Copy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to copy file' },
      { status: 500 }
    );
  }
}
