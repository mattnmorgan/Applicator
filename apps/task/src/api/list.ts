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

    // Check if user can view all tasks
    const canViewAll = await plugin.system.checkMyAuthorization('task:view-all');

    // Get all tasks
    const result = await plugin.records.list({ limit: 1000 });

    // Filter based on permissions and enrich with user data
    const tasks = [];
    for (const record of result.records) {
      if (
        canViewAll ||
        record.data.createdBy === session.userId ||
        record.data.assignedTo === session.userId
      ) {
        // Enrich with user names
        let createdByName = 'Unknown';
        let assignedToName;

        const createdByUser = await plugin.system.getUser(record.data.createdBy);
        if (createdByUser) {
          createdByName = createdByUser.displayName;
        }

        if (record.data.assignedTo) {
          const assignedUser = await plugin.system.getUser(record.data.assignedTo);
          if (assignedUser) {
            assignedToName = assignedUser.displayName;
          }
        }

        tasks.push({
          id: record.id,
          ...record.data,
          createdByName,
          assignedToName,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      }
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error listing tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
