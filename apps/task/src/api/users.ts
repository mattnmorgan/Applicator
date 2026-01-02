import { NextRequest, NextResponse } from 'next/server';
import { getSession, createPlugin } from '@/lib/sdk';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plugin = createPlugin('task', session.userId);

    // Get all active users
    const users = await plugin.system.getUsers(false);

    // Return simplified user data for assignment dropdown
    const userList = users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      authorityName: user.authorityName,
    }));

    return NextResponse.json({ users: userList });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
