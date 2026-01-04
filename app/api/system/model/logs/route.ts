import { NextRequest, NextResponse } from 'next/server';
import { getLogs, clearLogs, getLogCount, logger } from '@/lib/logging';
import { getSession } from '@/lib/db';
import { userHasAuthorization } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin authorization
    const hasAdmin = await userHasAuthorization(session.userId, 'admin');
    if (!hasAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch logs
    const logs = await getLogs(limit, offset);
    const totalCount = await getLogCount();

    return NextResponse.json({
      logs,
      totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin authorization
    const hasAdmin = await userHasAuthorization(session.userId, 'admin');
    if (!hasAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Clear all logs
    await clearLogs();

    // Log the clear action
    await logger.fromRequest(request).info('system', 'Log messages cleared');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear logs:', error);
    return NextResponse.json(
      { error: 'Failed to clear logs' },
      { status: 500 }
    );
  }
}
