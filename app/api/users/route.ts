import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db';

export async function GET() {
  try {
    const users = await getAllUsers();

    // Remove password hashes from response
    const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
