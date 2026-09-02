import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const sampleData = [
      {
        "NAME OF BENEFICIARIES": "ALCANTARA, VILMA SANTILESES",
        "ADL NO.": "2025_03_0318_RO3_LAWAATBINHI",
        "ORIENTATION DATE": "July 22, 2025",
        "WORK DATE": "Aug. 4-Sept. 5, 2025",
        "PAYOUT DATE": "September 13, 2025",
        "Barangay": "BUHANGIN",
        "City/ Municipality": "BALER",
      },
      {
        "NAME OF BENEFICIARIES": "BASQUIÑA, LARA QUEEN DOSAYEN",
        "ADL NO.": "2025_03_0318_RO3_LAWAATBINHI",
        "ORIENTATION DATE": "July 22, 2025",
        "WORK DATE": "Aug. 4-Sept. 5, 2025",
        "PAYOUT DATE": "September 13, 2025",
        "Barangay": "BUHANGIN",
        "City/ Municipality": "BALER",
      },
      {
        "NAME OF BENEFICIARIES": "CEREZO, MA. THERESA PEROLINA",
        "ADL NO.": "2025_03_0318_RO3_LAWAATBINHI",
        "ORIENTATION DATE": "July 22, 2025",
        "WORK DATE": "Aug. 4-Sept. 5, 2025",
        "PAYOUT DATE": "September 13, 2025",
        "Barangay": "BUHANGIN",
        "City/ Municipality": "BALER",
      },
      {
        "NAME OF BENEFICIARIES": "DEL CORO, MA. CRISTINA AMOR",
        "ADL NO.": "Barangay Appointive Personnel - BHW",
        "ORIENTATION DATE": "July 22, 2025",
        "WORK DATE": "Aug. 4-Sept. 5, 2025",
        "PAYOUT DATE": "September 13, 2025",
        "Barangay": "BUHANGIN",
        "City/ Municipality": "BALER",
      },
      {
        "NAME OF BENEFICIARIES": "LUMBAN, ERNESTO MANABAT JR.",
        "ADL NO.": "Barangay Appointive Personnel - Tanod",
        "ORIENTATION DATE": "August 01, 2025",
        "WORK DATE": "Aug. 10-Aug. 25, 2025",
        "PAYOUT DATE": "September 05, 2025",
        "Barangay": "PALTIC",
        "City/ Municipality": "DINGALAN",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Column widths matching reference
    ws["!cols"] = [
      { wch: 34 }, // NAME OF BENEFICIARIES
      { wch: 36 }, // ADL NO.
      { wch: 20 }, // ORIENTATION DATE
      { wch: 24 }, // WORK DATE
      { wch: 22 }, // PAYOUT DATE
      { wch: 18 }, // Barangay
      { wch: 22 }, // City/ Municipality
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Disqualified_Beneficiaries");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="TUPAD_Disqualified_Beneficiaries_Reference_Template.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
