import { NextRequest, NextResponse } from 'next/server';
import { requireAuthorization } from '@/lib/sdk';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    await requireAuthorization(plugin, 'task:manage');

    // Parse form data
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const status = formData.get('status') as string;
    const priority = formData.get('priority') as string;
    const assignedTo = formData.get('assignedTo') as string;
    const dueDate = formData.get('dueDate') as string;
    const tagsJson = formData.get('tags') as string;
    const file = formData.get('file') as File | null;

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

    const task: any = {
      title,
      description: description || '',
      status: status || 'pending',
      priority: priority || 'medium',
      assignedTo: assignedTo || undefined,
      dueDate: dueDate || undefined,
      tags: tagsJson ? JSON.parse(tagsJson) : [],
      createdBy: plugin.userId,
    };

    // Handle file upload
    if (file && file.size > 0) {
      const fileName = file.name;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const filePath = `attachments/${uuidv4()}_${fileName}`;

      // Save file using the file manager
      await plugin.files.writeFile(filePath, fileBuffer);

      task.attachmentFileName = fileName;
      task.attachmentFilePath = filePath;
    }

    const record = await plugin.records.create(task);

    // Log task creation
    await plugin.logger.info(`Task created: ${title}`);

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
