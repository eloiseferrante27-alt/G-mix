import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName: providedFirstName, lastName: providedLastName } = body;

    // For demo purposes, create a session with the provided data
    // In production, you would verify credentials with Supabase or Django
    const firstName = providedFirstName || email.split('@')[0];
    const lastName = providedLastName || 'Demo';

    const session = await createSession({
      userId: email, // Use email as userId for demo
      email,
      role: 'formateur', // Default role for demo
      firstName,
      lastName,
      organizationId: 'demo-org', // Default organization for demo
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
