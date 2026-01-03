import { NextResponse } from 'next/server';
import { getUserById, getAuthority, updateUser, getSession } from '@/lib/db';
import { logger } from '@/lib/logging';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { getSystemSetting } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const authority = await getAuthority(user.authority);

    // Remove password hash and return user data
    const { passwordHash, ...sanitizedUser } = user;

    return NextResponse.json({
      user: {
        ...sanitizedUser,
        authorityName: authority?.name || 'Unknown',
        profilePicture: user.profilePicture ? `/api/system/assets/icons/users/${user.id}?t=${Date.now()}` : undefined,
      }
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const sessionId = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('session='))?.split('=')[1];
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const formData = await request.formData();

    const displayName = formData.get('displayName') as string;
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const authority = formData.get('authority') as string;
    const profilePictureFile = formData.get('profilePicture') as File | null;
    const clearProfilePicture = formData.get('clearProfilePicture') === 'true';

    if (!displayName || !username || !email) {
      return NextResponse.json(
        { error: 'Display name, username, and email are required' },
        { status: 400 }
      );
    }

    // Build updates object
    const updates: any = {
      displayName,
      username,
      email,
      authority,
    };

    // Only update password if provided
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.passwordHash = passwordHash;
    }

    // Handle clearing profile picture
    if (clearProfilePicture) {
      updates.profilePicture = undefined;
    }

    // Handle profile picture upload if provided
    if (profilePictureFile) {
      const systemStorage = await getSystemSetting('storage');

      if (!systemStorage) {
        return NextResponse.json(
          { error: 'System storage not configured' },
          { status: 500 }
        );
      }

      // Create directory structure
      const userIconsDir = path.join(systemStorage, 'system', 'users', 'icons');
      const userIconPath = path.join(userIconsDir, id);

      if (!fs.existsSync(userIconsDir)) {
        fs.mkdirSync(userIconsDir, { recursive: true });
      }

      if (!fs.existsSync(userIconPath)) {
        fs.mkdirSync(userIconPath, { recursive: true });
      }

      // Get file extension and save
      const fileExtension = profilePictureFile.name.split('.').pop() || 'jpg';
      const fileName = `profile.${fileExtension}`;
      const filePath = path.join(userIconPath, fileName);

      const buffer = Buffer.from(await profilePictureFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      const relativePath = path.join('system', 'users', 'icons', id, fileName);
      updates.profilePicture = relativePath;
    }

    await updateUser(id, updates);

    // Log user modification
    await logger.fromRequest(request).info('system', `User modified: ${username} (${id})`);

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
