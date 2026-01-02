import { NextResponse } from 'next/server';
import { createAuthority, getAllAuthorities, getSystemSetting } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const isAdmin = formData.get('isAdmin') === 'true';
    const iconFile = formData.get('icon') as File | null;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Generate ID from name (lowercase, no spaces)
    const id = name.toLowerCase().replace(/\s+/g, '-');

    // Check if authority with this ID already exists
    const existingAuthorities = await getAllAuthorities();
    if (existingAuthorities.some(auth => auth.id === id)) {
      return NextResponse.json(
        { error: 'An authority with this name already exists' },
        { status: 400 }
      );
    }

    let iconPath: string | undefined = undefined;

    // Handle icon upload if provided
    if (iconFile) {
      const systemStorage = await getSystemSetting('storage');

      if (!systemStorage) {
        return NextResponse.json(
          { error: 'System storage not configured' },
          { status: 500 }
        );
      }

      // Create directory structure
      const authorityIconsDir = path.join(systemStorage, 'system', 'authorities', 'icons');
      const authorityIconPath = path.join(authorityIconsDir, id);

      if (!fs.existsSync(authorityIconsDir)) {
        fs.mkdirSync(authorityIconsDir, { recursive: true });
      }

      if (!fs.existsSync(authorityIconPath)) {
        fs.mkdirSync(authorityIconPath, { recursive: true });
      }

      // Get file extension and save
      const fileExtension = iconFile.name.split('.').pop() || 'jpg';
      const fileName = `icon.${fileExtension}`;
      const filePath = path.join(authorityIconPath, fileName);

      const buffer = Buffer.from(await iconFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      const relativePath = path.join('system', 'authorities', 'icons', id, fileName);
      iconPath = relativePath;
    }

    await createAuthority(id, name, isAdmin, iconPath);

    return NextResponse.json({
      success: true,
      message: 'Authority created successfully',
      id
    });
  } catch (error) {
    console.error('Failed to create authority:', error);
    return NextResponse.json(
      { error: 'Failed to create authority' },
      { status: 500 }
    );
  }
}
