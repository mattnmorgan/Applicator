import { NextRequest, NextResponse } from 'next/server';
import { requireAuthorization } from '@/lib/sdk';
import { v4 as uuidv4 } from 'uuid';

export async function PATCH(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    await requireAuthorization(plugin, 'task:manage');

    // Parse form data
    const formData = await request.formData();
    const taskId = formData.get('taskId') as string;
    const updatesJson = formData.get('updates') as string;
    const file = formData.get('file') as File | null;
    const removeFile = formData.get('removeFile') === 'true';

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updates: any = updatesJson ? JSON.parse(updatesJson) : {};

    // Get existing task
    const existing = await plugin.records.read(taskId);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check ownership or view-all permission
    const canViewAll = await plugin.system.checkMyAuthorization('task:view-all');
    if (
      !canViewAll &&
      existing.data.createdBy !== plugin.userId &&
      existing.data.assignedTo !== plugin.userId
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

    // Handle file operations
    if (removeFile && existing.data.attachmentFilePath) {
      // Delete old file
      try {
        await plugin.files.deleteFile(existing.data.attachmentFilePath);
      } catch (err) {
        console.error('Error deleting old file:', err);
      }
      updates.attachmentFileName = undefined;
      updates.attachmentFilePath = undefined;
    } else if (file && file.size > 0) {
      // Delete old file if exists
      if (existing.data.attachmentFilePath) {
        try {
          await plugin.files.deleteFile(existing.data.attachmentFilePath);
        } catch (err) {
          console.error('Error deleting old file:', err);
        }
      }

      // Save new file
      const fileName = file.name;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const filePath = `attachments/${uuidv4()}_${fileName}`;

      await plugin.files.writeFile(filePath, fileBuffer);

      updates.attachmentFileName = fileName;
      updates.attachmentFilePath = filePath;
    }

    const updated = await plugin.records.update(taskId, updates);

    // Log task update
    if (updated) {
      const taskTitle = updated.data.title || existing.data.title;
      await plugin.logger.info(`Task updated: ${taskTitle}`);
    }

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
