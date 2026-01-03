import { NextResponse } from 'next/server';
import { createUser, getSystemSetting, updateUser, getSession, userHasAuthorization } from '@/lib/db';
import { logger } from '@/lib/logging';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Check authentication - user creation requires admin authorization
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

    const displayName = formData.get('displayName') as string;
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const authority = formData.get('authority') as string || 'user';
    const profilePictureFile = formData.get('profilePicture') as File | null;

    if (!displayName || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Display name, username, email, and password are required' },
        { status: 400 }
      );
    }

    // Create user with specified authority (defaults to 'user')
    const user = await createUser(username, email, displayName, password, authority);

    // Handle profile picture upload if provided
    if (profilePictureFile) {
      const systemStorage = await getSystemSetting('storage');

      if (!systemStorage) {
        return NextResponse.json(
          { error: 'System storage not configured' },
          { status: 500 }
        );
      }

      // Create directory structure: system/users/icons/<user-id>
      const userIconsDir = path.join(systemStorage, 'system', 'users', 'icons');
      const userIconPath = path.join(userIconsDir, user.id);

      // Create directories if they don't exist
      if (!fs.existsSync(userIconsDir)) {
        fs.mkdirSync(userIconsDir, { recursive: true });
      }

      if (!fs.existsSync(userIconPath)) {
        fs.mkdirSync(userIconPath, { recursive: true });
      }

      // Get file extension
      const fileExtension = profilePictureFile.name.split('.').pop() || 'jpg';
      const fileName = `profile.${fileExtension}`;
      const filePath = path.join(userIconPath, fileName);

      // Write file
      const buffer = Buffer.from(await profilePictureFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      // Update user with profile picture path (relative to system storage)
      const relativePath = path.join('system', 'users', 'icons', user.id, fileName);
      await updateUser(user.id, { profilePicture: relativePath });
    }

    // Log user creation
    await logger.fromRequest(request).info('system', `User created: ${username} (${user.id})`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isActive: user.isActive,
      }
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
