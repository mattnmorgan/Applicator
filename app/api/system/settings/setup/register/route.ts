import { NextResponse } from 'next/server';
import { createUser, setSystemSetting, isFirstTimeSetup, initializeAuthorities, createApp } from '@/lib/database/helpers';
import TableManager from '@/lib/database/managers/table';
import { SYSTEM_APP_METADATA } from '@/lib/database/systemMetadata';

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

    // Step 1: Create the system app
    await createApp('system', {
      label: SYSTEM_APP_METADATA.name,
      version: SYSTEM_APP_METADATA.version,
      author: SYSTEM_APP_METADATA.author,
      contactEmail: SYSTEM_APP_METADATA.contactEmail,
      description: SYSTEM_APP_METADATA.description,
      apiRoutes: SYSTEM_APP_METADATA.apiRoutes,
      dependencies: SYSTEM_APP_METADATA.dependencies,
      subApps: SYSTEM_APP_METADATA.subApps,
    });

    // Step 2: Create all table definitions
    const tableManager = new TableManager();
    for (const table of SYSTEM_APP_METADATA.tables) {
      await tableManager.createTable('system', table.name, {
        tableName: table.name,
        app: 'system',
        description: table.description,
        fields: table.fields as any,
      });
    }

    // Step 3: Initialize authorities
    await initializeAuthorities();

    // Step 4: Create the administrative user with 'admin' authority
    const user = await createUser(username, email, displayName, password, 'admin');

    // Step 5: Mark setup as complete
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
