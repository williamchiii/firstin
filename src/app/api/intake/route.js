// src/app/api/intake/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    // 1. Safety check (simple keyword)
    const danger = ["chest pain", "can't breathe", "stroke"];
    if (danger.some((d) => body.chiefComplaint?.toLowerCase().includes(d))) {
      return NextResponse.json({
        esi_alert: true,
        message: "Seek immediate help",
      });
    }

    // 2. Fake AI (replace later)
    const esi_score = Math.random() > 0.5 ? 2 : 4;

    const result = {
      id: crypto.randomUUID(),
      chief_complaint: body.chiefComplaint,
      esi_score,
      wait_category: esi_score <= 2 ? "priority" : "standard",
      red_flags: esi_score <= 2 ? ["high risk symptoms"] : [],
      created_at: new Date().toISOString(),
    };

    // 3. TODO: insert into Supabase here

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}
