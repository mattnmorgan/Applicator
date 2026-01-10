/**
 * API endpoint for searching tables across all apps
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';
import { searchTables } from '@/lib/model/tables';

/**
 * GET - Search for tables across all apps
 * Query params: q (search query, optional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const results = await searchTables(query);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Failed to search tables:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to search tables',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper to get session from request
 */
async function getSessionFromRequest(request: NextRequest) {
  const sessionId = request.headers
    .get('cookie')
    ?.split(';')
    .find((c) => c.trim().startsWith('session='))
    ?.split('=')[1];

  if (!sessionId) {
    return null;
  }

  return await getSession(sessionId);
}
