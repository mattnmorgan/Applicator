import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, context: { plugin: any }) {
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

    // Get metadata to check if it's a directory
    const metadata = await plugin.files.getMetadata(sourcePath);

    // Prevent copying a directory into itself or its subdirectories
    if (metadata.isDirectory && destinationDir) {
      // Normalize paths for comparison (remove trailing slashes)
      const normalizedSource = sourcePath.replace(/\/+$/, '');
      const normalizedDest = destinationDir.replace(/\/+$/, '');

      // Check if destination is the source itself or a subdirectory of source
      if (normalizedDest === normalizedSource || normalizedDest.startsWith(normalizedSource + '/')) {
        return NextResponse.json(
          { error: 'Cannot copy a directory into itself or its subdirectories' },
          { status: 400 }
        );
      }
    }

    // Get filename from source path
    const fileName = sourcePath.split('/').pop();

    // Construct base destination path
    let destinationPath = destinationDir ? `${destinationDir}/${fileName}` : fileName;

    // Check if destination already exists - if so, add (copy) suffix
    const destExists = await plugin.files.exists(destinationPath);
    if (destExists) {
      // Split filename and extension
      const lastDotIndex = fileName.lastIndexOf('.');
      let baseName, extension;

      if (lastDotIndex > 0 && !metadata.isDirectory) {
        baseName = fileName.substring(0, lastDotIndex);
        extension = fileName.substring(lastDotIndex);
      } else {
        baseName = fileName;
        extension = '';
      }

      // Add (copy) suffix
      const newFileName = `${baseName} (copy)${extension}`;
      destinationPath = destinationDir ? `${destinationDir}/${newFileName}` : newFileName;

      // If that also exists, add numbers
      let counter = 2;
      while (await plugin.files.exists(destinationPath)) {
        const numberedFileName = `${baseName} (copy ${counter})${extension}`;
        destinationPath = destinationDir ? `${destinationDir}/${numberedFileName}` : numberedFileName;
        counter++;
      }
    }

    // Copy the file or directory
    if (metadata.isDirectory) {
      // For directories, we need to copy recursively
      await copyDirectoryRecursive(plugin, sourcePath, destinationPath);
    } else {
      // For files, just read and write
      const content = await plugin.files.readFile(sourcePath);
      await plugin.files.writeFile(destinationPath, content);
    }

    return NextResponse.json({
      success: true,
      message: metadata.isDirectory ? 'Directory copied successfully' : 'File copied successfully',
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

async function copyDirectoryRecursive(plugin: any, sourcePath: string, destinationPath: string) {
  // Create destination directory
  await plugin.files.createDirectory(destinationPath);

  // List all items in source directory
  const items = await plugin.files.listDirectory(sourcePath);

  // Copy each item
  for (const item of items) {
    const sourceItemPath = `${sourcePath}/${item.name}`;
    const destItemPath = `${destinationPath}/${item.name}`;

    if (item.isDirectory) {
      // Recursively copy subdirectory
      await copyDirectoryRecursive(plugin, sourceItemPath, destItemPath);
    } else {
      // Copy file
      const content = await plugin.files.readFile(sourceItemPath);
      await plugin.files.writeFile(destItemPath, content);
    }
  }
}
