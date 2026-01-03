import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { archiveNotification, archiveNotifications } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { timestamp, timestamps } = body;

    if (timestamps && Array.isArray(timestamps)) {
      // Archive multiple notifications
      await archiveNotifications(user.id, timestamps);
    } else if (timestamp) {
      // Archive single notification
      await archiveNotification(user.id, timestamp);
    } else {
      return NextResponse.json(
        { error: 'timestamp or timestamps required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Archive notification error:', error);
    return NextResponse.json(
      { error: 'Failed to archive notification' },
      { status: 500 }
    );
  }
}
