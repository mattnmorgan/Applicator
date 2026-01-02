import { NextRequest, NextResponse } from 'next/server';
import { getApp } from '@/lib/db';
import * as path from 'path';
import * as fs from 'fs';

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
    const apiRoute = app.apiRoutes.find(
      (r) => r.path === route && r.method === method
    );

    if (!apiRoute) {
      return NextResponse.json(
        { error: 'API route not found' },
        { status: 404 }
      );
    }

    // Load the handler from the app's API directory
    const handlerPath = path.join(
      process.cwd(),
      'apps',
      appId,
      'src',
      'api',
      `${apiRoute.handler}.ts`
    );

    // Check if file exists
    if (!fs.existsSync(handlerPath)) {
      return NextResponse.json(
        { error: 'Handler file not found' },
        { status: 500 }
      );
    }

    // Dynamically import and execute the handler
    const handlerModule = await import(handlerPath);
    const handler = handlerModule[method];

    if (!handler || typeof handler !== 'function') {
      return NextResponse.json(
        { error: 'Handler function not found' },
        { status: 500 }
      );
    }

    // Execute the handler
    return await handler(request);
  } catch (error) {
    console.error('Error handling app API request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
