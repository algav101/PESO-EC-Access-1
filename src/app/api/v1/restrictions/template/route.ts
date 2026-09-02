import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const sampleData = [
      {
        "FULL NAME": "DELA CRUZ, JUAN M.",
        "BIRTHDAY (YYYY-MM-DD)": "1985-04-12",
        "BARANGAY": "PALTIC",
        "PAYOUT DATE (YYYY-MM-DD)": "2026-03-15",
        "SOURCE PROGRAM NAME": "TUPAD Batch 2026-01 Emergency Employment",
        "RESTRICTION REASON": "365-Day Statutory Double Compensation Lockout",
      },
      {
        "FULL NAME": "SANTOS, MARIA L.",
        "BIRTHDAY (YYYY-MM-DD)": "1990-08-23",
        "BARANGAY": "POBLACION",
        "PAYOUT DATE (YYYY-MM-DD)": "2026-05-20",
        "SOURCE PROGRAM NAME": "TUPAD Batch 2026-02 Agro-Forestry Project",
        "RESTRICTION REASON": "Received 10-Day Payout in 2026",
      },
      {
        "FULL NAME": "REYES, PEDRO S.",
        "BIRTHDAY (YYYY-MM-DD)": "1978-11-05",
        "BARANGAY": "APLAYA",
        "PAYOUT DATE (YYYY-MM-DD)": "2026-06-10",
        "SOURCE PROGRAM NAME": "TUPAD Batch 2026-03 Coastal Clean-up",
        "RESTRICTION REASON": "Statutory 365-Day Lockout",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths
    ws["!cols"] = [
      { wch: 28 }, // Full Name
      { wch: 24 }, // Birthday
      { wch: 18 }, // Barangay
      { wch: 26 }, // Payout Date
      { wch: 45 }, // Source Program
      { wch: 45 }, // Reason
    ];

    XLSX.utils.book_append_sheet(wb, ws, "365_Day_Restrictions_Template");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="TUPAD_365_Day_Restriction_Database_Template.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
