export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const sampleData = [
      {
        "NAME OF BENEFICIARIES": "ALCANTARA, VILMA SANTILESES",
        "Batch / Appointive Position": "Lawa at Binhi Batch45860",
        "ORIENTATION DATE": "22/07/2025",
        "WORK DATE": "Aug. 4-Sept. 5, 2025",
        "PAYOUT DATE": "13/09/2025",
        "Barangay": "BUHANGIN",
        "City/ Municipality": "BALER",
      },
      {
        "NAME OF BENEFICIARIES": "BASQUIÑA, LARA QUEEN DOSAYEN",
        "Batch / Appointive Position": "Lawa at Binhi Batch45860",
        "ORIENTATION DATE": "22/07/2025",
        "WORK DATE": "Aug. 4-Sept. 5, 2025",
        "PAYOUT DATE": "13/09/2025",
        "Barangay": "BUHANGIN",
        "City/ Municipality": "BALER",
      },
      {
        "NAME OF BENEFICIARIES": "CEREZO, MA. THERESA PEROLINA",
        "Batch / Appointive Position": "Lawa at Binhi Batch45860",
        "ORIENTATION DATE": "22/07/2025",
        "WORK DATE": "Aug. 4-Sept. 5, 2025",
        "PAYOUT DATE": "13/09/2025",
        "Barangay": "BUHANGIN",
        "City/ Municipality": "BALER",
      },
      {
        "NAME OF BENEFICIARIES": "DEL CORO, MA. CRISTINA AMOR",
        "Batch / Appointive Position": "Barangay Appointive Personnel - BHW",
        "ORIENTATION DATE": "22/07/2025",
        "WORK DATE": "Aug. 4-Sept. 5, 2025",
        "PAYOUT DATE": "13/09/2025",
        "Barangay": "BUHANGIN",
        "City/ Municipality": "BALER",
      },
      {
        "NAME OF BENEFICIARIES": "LUMBAN, ERNESTO MANABAT JR.",
        "Batch / Appointive Position": "Barangay Appointive Personnel - Tanod",
        "ORIENTATION DATE": "01/08/2025",
        "WORK DATE": "Aug. 10-Aug. 25, 2025",
        "PAYOUT DATE": "05/09/2025",
        "Barangay": "PALTIC",
        "City/ Municipality": "DINGALAN",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Column widths matching reference
    ws["!cols"] = [
      { wch: 34 }, // NAME OF BENEFICIARIES
      { wch: 36 }, // Batch / Appointive Position
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
