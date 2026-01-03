import { NextResponse } from 'next/server';
import { getAllAuthorizations, getApp } from '@/lib/db';

export async function GET() {
  try {
    const allAuthorizations = await getAllAuthorizations();

    // Enrich authorizations with app information
    const authorizationsWithAppInfo = await Promise.all(
      allAuthorizations.map(async (authorization) => {
        const app = await getApp(authorization.app);
        return {
          ...authorization,
          appLabel: app?.label || 'Unknown',
        };
      })
    );

    // Sort authorizations alphabetically by name
    authorizationsWithAppInfo.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ authorizations: authorizationsWithAppInfo });
  } catch (error) {
    console.error('Error fetching authorizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authorizations' },
      { status: 500 }
    );
  }
}
