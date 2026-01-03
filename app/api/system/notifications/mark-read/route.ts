import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { markNotificationRead, markNotificationsRead } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { timestamp, timestamps, read } = body;

    if (timestamps && Array.isArray(timestamps)) {
      // Mark multiple notifications
      if (read === false) {
        // Mark as unread (one at a time since we don't have batch unread)
        for (const ts of timestamps) {
          await markNotificationRead(user.id, ts, false);
        }
      } else {
        await markNotificationsRead(user.id, timestamps);
      }
    } else if (timestamp) {
      // Mark single notification
      await markNotificationRead(user.id, timestamp, read !== false);
    } else {
      return NextResponse.json(
        { error: 'timestamp or timestamps required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification' },
      { status: 500 }
    );
  }
}
