import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";

export async function GET() {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        iin: users.iin,
        userType: users.userType,
        doctorType: users.doctorType,
        fullName: users.fullName,
        createdAt: users.createdAt,
      })
      .from(users);

    return NextResponse.json({
      success: true,
      users: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    console.error("Error querying database:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to query database",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // WARNING: This will delete ALL users - only use for debugging!
    await db.delete(users);

    return NextResponse.json({
      success: true,
      message: "All users deleted",
    });
  } catch (error) {
    console.error("Error deleting users:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete users",
      },
      { status: 500 }
    );
  }
}
