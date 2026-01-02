import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';
import { createPlugin, requireAuthorization } from '@/lib/sdk';

export async function POST(request: NextRequest) {
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

    // Check permission
    await requireAuthorization(plugin, 'task:manage');

    const body = await request.json();
    const { title, description, status, priority, assignedTo, dueDate, tags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate assignee if provided
    if (assignedTo) {
      const canAssign = await plugin.system.checkMyAuthorization('task:assign');
      if (!canAssign) {
        return NextResponse.json(
          { error: 'You do not have permission to assign tasks' },
          { status: 403 }
        );
      }

      const assignee = await plugin.system.getUser(assignedTo);
      if (!assignee) {
        return NextResponse.json(
          { error: 'Assigned user does not exist' },
          { status: 400 }
        );
      }
    }

    const task = {
      title,
      description: description || '',
      status: status || 'pending',
      priority: priority || 'medium',
      assignedTo,
      dueDate,
      tags: tags || [],
      createdBy: session.userId,
    };

    const record = await plugin.records.create(task);

    return NextResponse.json({ success: true, task: record });
  } catch (error: any) {
    console.error('Error creating task:', error);
    if (error.message?.includes('authorization')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
