import { NextResponse } from 'next/server';
import UserManager from '@/lib/database/managers/user';

export async function GET() {
  try {
    const userManager = new UserManager();
    const users = await userManager.listRecords();
    const needsSetup = users.length === 0;

    return NextResponse.json({ needsSetup });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
