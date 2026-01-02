import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';
import { createPlugin, requireAuthorization } from '@/lib/plugin-sdk';

export async function DELETE(request: NextRequest) {
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

    const body: any = await request.json();
    const { taskId } = body;

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
    if (!canViewAll && existing.data.createdBy !== session.userId) {
      return NextResponse.json(
        { error: 'You can only delete tasks you created' },
        { status: 403 }
      );
    }

    await plugin.records.delete(taskId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    if (error.message?.includes('authorization')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
