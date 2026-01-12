import { NextResponse } from 'next/server';
import { getCurrentUser, getUserById, updateUser, getSystemSetting } from '@/lib/database/helpers';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const displayName = formData.get('displayName') as string;
    const email = formData.get('email') as string;
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const profilePictureFile = formData.get('profilePicture') as File | null;
    const clearProfilePicture = formData.get('clearProfilePicture') === 'true';

    if (!displayName || !email) {
      return NextResponse.json(
        { error: 'Display name and email are required' },
        { status: 400 }
      );
    }

    // Verify current password if changing password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }

      const user = await getUserById(currentUser.id);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    }

    // Build updates object
    const updates: any = {
      displayName,
      email,
    };

    // Update password if provided
    if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
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
      const userIconPath = path.join(userIconsDir, currentUser.id);

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

      const relativePath = path.join('system', 'users', 'icons', currentUser.id, fileName);
      updates.profilePicture = relativePath;
    }

    await updateUser(currentUser.id, updates);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
