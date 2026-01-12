import { NextResponse } from 'next/server';
import { isFirstTimeSetup } from '@/lib/database/helpers';

export async function GET() {
  try {
    const needsSetup = await isFirstTimeSetup();
    return NextResponse.json({ needsSetup });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
