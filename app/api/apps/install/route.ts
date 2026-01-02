import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';
import { userHasAuthorization, createApp, createAuthorization, getApp } from '@/lib/db';
import { getSystemSetting } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = request.cookies.get('session')?.value;
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();

    // Extract app attributes from the bundled JS
    // The bundle should export a getAppAttributes function
    let appAttributes;
    try {
      // For webpack bundles, we need to execute the bundle in a safe context
      // Look for function that returns appId:"task" or similar pattern
      const appIdMatch = fileContent.match(/function\s+\w+\s*\(\s*\)\s*\{return\{appId:"(\w+)"/);

      if (!appIdMatch) {
        return NextResponse.json(
          { error: 'Invalid app bundle: missing getAppAttributes function' },
          { status: 400 }
        );
      }

      // Execute the bundle in a VM context to extract attributes safely
      const vm = require('vm');
      const sandbox: any = {
        window: {},
        module: {},
        exports: {},
        require: () => ({}),
        React: {},
        ReactDOM: {},
      };

      try {
        vm.runInNewContext(fileContent, sandbox, { timeout: 5000 });

        // Try to get getAppAttributes from the sandbox
        if (sandbox.window.getAppAttributes && typeof sandbox.window.getAppAttributes === 'function') {
          appAttributes = sandbox.window.getAppAttributes();
        } else {
          return NextResponse.json(
            { error: 'Invalid app bundle: getAppAttributes not exposed on window' },
            { status: 400 }
          );
        }
      } catch (vmError) {
        console.error('VM execution error:', vmError);
        return NextResponse.json(
          { error: 'Invalid app bundle: failed to execute bundle' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error extracting attributes:', error);
      return NextResponse.json(
        { error: 'Invalid app bundle format' },
        { status: 400 }
      );
    }

    // Validate required attributes
    if (!appAttributes.appId || !appAttributes.name || !appAttributes.version ||
        !appAttributes.author || !appAttributes.description) {
      return NextResponse.json(
        { error: 'Missing required app attributes' },
        { status: 400 }
      );
    }

    // Check if app already exists
    const existingApp = await getApp(appAttributes.appId);
    if (existingApp) {
      return NextResponse.json(
        { error: 'App with this ID already exists' },
        { status: 409 }
      );
    }

    // Get storage path
    const storagePath = await getSystemSetting('storage');
    if (!storagePath) {
      return NextResponse.json(
        { error: 'Storage path not configured' },
        { status: 500 }
      );
    }

    // Create apps directory if it doesn't exist
    const appsDir = path.join(storagePath, 'system', 'apps');
    await fs.mkdir(appsDir, { recursive: true });

    // Save the bundle file
    const bundlePath = path.join(appsDir, `${appAttributes.appId}.js`);
    await fs.writeFile(bundlePath, fileContent, 'utf-8');

    // Create app in database
    await createApp(
      appAttributes.appId,
      appAttributes.name,
      appAttributes.version,
      appAttributes.author,
      appAttributes.contactEmail || '',
      appAttributes.description,
      appAttributes.apiRoutes || []
    );

    // Install authorizations
    if (appAttributes.authorizations && Array.isArray(appAttributes.authorizations)) {
      for (const auth of appAttributes.authorizations) {
        const authId = `${appAttributes.appId}:${auth.id}`;
        await createAuthorization(
          authId,
          auth.name,
          auth.description || '',
          appAttributes.appId
        );
      }
    }

    // Save icon if provided
    if (appAttributes.icon) {
      const iconDir = path.join(storagePath, 'system', 'apps', 'icons', appAttributes.appId);
      await fs.mkdir(iconDir, { recursive: true });

      // Decode base64 icon and save
      const base64Data = appAttributes.icon.replace(/^data:image\/\w+;base64,/, '');
      const iconBuffer = Buffer.from(base64Data, 'base64');
      const iconPath = path.join(iconDir, 'icon.png');
      await fs.writeFile(iconPath, iconBuffer);
    }

    return NextResponse.json({
      success: true,
      appId: appAttributes.appId,
      name: appAttributes.name,
    });
  } catch (error) {
    console.error('Error installing app:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
