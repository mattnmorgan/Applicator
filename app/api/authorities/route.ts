import { NextResponse } from 'next/server';
import { getAllAuthorities } from '@/lib/db';

export async function GET() {
  try {
    const allAuthorities = await getAllAuthorities();

    const authorities = allAuthorities.map(authority => ({
      id: authority.id,
      name: authority.name,
    }));

    // Sort authorities: admin, user, guest, then alphabetically
    authorities.sort((a, b) => {
      const order = ['admin', 'user', 'guest'];
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ authorities });
  } catch (error) {
    console.error('Failed to fetch authorities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authorities' },
      { status: 500 }
    );
  }
}
