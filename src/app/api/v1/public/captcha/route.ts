export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { generateCaptchaChallenge } from "@/lib/auth";

export async function GET() {
  try {
    const challenge = generateCaptchaChallenge();
    return NextResponse.json(challenge);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate security challenge" }, { status: 500 });
  }
}
