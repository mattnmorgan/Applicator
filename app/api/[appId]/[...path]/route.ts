import { NextRequest, NextResponse } from 'next/server';
import { getApp, getSystemSetting } from '@/lib/database/helpers';
import { createPlugin, getSession } from '@/lib/sdk';
import * as path from 'path';
import * as fs from 'fs';
import { createRequire } from 'module';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> }
) {
  return handleRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> }
) {
  return handleRequest(request, params, 'POST');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> }
) {
  return handleRequest(request, params, 'PATCH');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> }
) {
  return handleRequest(request, params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> }
) {
  return handleRequest(request, params, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  params: Promise<{ appId: string; path: string[] }>,
  method: string
) {
  try {
    const { appId, path: routePath } = await params;
    const route = routePath.join('/');

    // Get app from database
    const app = await getApp(appId);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Find matching route
    const apiRoute = app.data.apiRoutes?.find(
      (r) => r.path === route && r.method === method
    );

    if (!apiRoute) {
      return NextResponse.json(
        { error: 'API route not found' },
        { status: 404 }
      );
    }

    // Get system storage path
    const storagePath = await getSystemSetting('storage');
    if (!storagePath) {
      return NextResponse.json(
        { error: 'System storage not configured' },
        { status: 500 }
      );
    }

    // Load the handler from the app's API directory in system storage
    // Use .js extension since we're loading compiled output
    const handlerPath = path.join(
      storagePath,
      'apps',
      appId,
      'api',
      `${apiRoute.handler}.js`
    );

    // Check if file exists
    if (!fs.existsSync(handlerPath)) {
      return NextResponse.json(
        { error: 'Handler file not found' },
        { status: 500 }
      );
    }

    // Use createRequire to load the handler dynamically
    // This bypasses Next.js static analysis
    const require = createRequire(import.meta.url || __filename);
    const absolutePath = path.resolve(handlerPath);

    // Clear cache to ensure fresh load
    delete require.cache[absolutePath];
    const handlerModule = require(absolutePath);
    const handler = handlerModule[method];

    if (!handler || typeof handler !== 'function') {
      return NextResponse.json(
        { error: 'Handler function not found' },
        { status: 500 }
      );
    }

    // Get session for user context (optional)
    const sessionId = request.cookies.get('session')?.value;
    let userId: string | undefined;

    if (sessionId) {
      const session = await getSession(sessionId);
      if (session) {
        userId = session.userId;
      }
    }

    // Create plugin context
    const plugin = createPlugin(appId, userId);
    const context = { plugin };

    // Execute the handler with context
    return await handler(request, context);
  } catch (error) {
    console.error('Error handling app API request:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
