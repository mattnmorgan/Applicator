import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET(request: Request) {
  try {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete Redis key:', error);
    return NextResponse.json(
      { error: 'Failed to delete Redis key' },
      { status: 500 }
    );
  }
}
