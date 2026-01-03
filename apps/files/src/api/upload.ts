import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, context: { plugin: any }) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const directory = formData.get('directory') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Construct file path
    const filePath = directory ? `${directory}/${file.name}` : file.name;

    // Write file using plugin SDK
    await context.plugin.files.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      fileName: file.name,
      path: filePath
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
