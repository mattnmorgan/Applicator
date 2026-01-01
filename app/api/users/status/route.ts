import { NextResponse } from 'next/server';
import { updateUserStatus } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userIds, isActive } = body;

    if (!Array.isArray(userIds) || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update status for all selected users
    await Promise.all(
      userIds.map(userId => updateUserStatus(userId, isActive))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update user status:', error);
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    );
  }
}
