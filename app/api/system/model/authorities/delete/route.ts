import { NextResponse } from 'next/server';
import { deleteAuthority, getUserCountByAuthority, getAuthority, getSession, userHasAuthorization } from '@/lib/db';
import { logger } from '@/lib/logging';

export async function POST(request: Request) {
  try {
    // Check authentication - authority management requires admin authorization
    const sessionId = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('session='))?.split('=')[1];
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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { authorityIds } = body;

    if (!authorityIds || !Array.isArray(authorityIds) || authorityIds.length === 0) {
      return NextResponse.json(
        { error: 'Authority IDs are required' },
        { status: 400 }
      );
    }

    // Check for system authorities
    const systemAuthorities = ['admin', 'user', 'guest'];
    const systemAuthorityAttempts = authorityIds.filter(id => systemAuthorities.includes(id));

    if (systemAuthorityAttempts.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete system authorities (Administrator, User, or Guest)', systemAuthorities: systemAuthorityAttempts },
        { status: 400 }
      );
    }

    // Check if any users are assigned to these authorities
    const violatedAuthorities: string[] = [];
    for (const authorityId of authorityIds) {
      const userCount = await getUserCountByAuthority(authorityId);
      if (userCount > 0) {
        violatedAuthorities.push(authorityId);
      }
    }

    if (violatedAuthorities.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete authorities that have users assigned', violatedAuthorities },
        { status: 400 }
      );
    }

    // Delete all authorities
    for (const authorityId of authorityIds) {
      // Get authority name before deletion for logging
      const authority = await getAuthority(authorityId);
      await deleteAuthority(authorityId);

      // Log authority deletion
      await logger.fromRequest(request).info('system', `Authority deleted: ${authority?.name || authorityId} (${authorityId})`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${authorityIds.length} ${authorityIds.length === 1 ? 'authority' : 'authorities'}`
    });
  } catch (error) {
    console.error('Failed to delete authorities:', error);
    return NextResponse.json(
      { error: 'Failed to delete authorities' },
      { status: 500 }
    );
  }
}
