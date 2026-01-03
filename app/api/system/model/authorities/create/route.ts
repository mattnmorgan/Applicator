import { NextResponse } from 'next/server';
import { createAuthority, getAllAuthorities, getSystemSetting, getSession, userHasAuthorization } from '@/lib/db';
import { logger } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Check authentication - authority management requires admin authorization
    const sessionId = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('session='))?.split('=')[1];
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin authorization
    const hasAdmin = await userHasAuthorization(session.userId, 'admin');
    if (!hasAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const iconFile = formData.get('icon') as File | null;
    const authorizationsJson = formData.get('authorizations') as string;
    const authorizations = authorizationsJson ? JSON.parse(authorizationsJson) : [];
    const appsJson = formData.get('apps') as string;
    const apps = appsJson ? JSON.parse(appsJson) : [];

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Generate UUID for authority ID
    const id = uuidv4();

    // Check if authority with this name already exists
    const existingAuthorities = await getAllAuthorities();
    if (existingAuthorities.some(auth => auth.name.toLowerCase() === name.toLowerCase())) {
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

    await createAuthority(id, name, iconPath, authorizations, apps);

    // Log authority creation
    await logger.fromRequest(request).info('system', `Authority created: ${name} (${id})`);

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
