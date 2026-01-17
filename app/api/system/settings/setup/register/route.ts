import { NextResponse } from 'next/server';
import TableManager from '@/lib/database/managers/table';
import UserManager from '@/lib/database/managers/user';
import AppManager from '@/lib/database/managers/app';
import SettingManager from '@/lib/database/managers/setting';
import AuthorityManager from '@/lib/database/managers/authority';
import AuthorizationManager from '@/lib/database/managers/authorization';
import ApiRouteManager from '@/lib/database/managers/apiRoute';
import AppletManager from '@/lib/database/managers/applet';
import { SYSTEM_APP_METADATA } from '@/lib/database/systemMetadata';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // Check if setup is still needed
    const userManager = new UserManager();
    const users = await userManager.listRecords();
    const needsSetup = users.length === 0;

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
    const appManager = new AppManager();
    await appManager.createRecord(await appManager.getTable(), {
      label: SYSTEM_APP_METADATA.name,
      version: SYSTEM_APP_METADATA.version,
      author: SYSTEM_APP_METADATA.author,
      contactEmail: SYSTEM_APP_METADATA.contactEmail,
      description: SYSTEM_APP_METADATA.description,
      dependencies: SYSTEM_APP_METADATA.dependencies,
    }, { id: 'system' });

    // Step 1.5: Create API routes for system app
    if (SYSTEM_APP_METADATA.apiRoutes && Array.isArray(SYSTEM_APP_METADATA.apiRoutes)) {
      const apiRouteManager = new ApiRouteManager();
      const apiRouteTable = await apiRouteManager.getTable();

      for (const apiRoute of SYSTEM_APP_METADATA.apiRoutes) {
        await apiRouteManager.createRecord(
          apiRouteTable,
          {
            app: 'system',
            path: apiRoute.path,
            method: apiRoute.method,
            handler: apiRoute.handler,
            description: apiRoute.description || '',
          },
          { id: `system:${apiRoute.path}:${apiRoute.method}` }
        );
      }
    }

    // Step 1.6: Create applets for system app
    if (SYSTEM_APP_METADATA.applets && Array.isArray(SYSTEM_APP_METADATA.applets)) {
      const appletManager = new AppletManager();
      const appletTable = await appletManager.getTable();

      for (const applet of SYSTEM_APP_METADATA.applets) {
        await appletManager.createRecord(
          appletTable,
          {
            label: applet.label,
            description: applet.description || '',
            component: applet.component,
            app: 'system',
            target: applet.target,
          },
          { id: `system:${applet.id}` }
        );
      }
    }

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
    const authorityManager = new AuthorityManager();
    const authorizationManager = new AuthorizationManager();

    // Create authorizations from system metadata
    for (const authorization of SYSTEM_APP_METADATA.authorizations) {
      await authorizationManager.createRecord(
        await authorizationManager.getTable(),
        {
          name: authorization.name,
          description: authorization.description,
          app: authorization.app,
          contextual: authorization.contextual,
        },
        { id: authorization.id }
      );
    }

    // Create authorities from system metadata
    for (const authority of SYSTEM_APP_METADATA.authorities) {
      await authorityManager.createRecord(
        await authorityManager.getTable(),
        {
          name: authority.name,
          authorizations: authority.authorizations,
          apps: authority.apps,
          contextual: authority.contextual,
        },
        { id: authority.id }
      );
    }

    // Step 4: Create the administrative user with 'admin' authority
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userManager.createRecord(await userManager.getTable(), {
      username,
      email,
      displayName,
      passwordHash,
      authority: 'admin',
      isActive: true,
    });

    // Step 5: Mark setup as complete
    const settingManager = new SettingManager();
    await settingManager.createRecord(
      await settingManager.getTable(),
      { value: user.id },
      { id: 'administratorUserId' }
    );

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
