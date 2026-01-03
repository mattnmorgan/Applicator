import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { logger } from '@/lib/logging';
import { getSession, userHasAuthorization } from '@/lib/db';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter is required' },
        { status: 400 }
      );
    }

    const redis = getRedisClient();
    const value = await redis.get(key);

    return NextResponse.json({ key, value });
  } catch (error) {
    console.error('Failed to fetch Redis value:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Redis value' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    const redis = getRedisClient();
    await redis.set(key, value);

    // Log database modification
    await logger.fromRequest(request).info('system', `Database value modified: ${key}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update Redis value:', error);
    return NextResponse.json(
      { error: 'Failed to update Redis value' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter is required' },
        { status: 400 }
      );
    }

    const redis = getRedisClient();
    await redis.del(key);

    // Log database deletion
    await logger.fromRequest(request).info('system', `Database value deleted: ${key}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete Redis key:', error);
    return NextResponse.json(
      { error: 'Failed to delete Redis key' },
      { status: 500 }
    );
  }
}
