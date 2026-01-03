import { NextRequest, NextResponse } from 'next/server';
import { getSession, createPlugin, requireAuthorization } from '@/lib/sdk';

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

    // Check permission
    await requireAuthorization(plugin, 'task:manage');

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Get task
    const task = await plugin.records.read(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task has attachment
    if (!task.data.attachmentFilePath) {
      return NextResponse.json({ error: 'Task has no attachment' }, { status: 404 });
    }

    // Check permission to view this task
    const canViewAll = await plugin.system.checkMyAuthorization('task:view-all');
    if (
      !canViewAll &&
      task.data.createdBy !== session.userId &&
      task.data.assignedTo !== session.userId
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view this task' },
        { status: 403 }
      );
    }

    // Read file
    const fileBuffer = await plugin.files.readFile(task.data.attachmentFilePath);

    // Return file - convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${task.data.attachmentFileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error downloading file:', error);
    if (error.message?.includes('authorization')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
