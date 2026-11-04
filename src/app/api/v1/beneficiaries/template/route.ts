export const dynamic = "force-dynamic";

import { readDoleReportTemplate } from "@/lib/dole-report-service";
import { populateDoleWorkbook } from "@/lib/dole-report-xml";
import { FORM4_CONSOLIDATED } from "@/lib/dole-report-config";
import { EMPTY_REPORT_DRAFT } from "@/lib/dole-report-data";

export async function GET() {
  const workbook = await populateDoleWorkbook(await readDoleReportTemplate(), {
    program: { id: "", programCode: "", programName: "", requiredWorkDays: 10 },
    meta: {}, rows: [], workDays: [], revision: null, draft: EMPTY_REPORT_DRAFT(), warnings: [],
  }, [FORM4_CONSOLIDATED], true);
  return new Response(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="tupad_form4_consolidated_template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
