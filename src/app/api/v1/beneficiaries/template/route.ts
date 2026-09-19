export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { FINAL_BENEFICIARIES_CSV_TEMPLATE } from "@/lib/excel-importer";

export async function GET() {
  return new Response(FINAL_BENEFICIARIES_CSV_TEMPLATE, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tupad_final_beneficiaries_template.csv"',
    },
  });
}
