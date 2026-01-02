import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';
import { createPlugin, requireAuthorization } from '@/lib/plugin-sdk';

export async function PATCH(request: NextRequest) {
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
    const { taskId, updates } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Get existing task
    const existing = await plugin.records.read(taskId);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check ownership or view-all permission
    const canViewAll = await plugin.system.checkMyAuthorization('task:view-all');
    if (
      !canViewAll &&
      existing.data.createdBy !== session.userId &&
      existing.data.assignedTo !== session.userId
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to update this task' },
        { status: 403 }
      );
    }

    // Validate assignee if being updated
    if (updates.assignedTo) {
      const canAssign = await plugin.system.checkMyAuthorization('task:assign');
      if (!canAssign) {
        return NextResponse.json(
          { error: 'You do not have permission to assign tasks' },
          { status: 403 }
        );
      }

      const assignee = await plugin.system.getUser(updates.assignedTo);
      if (!assignee) {
        return NextResponse.json(
          { error: 'Assigned user does not exist' },
          { status: 400 }
        );
      }
    }

    const updated = await plugin.records.update(taskId, updates);

    return NextResponse.json({ success: true, task: updated });
  } catch (error: any) {
    console.error('Error updating task:', error);
    if (error.message?.includes('authorization')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
