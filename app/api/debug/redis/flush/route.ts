import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { logger } from '@/lib/logging';
import { getSession, userHasAuthorization } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // Check authentication - debug operations require admin authorization
    const sessionId = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('session='))?.split('=')[1];
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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const redis = getRedisClient();

    // Log database flush before clearing (so the log message itself isn't lost)
    await logger.fromRequest(request).info('system', 'Database flushed (all values cleared)');

    await redis.flushdb();

    return NextResponse.json({
      success: true,
      message: 'Database flushed successfully'
    });
  } catch (error) {
    console.error('Failed to flush database:', error);
    return NextResponse.json(
      { error: 'Failed to flush database' },
      { status: 500 }
    );
  }
}
