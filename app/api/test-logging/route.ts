import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST] About to log test message');
    await logger.info('test-endpoint', 'Test log message from API endpoint');
    console.log('[TEST] Successfully logged test message');

    return NextResponse.json({
      success: true,
      message: 'Test log created. Check Settings → Debug → Logs'
    });
  } catch (error) {
    console.error('[TEST] Error logging:', error);
    return NextResponse.json({
      error: 'Failed to create log',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
