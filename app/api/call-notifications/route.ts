import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/drizzle";
import { callNotifications, users } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

// GET - Fetch call notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const patientId = searchParams.get("patientId");

    let whereClause;
    if (patientId) {
      // If patientId is provided, get active calls for that specific patient
      whereClause = and(
        eq(callNotifications.patientId, patientId),
        eq(callNotifications.isActive, true)
      );
    } else if (activeOnly) {
      // Get only active call notifications where user is patient or caller
      whereClause = and(
        or(
          eq(callNotifications.patientId, session.user.id),
          eq(callNotifications.callerId, session.user.id)
        ),
        eq(callNotifications.isActive, true)
      );
    } else {
      // Get all call notifications for the user
      whereClause = or(
        eq(callNotifications.patientId, session.user.id),
        eq(callNotifications.callerId, session.user.id)
      );
    }

    const notifications = await db
      .select({
        id: callNotifications.id,
        patientId: callNotifications.patientId,
        callerId: callNotifications.callerId,
        channelName: callNotifications.channelName,
        isVideoCall: callNotifications.isVideoCall,
        isActive: callNotifications.isActive,
        startedAt: callNotifications.startedAt,
        endedAt: callNotifications.endedAt,
        participants: callNotifications.participants,
        callerName: users.fullName,
        callerUserType: users.userType,
      })
      .from(callNotifications)
      .leftJoin(users, eq(callNotifications.callerId, users.id))
      .where(whereClause)
      .orderBy(desc(callNotifications.startedAt));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching call notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new call notification
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only doctors and nurses can initiate calls
    const allowedUserTypes = [
      "DOCTOR",
      "DISTRICT_DOCTOR",
      "SPECIALIST_DOCTOR",
      "NURSE",
      "REGIONAL_ADMIN",
      "CITY_ADMIN",
      "DISTRICT_ADMIN",
    ];

    if (!allowedUserTypes.includes(session.user.userType)) {
      return NextResponse.json(
        { error: "Only medical providers can initiate calls" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { patientId, channelName, isVideoCall, participants } = body;

    if (!patientId || !channelName || typeof isVideoCall !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if there's already an active call for this patient by this caller
    const existingActiveCall = await db
      .select()
      .from(callNotifications)
      .where(
        and(
          eq(callNotifications.patientId, patientId),
          eq(callNotifications.callerId, session.user.id),
          eq(callNotifications.isActive, true)
        )
      )
      .limit(1);

    if (existingActiveCall.length > 0) {
      return NextResponse.json(
        {
          error:
            "У вас уже есть активный звонок с этим пациентом. Завершите текущий звонок перед началом нового.",
          existingCall: existingActiveCall[0],
        },
        { status: 409 } // Conflict status
      );
    }

    const newNotification = await db
      .insert(callNotifications)
      .values({
        patientId,
        callerId: session.user.id,
        channelName,
        isVideoCall,
        isActive: true,
        participants: participants ? JSON.stringify(participants) : null,
      })
      .returning();

    return NextResponse.json(newNotification[0]);
  } catch (error) {
    console.error("Error creating call notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update call notification (end call, add participants)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, isActive, participants, endedAt } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Call notification ID is required" },
        { status: 400 }
      );
    }

    const updateData: {
      isActive?: boolean;
      participants?: string;
      endedAt?: Date;
    } = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (participants) updateData.participants = JSON.stringify(participants);
    if (endedAt) updateData.endedAt = new Date(endedAt);

    const updatedNotification = await db
      .update(callNotifications)
      .set(updateData)
      .where(eq(callNotifications.id, id))
      .returning();

    return NextResponse.json(updatedNotification[0]);
  } catch (error) {
    console.error("Error updating call notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
