import { NextRequest, NextResponse } from 'next/server';

import { requireAuthorization } from '@/lib/sdk';
export async function DELETE(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    if (!canViewAll && existing.data.createdBy !== plugin.userId) {
      return NextResponse.json(
        { error: 'You can only delete tasks you created' },
        { status: 403 }
      );
    }

    // Log task deletion (before deleting to capture task title)
    const taskTitle = existing.data.title;
    await plugin.logger.info(`Task deleted: ${taskTitle}`);

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
