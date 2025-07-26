import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { invitations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }
    const updated = await db
      .update(invitations)
      .set({ status })
      .where(eq(invitations.id, id));
    if (updated.rowCount === 0) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating invitation:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
