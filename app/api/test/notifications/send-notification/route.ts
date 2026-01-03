import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a test notification
    const notification = await createNotification({
      userId: user.id,
      type: 'info',
      app: 'system',
      title: 'Test Notification',
      message: 'This is a test notification to verify the notification system is working correctly.',
      url: '/user/notifications',
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Create test notification error:', error);
    return NextResponse.json(
      { error: 'Failed to create test notification' },
      { status: 500 }
    );
  }
}
