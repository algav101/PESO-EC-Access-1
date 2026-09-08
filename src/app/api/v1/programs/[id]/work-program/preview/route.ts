export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseWorkProgramBuffer } from "@/lib/work-program-parser";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No work program file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await parseWorkProgramBuffer(buffer, file.name, params.id);

    return NextResponse.json({ success: true, preview });
  } catch (error: any) {
    console.error("Work Program preview error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
