import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

interface ECGResult {
  ecgDate: string;
  monitorSN: string;
  fio: string;
  ecgDescription: string;
  recordedBy: string;
  recordedByOrg: string;
  diagnosedBy: string;
  diagnosedByOrg: string;
  ecgLink: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const iin = searchParams.get("iin");

    if (!iin) {
      return NextResponse.json(
        { error: "IIN parameter is required" },
        { status: 400 }
      );
    }

    // Step 1: Get authorization token
    const tokenResponse = await fetch(
      "https://client.sapatelemed.kz/ecgbyiin/token?username=dastan&password=Paidalanylatyn1QupiyaSoz",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to get authorization token");
    }

    const tokenData = await tokenResponse.text();

    // Parse the JSON response to extract the access_token
    const tokenJson = JSON.parse(tokenData);
    const bearerToken = tokenJson.access_token;

    // Step 2: Get ECG results using the token
    const ecgResponse = await fetch(
      `https://client.sapatelemed.kz/ecgbyiin/api/ECGResults/${iin}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!ecgResponse.ok) {
      if (ecgResponse.status === 404) {
        return NextResponse.json({ ecgResults: [] }); // No ECGs found
      }
      throw new Error("Failed to fetch ECG results");
    }

    const ecgResults: ECGResult[] = await ecgResponse.json();

    return NextResponse.json({ ecgResults });
  } catch (error) {
    console.error("Error fetching ECG data:", error);
    return NextResponse.json(
      { error: "Failed to fetch ECG data" },
      { status: 500 }
    );
  }
}
