import { NextResponse } from 'next/server';
import { getAuthority, updateAuthority, getSystemSetting } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authority = await getAuthority(id);

    if (!authority) {
      return NextResponse.json(
        { error: 'Authority not found' },
        { status: 404 }
      );
    }

    // Return icon URL if icon exists
    const iconUrl = authority.icon ? `/api/assets/authorities/icons/${id}?t=${Date.now()}` : undefined;

    return NextResponse.json({
      authority: {
        ...authority,
        icon: iconUrl,
      }
    });
  } catch (error) {
    console.error('Failed to fetch authority:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authority' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const isAdmin = formData.get('isAdmin') === 'true';
    const iconFile = formData.get('icon') as File | null;
    const clearIcon = formData.get('clearIcon') === 'true';

    const isSystemAuthority = ['admin', 'user', 'guest'].includes(id);

    const updates: any = {};

    // Handle clearing icon
    if (clearIcon) {
      updates.icon = undefined;
    }

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
      updates.icon = relativePath;
    }

    // For system authorities, only allow icon updates
    if (isSystemAuthority) {
      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { error: 'No icon provided for update' },
          { status: 400 }
        );
      }

      await updateAuthority(id, updates);
      return NextResponse.json({
        success: true,
        message: 'Authority icon updated successfully'
      });
    }

    // For non-system authorities, allow full updates
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    updates.name = name;
    updates.isAdmin = isAdmin;

    await updateAuthority(id, updates);

    return NextResponse.json({
      success: true,
      message: 'Authority updated successfully'
    });
  } catch (error) {
    console.error('Failed to update authority:', error);
    return NextResponse.json(
      { error: 'Failed to update authority' },
      { status: 500 }
    );
  }
}
