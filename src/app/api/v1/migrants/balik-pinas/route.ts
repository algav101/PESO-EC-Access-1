import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, isAdminUser, isPesoPersonnel } from "@/lib/permissions";

function generateElporControlNo(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ELPOR-${year}-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const controlNo = searchParams.get("controlNo")?.trim().toUpperCase();

    // 1. Public or Staff Lookup by Control No.
    if (controlNo) {
      const application = await prisma.balikPinasApplication.findUnique({
        where: { controlNo },
      });

      if (!application) {
        return NextResponse.json(
          { error: "ELPOR / Balik Pinas Application not found. Please check your Control Number." },
          { status: 404 }
        );
      }

      return NextResponse.json({ application });
    }

    // 2. Staff List & Dashboard Summary
    const user = await getCurrentUser(request);
    if (!user || (!isPesoPersonnel(user) && !isAdminUser(user) && !hasPermission(user.role, "migrants.read"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = searchParams.get("status") || "ALL";
    const programComponent = searchParams.get("programComponent") || "ALL";
    const barangay = searchParams.get("barangay") || "ALL";
    const search = searchParams.get("search")?.trim() || "";

    const whereClause: any = {};
    if (status !== "ALL") whereClause.status = status;
    if (programComponent !== "ALL") whereClause.programComponent = programComponent;
    if (barangay !== "ALL") whereClause.barangay = barangay;
    if (search) {
      whereClause.OR = [
        { controlNo: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
        { jobsiteCountry: { contains: search, mode: "insensitive" } },
        { proposedBusinessType: { contains: search, mode: "insensitive" } },
        { passportNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [applications, allApps] = await Promise.all([
      prisma.balikPinasApplication.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      }),
      prisma.balikPinasApplication.findMany({
        select: { status: true, programComponent: true, amountOfAssistance: true },
      }),
    ]);

    const stats = {
      total: allApps.length,
      ebpbh: allApps.filter((a) => a.programComponent === "EBPBH").length,
      eldap: allApps.filter((a) => a.programComponent === "ELDAP").length,
      submitted: allApps.filter((a) => a.status === "SUBMITTED" || a.status === "UNDER_EVALUATION").length,
      endorsed: allApps.filter((a) => a.status === "ENDORSED_TO_DMW_RO3").length,
      approved: allApps.filter((a) => a.status === "APPROVED" || a.status === "RELEASED").length,
    };

    return NextResponse.json({ applications, stats });
  } catch (error: any) {
    console.error("GET /api/v1/migrants/balik-pinas error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Balik Pinas applications", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const lastName = (body.lastName || "").trim().toUpperCase();
    const firstName = (body.firstName || "").trim().toUpperCase();
    const middleName = (body.middleName || "").trim().toUpperCase();
    const suffix = (body.suffix || "").trim().toUpperCase();

    if (!lastName || !firstName) {
      return NextResponse.json(
        { error: "Applicant Surname (Apelyido) and First Name (Pangalan) are required." },
        { status: 400 }
      );
    }

    if (!body.jobsiteCountry || !body.proposedBusinessType) {
      return NextResponse.json(
        { error: "Jobsite/Country Abroad and Proposed Type of Business are required." },
        { status: 400 }
      );
    }

    const fullName = `${lastName}, ${firstName}${middleName ? " " + middleName : ""}${suffix ? " " + suffix : ""}`;
    const controlNo = generateElporControlNo();
    const todayStr = new Date().toISOString().split("T")[0];

    const created = await prisma.balikPinasApplication.create({
      data: {
        controlNo,
        programComponent: body.programComponent || "EBPBH",
        dateFiled: body.dateFiled || todayStr,
        scheduledBy: body.scheduledBy || null,
        photoDataUrl: body.photoDataUrl || null,
        lastName,
        firstName,
        middleName: middleName || null,
        suffix: suffix || null,
        fullName,
        houseNumber: body.houseNumber || null,
        street: body.street || null,
        barangay: body.barangay || "Poblacion",
        municipality: body.municipality || "Dingalan",
        province: body.province || "Aurora",
        birthdate: body.birthdate || "",
        age: body.age ? Number(body.age) : null,
        sex: body.sex || "FEMALE",
        civilStatus: body.civilStatus || "MARRIED",
        otherDataJson:
          typeof body.otherDataJson === "string"
            ? body.otherDataJson
            : JSON.stringify(body.otherData || {}),
        cellphone1: (body.cellphone1 || "").trim(),
        cellphone2: (body.cellphone2 || "").trim() || null,
        emailOrFb: (body.emailOrFb || "").trim() || null,
        workerCategory: body.workerCategory || "LAND_BASED",
        jobsiteCountry: (body.jobsiteCountry || "").trim(),
        jobPosition: (body.jobPosition || "").trim(),
        latestDepartureDate: body.latestDepartureDate || null,
        latestContractDuration: body.latestContractDuration || null,
        latestArrivalDate: body.latestArrivalDate || null,
        passportNumber: (body.passportNumber || "").trim().toUpperCase() || null,
        proposedBusinessType: (body.proposedBusinessType || "").trim(),
        businessLocation: (body.businessLocation || "").trim() || `${body.barangay || "Poblacion"}, Dingalan, Aurora`,
        hasExistingBusiness: Boolean(body.hasExistingBusiness),
        existingBusinessDetails: body.existingBusinessDetails || null,
        trainingKind: body.trainingKind || null,
        trainingVenue: body.trainingVenue || null,
        trainingIssuedBy: body.trainingIssuedBy || null,
        trainingDate: body.trainingDate || null,
        reasonForReturn: (body.reasonForReturn || "").trim() || "Distressed / Displaced Returning OFW",
        briefStatement: (body.briefStatement || "").trim() || "Nais magsimula ng munting negosyo sa Dingalan bilang bahagi ng OFW Reintegration Program.",
        suppliesAndEquipmentJson:
          typeof body.suppliesAndEquipmentJson === "string"
            ? body.suppliesAndEquipmentJson
            : JSON.stringify(body.suppliesAndEquipment || []),
        totalProposedAmount: body.totalProposedAmount ? Number(body.totalProposedAmount) : 20000,
        businessCanvasJson:
          typeof body.businessCanvasJson === "string"
            ? body.businessCanvasJson
            : JSON.stringify(body.businessCanvas || {}),
        documentsChecklistJson:
          typeof body.documentsChecklistJson === "string"
            ? body.documentsChecklistJson
            : JSON.stringify(body.documentsChecklist || {}),
        agreedToCommitment: body.agreedToCommitment !== false,
        agreedToKasulatan: body.agreedToKasulatan !== false,
        status: "SUBMITTED",
        amountOfAssistance: body.programComponent === "ELDAP" ? 50000 : 20000,
      },
    });

    return NextResponse.json({
      success: true,
      application: created,
      controlNo: created.controlNo,
    });
  } catch (error: any) {
    console.error("POST /api/v1/migrants/balik-pinas error:", error);
    return NextResponse.json(
      { error: "Failed to submit ELPOR / Balik Pinas application", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "migrants.manage"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, withPreviousAvailment, previousProgram, amountOfAssistance, evaluatedBy, adminRemarks, scheduledBy } = body;

    if (!id) {
      return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (withPreviousAvailment !== undefined) updateData.withPreviousAvailment = Boolean(withPreviousAvailment);
    if (previousProgram !== undefined) updateData.previousProgram = previousProgram;
    if (amountOfAssistance !== undefined) updateData.amountOfAssistance = Number(amountOfAssistance);
    if (evaluatedBy !== undefined) updateData.evaluatedBy = evaluatedBy || user.fullName;
    if (adminRemarks !== undefined) updateData.adminRemarks = adminRemarks;
    if (scheduledBy !== undefined) updateData.scheduledBy = scheduledBy;

    const updated = await prisma.balikPinasApplication.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    console.error("PATCH /api/v1/migrants/balik-pinas error:", error);
    return NextResponse.json(
      { error: "Failed to update application", details: error.message },
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
      return NextResponse.json({ error: "Missing application id" }, { status: 400 });
    }

    await prisma.balikPinasApplication.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/v1/migrants/balik-pinas error:", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}

