import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function POST() {
  try {
    const redis = getRedisClient();
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
