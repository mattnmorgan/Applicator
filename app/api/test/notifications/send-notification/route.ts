import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createNotification, type NotificationType } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    // Default to info if no type provided
    const notificationType: NotificationType = type || 'info';

    // Validate notification type
    const validTypes: NotificationType[] = ['info', 'success', 'warning', 'error'];
    if (!validTypes.includes(notificationType)) {
      return NextResponse.json(
        { error: 'Invalid notification type. Use: info, success, warning, error' },
        { status: 400 }
      );
    }

    // Create notification with appropriate title and message based on type
    const titles: Record<NotificationType, string> = {
      info: 'Test Info Notification',
      success: 'Test Success Notification',
      warning: 'Test Warning Notification',
      error: 'Test Error Notification',
    };

    const messages: Record<NotificationType, string> = {
      info: 'This is a test info notification to verify the notification system is working correctly.',
      success: 'This is a test success notification. Everything is working great!',
      warning: 'This is a test warning notification. Please be aware of this.',
      error: 'This is a test error notification. Something needs attention.',
    };

    const notification = await createNotification({
      userId: user.id,
      type: notificationType,
      app: 'system',
      title: titles[notificationType],
      message: messages[notificationType],
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
