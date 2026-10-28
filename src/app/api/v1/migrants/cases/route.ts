import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, isAdminUser } from "@/lib/permissions";

function generateCaseTrackingCode(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CASE-${year}-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingCode = searchParams.get("trackingCode")?.trim().toUpperCase();

    // 1. Public or Staff Lookup by Tracking Code
    if (trackingCode) {
      const caseReport = await prisma.migrantCaseReport.findUnique({
        where: { trackingCode },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!caseReport) {
        return NextResponse.json(
          { error: "Case report not found. Please check your Case Tracking Code." },
          { status: 404 }
        );
      }

      return NextResponse.json({ caseReport });
    }

    // 2. Staff List & Dashboard Analytics
    const user = await getCurrentUser(request);
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "migrants.read"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = searchParams.get("status") || "ALL";
    const workerCategory = searchParams.get("workerCategory") || "ALL";
    const urgencyLevel = searchParams.get("urgencyLevel") || "ALL";
    const search = searchParams.get("search")?.trim() || "";

    const whereClause: any = {};
    if (status !== "ALL") whereClause.status = status;
    if (workerCategory !== "ALL") whereClause.workerCategory = workerCategory;
    if (urgencyLevel !== "ALL") whereClause.urgencyLevel = urgencyLevel;
    if (search) {
      whereClause.OR = [
        { trackingCode: { contains: search, mode: "insensitive" } },
        { ofwFullName: { contains: search, mode: "insensitive" } },
        { countryOrVessel: { contains: search, mode: "insensitive" } },
        { reporterName: { contains: search, mode: "insensitive" } },
        { passportNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [cases, allCases] = await Promise.all([
      prisma.migrantCaseReport.findMany({
        where: whereClause,
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.migrantCaseReport.findMany({
        select: { status: true, urgencyLevel: true, workerCategory: true },
      }),
    ]);

    const stats = {
      total: allCases.length,
      open: allCases.filter((c) => c.status === "OPEN").length,
      investigating: allCases.filter((c) => c.status === "UNDER_INVESTIGATION").length,
      endorsed: allCases.filter((c) => c.status === "ENDORSED_TO_DMW_OWWA").length,
      resolved: allCases.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length,
      criticalSos: allCases.filter((c) => c.urgencyLevel === "CRITICAL_SOS" && c.status !== "RESOLVED" && c.status !== "CLOSED").length,
      seaBased: allCases.filter((c) => c.workerCategory === "SEA_BASED").length,
      landBased: allCases.filter((c) => c.workerCategory === "LAND_BASED").length,
    };

    return NextResponse.json({ cases, stats });
  } catch (error: any) {
    console.error("GET /api/v1/migrants/cases error:", error);
    return NextResponse.json(
      { error: "Failed to fetch migrant case reports", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const ofwLastName = (body.ofwLastName || "").trim().toUpperCase();
    const ofwFirstName = (body.ofwFirstName || "").trim().toUpperCase();
    const ofwMiddleName = (body.ofwMiddleName || "").trim().toUpperCase();
    const ofwSuffix = (body.ofwSuffix || "").trim().toUpperCase();

    if (!ofwLastName || !ofwFirstName) {
      return NextResponse.json(
        { error: "OFW / Seafarer First Name and Last Name are required." },
        { status: 400 }
      );
    }

    if (!body.countryOrVessel || !body.caseSummary) {
      return NextResponse.json(
        { error: "Country/Vessel of deployment and Case Narrative (Salaysay) are required." },
        { status: 400 }
      );
    }

    const ofwFullName = `${ofwLastName}, ${ofwFirstName}${ofwMiddleName ? " " + ofwMiddleName : ""}${ofwSuffix ? " " + ofwSuffix : ""}`;
    const trackingCode = generateCaseTrackingCode();

    const isFiledByFamily = Boolean(body.isFiledByFamily);
    const reporterName = isFiledByFamily
      ? (body.reporterName || "").trim().toUpperCase() || ofwFullName
      : ofwFullName;

    const createdCase = await prisma.migrantCaseReport.create({
      data: {
        trackingCode,
        workerCategory: body.workerCategory || "LAND_BASED",
        caseCategory: body.caseCategory || "CONTRACT_VIOLATION_UNPAID_WAGES",
        urgencyLevel: body.urgencyLevel || "HIGH",
        ofwLastName,
        ofwFirstName,
        ofwMiddleName: ofwMiddleName || null,
        ofwSuffix: ofwSuffix || null,
        ofwFullName,
        ofwBirthday: body.ofwBirthday || null,
        ofwSex: body.ofwSex || "FEMALE",
        ofwCivilStatus: body.ofwCivilStatus || "MARRIED",
        ofwContactAbroad: (body.ofwContactAbroad || "").trim() || "N/A",
        passportNumber: (body.passportNumber || "").trim().toUpperCase() || null,
        sirbNumber: (body.sirbNumber || "").trim().toUpperCase() || null,
        owwaStatus: body.owwaStatus || "ACTIVE",
        countryOrVessel: (body.countryOrVessel || "").trim(),
        jobPosition: (body.jobPosition || "").trim() || "OFW",
        foreignEmployer: (body.foreignEmployer || "").trim() || null,
        localAgency: (body.localAgency || "").trim() || null,
        isFiledByFamily,
        reporterName,
        reporterRelationship: isFiledByFamily ? body.reporterRelationship || "SPOUSE" : "SELF",
        reporterBarangay: body.reporterBarangay || "Poblacion",
        reporterContact: (body.reporterContact || body.ofwContactAbroad || "").trim(),
        caseSummary: (body.caseSummary || "").trim(),
        submittedRequirements:
          typeof body.submittedRequirements === "string"
            ? body.submittedRequirements
            : JSON.stringify(body.submittedRequirements || {}),
        status: "OPEN",
        messages: {
          create: [
            {
              senderType: "REPORTER",
              senderName: reporterName,
              message: `Initial Case Report Submitted (${body.caseCategory || "GENERAL WELFARE"}): ${(body.caseSummary || "").trim()}`,
            },
            {
              senderType: "DMW_OWWA_DESK",
              senderName: "PESO Dingalan Migrant Workers Desk",
              message: `Case Intake Logged under Reference ${trackingCode}. Your report and documentary checklist have been queued for verification and coordination with DMW Regional Office III / OWWA RWO-III (Hotline 1348). You may send follow-up messages or updates here at any time.`,
            },
          ],
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      caseReport: createdCase,
      trackingCode: createdCase.trackingCode,
    });
  } catch (error: any) {
    console.error("POST /api/v1/migrants/cases error:", error);
    return NextResponse.json(
      { error: "Failed to submit case report", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, trackingCode, message, senderName, senderType, status, endorsedAgency, urgencyLevel, adminRemarks, attachmentName, attachmentUrl } = body;

    const user = await getCurrentUser(request);
    const isStaff = Boolean(user && (isAdminUser(user) || hasPermission(user.role, "migrants.manage") || hasPermission(user.role, "migrants.read")));

    const existing = await prisma.migrantCaseReport.findFirst({
      where: id ? { id } : { trackingCode: (trackingCode || "").trim().toUpperCase() },
    });

    if (!existing) {
      return NextResponse.json({ error: "Case report not found." }, { status: 404 });
    }

    // If unauthenticated public user, only allow adding a REPORTER message if trackingCode matches
    if (!isStaff) {
      if (!trackingCode || existing.trackingCode !== trackingCode.trim().toUpperCase()) {
        return NextResponse.json({ error: "Valid Case Tracking Code is required to post a message." }, { status: 403 });
      }
      if (!message || !message.trim()) {
        return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
      }

      await prisma.migrantCaseMessage.create({
        data: {
          caseId: existing.id,
          senderType: "REPORTER",
          senderName: senderName?.trim() || existing.reporterName,
          message: message.trim(),
          attachmentName: attachmentName || null,
          attachmentUrl: attachmentUrl || null,
        },
      });

      const updated = await prisma.migrantCaseReport.findUnique({
        where: { id: existing.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      return NextResponse.json({ success: true, caseReport: updated });
    }

    // Staff update: can update status, endorsedAgency, urgencyLevel, adminRemarks, and optionally post a reply message
    const updateData: any = {};
    if (status) updateData.status = status;
    if (endorsedAgency !== undefined) updateData.endorsedAgency = endorsedAgency;
    if (urgencyLevel) updateData.urgencyLevel = urgencyLevel;
    if (adminRemarks !== undefined) updateData.adminRemarks = adminRemarks;

    if (message && message.trim()) {
      await prisma.migrantCaseMessage.create({
        data: {
          caseId: existing.id,
          senderType: senderType || "PESO_STAFF",
          senderName: user?.fullName || senderName || "PESO Migrant Desk Officer",
          message: message.trim(),
          attachmentName: attachmentName || null,
          attachmentUrl: attachmentUrl || null,
        },
      });
    }

    const updated = await prisma.migrantCaseReport.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({ success: true, caseReport: updated });
  } catch (error: any) {
    console.error("PATCH /api/v1/migrants/cases error:", error);
    return NextResponse.json(
      { error: "Failed to update case report", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "migrants.manage"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing case id" }, { status: 400 });
    }

    await prisma.migrantCaseReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/v1/migrants/cases error:", error);
    return NextResponse.json({ error: "Failed to delete case report" }, { status: 500 });
  }
}

