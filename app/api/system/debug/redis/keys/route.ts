import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys('*');

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Failed to fetch Redis keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Redis keys' },
      { status: 500 }
    );
  }
}
