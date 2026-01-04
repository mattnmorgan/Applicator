import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserNotifications, getUnreadCount } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const notifications = await getUserNotifications(user.id, includeArchived);
    const filtered = unreadOnly ? notifications.filter(n => !n.read) : notifications;

    return NextResponse.json({
      notifications: filtered,
      unreadCount: await getUnreadCount(user.id),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}
