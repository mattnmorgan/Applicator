import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dir = searchParams.get('path');

    // If no path provided, return drives on Windows or root on Unix
    if (!dir) {
      const platform = os.platform();

      if (platform === 'win32') {
        // Get available drives on Windows
        const drives: string[] = [];
        for (let i = 65; i <= 90; i++) {
          const drive = String.fromCharCode(i) + ':';
          try {
            fs.accessSync(drive + '\\');
            drives.push(drive);
          } catch {
            // Drive doesn't exist, skip
          }
        }
        return NextResponse.json({ drives, platform: 'win32' });
      } else {
        // Unix-like systems start at root
        return NextResponse.json({ drives: ['/'], platform: 'unix' });
      }
    }

    // Read directory contents
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(dir, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ directories, currentPath: dir });
  } catch (error) {
    console.error('Failed to read directory:', error);
    return NextResponse.json(
      { error: 'Failed to read directory' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, path: dirPath, name } = body;

    if (action === 'create') {
      if (!dirPath || !name) {
        return NextResponse.json(
          { error: 'Path and name are required' },
          { status: 400 }
        );
      }

      const newPath = path.join(dirPath, name);
      fs.mkdirSync(newPath, { recursive: true });
      return NextResponse.json({ success: true, path: newPath });
    }

    if (action === 'delete') {
      if (!dirPath) {
        return NextResponse.json(
          { error: 'Path is required' },
          { status: 400 }
        );
      }

      fs.rmdirSync(dirPath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Filesystem operation failed:', error);
    return NextResponse.json(
      { error: 'Filesystem operation failed' },
      { status: 500 }
    );
  }
}
