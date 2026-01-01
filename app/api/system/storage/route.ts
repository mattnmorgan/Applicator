import { NextResponse } from 'next/server';
import { getSystemSetting, setSystemSetting } from '@/lib/db';

export async function GET() {
  try {
    const storage = await getSystemSetting('storage');
    return NextResponse.json({ storage: storage || '' });
  } catch (error) {
    console.error('Failed to fetch storage setting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage setting' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storage } = body;

    if (typeof storage !== 'string') {
      return NextResponse.json(
        { error: 'Invalid storage path' },
        { status: 400 }
      );
    }

    await setSystemSetting('storage', storage);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update storage setting:', error);
    return NextResponse.json(
      { error: 'Failed to update storage setting' },
      { status: 500 }
    );
  }
}
