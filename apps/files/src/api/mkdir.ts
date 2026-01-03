import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;
    const body = await req.json();
    const { path: dirPath } = body;

    if (!dirPath) {
      return NextResponse.json(
        { error: 'Directory path is required' },
        { status: 400 }
      );
    }

    // Check if directory already exists
    const exists = await plugin.files.exists(dirPath);
    if (exists) {
      return NextResponse.json(
        { error: 'Directory already exists' },
        { status: 409 }
      );
    }

    // Create directory
    await plugin.files.createDirectory(dirPath);

    return NextResponse.json({
      success: true,
      message: 'Directory created successfully',
      path: dirPath
    });
  } catch (error: any) {
    console.error('Mkdir error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create directory' },
      { status: 500 }
    );
  }
}
