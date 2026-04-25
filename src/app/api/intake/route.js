import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    // Later:
    // 1. validate intake form
    // 2. run AI triage
    // 3. save to Supabase
    // 4. return triage result

    const patientId = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      patientId,
      waitCategory: "urgent",
      message: "Intake received successfully",
      received: body,
    });
  } catch (error) {
    console.error("Intake API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process intake",
      },
      { status: 500 },
    );
  }
}
