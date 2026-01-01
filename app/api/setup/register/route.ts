import { NextResponse } from 'next/server';
import { createUser, setSystemSetting, isFirstTimeSetup } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // Check if setup is still needed
    const needsSetup = await isFirstTimeSetup();
    if (!needsSetup) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, email, displayName, password } = body;

    // Validate input
    if (!username || !email || !displayName || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Create the administrative user
    const user = await createUser(username, email, displayName, password, true);

    // Mark setup as complete
    await setSystemSetting('administratorUserId', user.id);

    return NextResponse.json({
      success: true,
      message: 'Administrator account created successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create administrator account' },
      { status: 500 }
    );
  }
}
