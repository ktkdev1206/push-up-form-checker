import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongodb';
import { Session } from '@/lib/database/models/Session';

/**
 * POST /api/sessions
 * Create a new workout session
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate request body
    const body = await request.json();

    // Validate required fields
    if (
      typeof body.totalReps !== 'number' ||
      typeof body.correctReps !== 'number' ||
      typeof body.incorrectReps !== 'number' ||
      typeof body.duration !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid request body. Missing required fields.' },
        { status: 400 }
      );
    }

    // Validate numeric fields are non-negative
    if (
      body.totalReps < 0 ||
      body.correctReps < 0 ||
      body.incorrectReps < 0 ||
      body.duration < 0
    ) {
      return NextResponse.json(
        { error: 'Invalid values. All numeric fields must be non-negative.' },
        { status: 400 }
      );
    }

    // Validate errors array
    if (!Array.isArray(body.errors)) {
      return NextResponse.json(
        { error: 'Invalid errors field. Must be an array.' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Create session document
    const sessionData = {
      totalReps: body.totalReps,
      correctReps: body.correctReps,
      incorrectReps: body.incorrectReps,
      duration: body.duration,
      formErrors: body.errors || [],
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      endedAt: body.endedAt ? new Date(body.endedAt) : undefined,
      userId: body.userId || undefined,
    };

    const session = new Session(sessionData);
    const savedSession = await session.save();

    // Return created session
    const sessionObj = savedSession.toObject();
    return NextResponse.json(
      {
        id: savedSession._id.toString(),
        ...sessionObj,
        errors: sessionObj.formErrors || [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions?id=sessionId
 * Retrieve a session by ID
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find session by ID
    const session = await Session.findById(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Return session data
    const sessionObj = session.toObject();
    return NextResponse.json(
      {
        id: session._id.toString(),
        ...sessionObj,
        errors: sessionObj.formErrors || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

