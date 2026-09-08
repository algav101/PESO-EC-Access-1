export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const headers = [
      "LAST NAME",
      "FIRST NAME",
      "MIDDLE NAME",
      "EXT. NAME",
      "MONTH",
      "DAY",
      "YEAR",
      "CIVIL STATUS",
      "STREET/SITIO",
      "BARANGAY",
      "CONTACT NO.",
      "ID PRESENTED",
      "ID NO.",
      "4PS(Y/N)",
      "IP(Y/N)",
      "OCCUPATION",
      "MONTHLY INCOME",
      "DEPENDENT(FULL NAME)",
      "AGE",
      "RELATIONSHIP",
      "REMARKS",
    ];

    const sampleRows = [
      {
        "LAST NAME": "DELA CRUZ",
        "FIRST NAME": "JUAN",
        "MIDDLE NAME": "SANTOS",
        "EXT. NAME": "",
        "MONTH": "05",
        "DAY": "14",
        "YEAR": "1988",
        "CIVIL STATUS": "MARRIED",
        "STREET/SITIO": "CENTRO",
        "BARANGAY": "PALTIC",
        "CONTACT NO.": "09123456789",
        "ID PRESENTED": "UMID",
        "ID NO.": "CRN-0111-2222-3333",
        "4PS(Y/N)": "N",
        "IP(Y/N)": "N",
        "OCCUPATION": "LABORER",
        "MONTHLY INCOME": "4500",
        "DEPENDENT(FULL NAME)": "MARIA DELA CRUZ",
        "AGE": "12",
        "RELATIONSHIP": "DAUGHTER",
        "REMARKS": "Complete application requirements submitted",
      },
      {
        "LAST NAME": "SANTOS",
        "FIRST NAME": "MARIA",
        "MIDDLE NAME": "GOMEZ",
        "EXT. NAME": "",
        "MONTH": "11",
        "DAY": "22",
        "YEAR": "1994",
        "CIVIL STATUS": "SINGLE",
        "STREET/SITIO": "PUROK 2",
        "BARANGAY": "APLAYA",
        "CONTACT NO.": "",
        "ID PRESENTED": "VOTERS ID",
        "ID NO.": "",
        "4PS(Y/N)": "N",
        "IP(Y/N)": "N",
        "OCCUPATION": "HOUSEWIFE",
        "MONTHLY INCOME": "3000",
        "DEPENDENT(FULL NAME)": "",
        "AGE": "",
        "RELATIONSHIP": "",
        "REMARKS": "Lacking Contact Number and Valid ID photocopy",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TUPAD_Applicants");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="TUPAD_Application_Roster_Template.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Template generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
