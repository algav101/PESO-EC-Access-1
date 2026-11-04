export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canUseDoleReports, DOLE_REPORT_SHEETS, DOLE_REPORT_VERSION, type DoleSheetName } from "@/lib/dole-report-config";
import { ReportInputError } from "@/lib/dole-report-data";
import { loadDoleReport, readDoleReportTemplate, saveDoleReportDraft } from "@/lib/dole-report-service";
import { populateDoleWorkbook } from "@/lib/dole-report-xml";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canUseDoleReports(user)) return NextResponse.json({ error: "Reports are available to administrators and DOLE only." }, { status: 403 });
  try {
    const data = await loadDoleReport(params.id);
    if (!data) return NextResponse.json({ error: "Program not found." }, { status: 404 });
    return NextResponse.json({ ...data, sheets: DOLE_REPORT_SHEETS, version: DOLE_REPORT_VERSION }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ReportInputError ? error.message : "Unable to load program reports." }, { status: error instanceof ReportInputError ? 422 : 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canUseDoleReports(user)) return NextResponse.json({ error: "Reports are available to administrators and DOLE only." }, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 1600000) return NextResponse.json({ error: "Report draft is too large." }, { status: 400 });
    let body;
    try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
    if (!["save", "generate", "print"].includes(body.action)) throw new ReportInputError("Choose Save, Generate Excel or Prepare Print.");
    const data = await loadDoleReport(params.id, body.draft);
    if (!data) return NextResponse.json({ error: "Program not found." }, { status: 404 });
    if (body.action === "save") {
      await saveDoleReportDraft(params.id, data.draft, body.revision ?? null, user.id);
      return NextResponse.json({ success: true });
    }
    if (!data.rows.length) throw new ReportInputError("Upload a masterlist to this program before generating reports.");
    if (data.rows.length > 2000) throw new ReportInputError("Generate reports for at most 2,000 beneficiaries per program.");
    if (!Array.isArray(body.sheets) || !body.sheets.length || body.sheets.some((s: any) => !DOLE_REPORT_SHEETS.some((item) => item.name === s))) throw new ReportInputError("Select valid report sheets.");
    const selected = [...new Set(body.sheets)] as DoleSheetName[];
    if (selected.some((s) => ["PAYROLL", "USSC PAYROLL", "FORM 4 for consolidated"].includes(s)) && !data.meta.dailyRate) throw new ReportInputError("Enter the approved daily wage rate before generating payroll/consolidated salary formulas.");
    const workbook = await populateDoleWorkbook(await readDoleReportTemplate(), data, selected);
    await logAudit({ userId: user.id, action: body.action === "print" ? "DOLE_REPORT_PRINT_PREPARED" : "DOLE_REPORT_GENERATED", entityType: "PROGRAM", entityId: params.id, metadata: { sheets: selected, count: data.rows.length, version: DOLE_REPORT_VERSION } });
    const filename = `${body.action === "print" ? "PRINT" : "REPORTS"}_${data.program.programCode.replace(/[^A-Za-z0-9_-]/g, "_")}.xlsx`;
    return new Response(new Uint8Array(workbook), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ReportInputError) return NextResponse.json({ error: error.message }, { status: 422 });
    if (error instanceof Error && /^(Cannot overwrite template formula|Only blank template cells|Template cell row not found|The original DTR|DOLE report template file is missing)/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("DOLE report generation failed", error);
    return NextResponse.json({ error: "Unable to prepare the workbook. Check the selected sheets and report inputs." }, { status: 500 });
  }
}
