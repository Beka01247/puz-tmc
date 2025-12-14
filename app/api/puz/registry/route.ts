// API endpoint for ПУЗ Registry
// GET /api/puz/registry?condition=АГ&page=1&limit=30

import { NextRequest, NextResponse } from "next/server";
import { PuzCondition, RegistryResponse } from "@/types/puz";
import { getRegistryData } from "@/lib/utils/measurements";
import { auth } from "@/auth";
import { getPatientAccessConditions } from "@/lib/utils/patientAccess";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.userType === "PATIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    const condition = (searchParams.get("condition") || "АГ") as PuzCondition;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const search = searchParams.get("search") || undefined;
    const участок = searchParams.get("участок") || undefined;
    const riskLevelParam = searchParams.get("riskLevel");
    const riskLevel =
      riskLevelParam &&
      ["red", "yellow", "green", "neutral"].includes(riskLevelParam)
        ? (riskLevelParam as "red" | "yellow" | "green" | "neutral")
        : undefined;

    if (!["АГ", "СД", "ХСН"].includes(condition)) {
      return NextResponse.json(
        { error: "Invalid condition. Must be АГ, СД, or ХСН" },
        { status: 400 }
      );
    }

    // Get patient access conditions based on user role
    const accessConditions = getPatientAccessConditions(session.user);

    const result = await getRegistryData(condition, {
      search,
      участок,
      riskLevel,
      page,
      limit,
      accessConditions,
    });

    const response: RegistryResponse = {
      data: result.data,
      total: result.total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(result.total / limit),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in /api/puz/registry:", error);
    return NextResponse.json(
      { error: "Failed to fetch registry data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, condition } = body;

    if (!patientId || !condition) {
      return NextResponse.json(
        { error: "patientId and condition are required" },
        { status: 400 }
      );
    }

    // TODO: Implement screening recomputation logic
    // 1. Get patient's latest measurements
    // 2. Calculate overall risk
    // 3. Determine screening interval
    // 4. Create/update patient_screenings record

    return NextResponse.json({
      message: "Screening recomputation not yet implemented",
      patientId,
      condition,
    });
  } catch (error) {
    console.error("Error in POST /api/puz/registry:", error);
    return NextResponse.json(
      { error: "Failed to recompute screenings" },
      { status: 500 }
    );
  }
}
