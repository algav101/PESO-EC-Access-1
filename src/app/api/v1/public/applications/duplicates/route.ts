export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { applicationDraftSchema } from "@/lib/application-schema";
import { findDuplicateWarnings } from "@/lib/application-service";

export async function POST(request: Request) {
  try {
    const parsed = applicationDraftSchema.partial().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid duplicate-check details." }, { status: 400 });
    return NextResponse.json(await findDuplicateWarnings(parsed.data));
  } catch {
    return NextResponse.json({ error: "Unable to check possible duplicates." }, { status: 500 });
  }
}
