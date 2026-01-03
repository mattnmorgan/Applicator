import { NextResponse } from 'next/server';
import { getAllApps } from '@/lib/db';

export async function GET() {
  try {
    const allApps = await getAllApps();

    // Sort apps alphabetically by label
    allApps.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({ apps: allApps });
  } catch (error) {
    console.error('Error fetching apps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch apps' },
      { status: 500 }
    );
  }
}
