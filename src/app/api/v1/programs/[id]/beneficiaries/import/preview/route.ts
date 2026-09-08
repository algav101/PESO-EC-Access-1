export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { parseBeneficiaryExcelBuffer } from "@/lib/excel-importer";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.import")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No Excel file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await parseBeneficiaryExcelBuffer(buffer, file.name, params.id);

    return NextResponse.json({ success: true, preview });
  } catch (error: any) {
    console.error("Import preview error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
