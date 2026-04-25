import { NextResponse } from "next/server";
import { generateSOAPNote } from "@/lib/gemini";

export async function POST(request) {
  const patientData = await request.json();

  if (!patientData || Object.keys(patientData).length === 0) {
    return NextResponse.json({ error: "patientData is required" }, { status: 400 });
  }

  try {
    const note = await generateSOAPNote(patientData);
    return NextResponse.json({ note });
  } catch (err) {
    console.error("generateSOAPNote failed:", err);
    return NextResponse.json({ error: "Failed to generate SOAP note" }, { status: 500 });
  }
}
