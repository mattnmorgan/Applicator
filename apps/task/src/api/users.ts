import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active users
    const users = await plugin.system.getUsers(false);

    // Return simplified user data for assignment dropdown
    const userList = users.map((user: any) => ({
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
