import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';
import { userHasAuthorization, createApp, createAuthorization, getApp } from '@/lib/db';
import { getSystemSetting } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';
import AdmZip from 'adm-zip';

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

    // Check if file is a zip
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a .zip package' },
        { status: 400 }
      );
    }

    // Read file as buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Extract zip contents
    let zip: AdmZip;
    let appAttributes: any;
    let uiBundle: string;
    let iconData: Buffer | null = null;
    let apiHandlers: Map<string, Buffer> = new Map();

    try {
      zip = new AdmZip(fileBuffer);
      const zipEntries = zip.getEntries();

      // Extract app.json
      const appJsonEntry = zipEntries.find(e => e.entryName === 'app.json');
      if (!appJsonEntry) {
        return NextResponse.json(
          { error: 'Invalid app package: missing app.json' },
          { status: 400 }
        );
      }

      appAttributes = JSON.parse(appJsonEntry.getData().toString('utf8'));

      // Extract UI bundle (app.js or {appId}.js)
      const bundleEntry = zipEntries.find(e =>
        e.entryName === `${appAttributes.id}.js` || e.entryName === 'task.js'
      );
      if (!bundleEntry) {
        return NextResponse.json(
          { error: 'Invalid app package: missing UI bundle' },
          { status: 400 }
        );
      }

      uiBundle = bundleEntry.getData().toString('utf8');

      // Extract icon if present
      const iconEntry = zipEntries.find(e => e.entryName === 'app.png' || e.entryName === 'app.jpg');
      if (iconEntry) {
        iconData = iconEntry.getData();
      }

      // Extract API handlers
      const apiEntries = zipEntries.filter(e => e.entryName.startsWith('api/') && e.entryName.endsWith('.js'));
      for (const entry of apiEntries) {
        const handlerName = path.basename(entry.entryName, '.js');
        apiHandlers.set(handlerName, entry.getData());
      }
    } catch (error) {
      console.error('Error extracting zip:', error);
      return NextResponse.json(
        { error: 'Invalid zip file' },
        { status: 400 }
      );
    }

    // Validate required attributes
    if (!appAttributes.id || !appAttributes.name || !appAttributes.version ||
        !appAttributes.author || !appAttributes.description) {
      return NextResponse.json(
        { error: 'Missing required app attributes' },
        { status: 400 }
      );
    }

    // Check if app already exists
    const existingApp = await getApp(appAttributes.id);
    if (existingApp) {
      return NextResponse.json(
        { error: 'App with this ID already exists' },
        { status: 409 }
      );
    }

    // Get app directory in the project
    const appDir = path.join(process.cwd(), 'apps', appAttributes.id);
    await fs.mkdir(appDir, { recursive: true });

    // Create dist directory
    const distDir = path.join(appDir, 'dist');
    await fs.mkdir(distDir, { recursive: true });

    // Create api directory
    const apiDir = path.join(distDir, 'api');
    await fs.mkdir(apiDir, { recursive: true });

    // Save the UI bundle
    const bundlePath = path.join(distDir, `${appAttributes.id}.js`);
    await fs.writeFile(bundlePath, uiBundle, 'utf-8');

    // Save API handlers
    for (const [handlerName, handlerData] of apiHandlers) {
      const handlerPath = path.join(apiDir, `${handlerName}.js`);
      await fs.writeFile(handlerPath, handlerData);
    }

    // Create app in database
    await createApp(
      appAttributes.id,
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
        const authId = `${appAttributes.id}:${auth.id}`;
        await createAuthorization(
          authId,
          auth.name,
          auth.description || '',
          appAttributes.id
        );
      }
    }

    // Save icon if provided
    if (iconData) {
      // Get storage path
      const storagePath = await getSystemSetting('storage');
      if (storagePath) {
        const iconDir = path.join(storagePath, 'system', 'apps', 'icons', appAttributes.id);
        await fs.mkdir(iconDir, { recursive: true });

        const iconPath = path.join(iconDir, 'icon.png');
        await fs.writeFile(iconPath, iconData);
      }
    }

    return NextResponse.json({
      success: true,
      appId: appAttributes.id,
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
