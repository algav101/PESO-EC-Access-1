import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, isAdminUser } from "@/lib/permissions";

function generateOfcMemberCode(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OFC-DGL-${year}-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberCode = searchParams.get("memberCode")?.trim().toUpperCase();
    const lookupLastName = searchParams.get("lastName")?.trim().toUpperCase();
    const lookupFirstName = searchParams.get("firstName")?.trim().toUpperCase();
    const summaryOnly = searchParams.get("summary") === "1";

    // 1. Public or Staff Lookup by Member Code or Name
    if (memberCode || (lookupLastName && lookupFirstName)) {
      const member = await prisma.ofwFamilyCircleMember.findFirst({
        where: memberCode
          ? { memberCode }
          : {
              ofwLastName: { equals: lookupLastName, mode: "insensitive" },
              ofwFirstName: { contains: lookupFirstName, mode: "insensitive" },
            },
        orderBy: { createdAt: "desc" },
      });

      if (!member) {
        return NextResponse.json(
          { error: "OFW Family Circle registration record not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({ member });
    }

    // 2. Public Aggregate Stats for Migrants' Corner Hub / Landing Page
    if (summaryOnly) {
      const [totalMembers, totalCases, totalBalikPinas, byBarangay] = await Promise.all([
        prisma.ofwFamilyCircleMember.count(),
        prisma.migrantCaseReport.count(),
        prisma.balikPinasApplication.count(),
        prisma.ofwFamilyCircleMember.groupBy({
          by: ["dingalanBarangay"],
          _count: { _all: true },
        }),
      ]);

      return NextResponse.json({
        summary: {
          totalFamilyCircleMembers: totalMembers,
          totalCaseReports: totalCases,
          totalBalikPinasApps: totalBalikPinas,
          byBarangay: byBarangay.map((b) => ({
            barangay: b.dingalanBarangay,
            count: b._count._all,
          })),
        },
      });
    }

    // 3. Authenticated Staff Inventory & Directory
    const user = await getCurrentUser(request);
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "migrants.read"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const barangay = searchParams.get("barangay") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const residency = searchParams.get("residency") || "ALL";
    const search = searchParams.get("search")?.trim() || "";

    const whereClause: any = {};
    if (barangay !== "ALL") whereClause.dingalanBarangay = barangay;
    if (status !== "ALL") whereClause.membershipStatus = status;
    if (residency !== "ALL") whereClause.abroadResidencyStatus = residency;
    if (search) {
      whereClause.OR = [
        { memberCode: { contains: search, mode: "insensitive" } },
        { ofwFullName: { contains: search, mode: "insensitive" } },
        { countryOfWork: { contains: search, mode: "insensitive" } },
        { occupationAbroad: { contains: search, mode: "insensitive" } },
        { representativeName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [members, allMembers] = await Promise.all([
      prisma.ofwFamilyCircleMember.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      }),
      prisma.ofwFamilyCircleMember.findMany({
        select: {
          dingalanBarangay: true,
          membershipStatus: true,
          abroadResidencyStatus: true,
          employmentStatus: true,
          familyMembersJson: true,
        },
      }),
    ]);

    let totalHouseholdDependents = 0;
    for (const m of allMembers) {
      try {
        const arr = JSON.parse(m.familyMembersJson || "[]");
        if (Array.isArray(arr)) {
          totalHouseholdDependents += arr.filter((r: any) => r && r.fullName?.trim()).length;
        }
      } catch (e) {}
    }

    const stats = {
      totalOfws: allMembers.length,
      verified: allMembers.filter((m) => m.membershipStatus === "VERIFIED").length,
      contractual: allMembers.filter((m) => m.employmentStatus === "CONTRACTUAL").length,
      permanent: allMembers.filter((m) => m.abroadResidencyStatus === "PERMANENTE" || m.employmentStatus === "PERMANENTE").length,
      undocumented: allMembers.filter((m) => m.abroadResidencyStatus === "UNDOCUMENTED" || m.employmentStatus === "UNDOCUMENTED").length,
      totalHouseholdDependents,
    };

    return NextResponse.json({ members, stats });
  } catch (error: any) {
    console.error("GET /api/v1/migrants/family-circle error:", error);
    return NextResponse.json(
      { error: "Failed to fetch OFW Family Circle inventory", details: error.message },
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
        { error: "Pangalan ng OFW (Apelyido at Pangalan) ay kinakailangan." },
        { status: 400 }
      );
    }

    if (!body.countryOfWork || !body.dingalanBarangay || !body.representativeName) {
      return NextResponse.json(
        { error: "Bansang Pinagtatrabahuhan, Barangay sa Dingalan, at Pangalan ng Kinatawan ng OFW ay kinakailangan." },
        { status: 400 }
      );
    }

    const ofwFullName = `${ofwLastName}, ${ofwFirstName}${ofwMiddleName ? " " + ofwMiddleName : ""}${ofwSuffix ? " " + ofwSuffix : ""}`;
    const memberCode = generateOfcMemberCode();

    const created = await prisma.ofwFamilyCircleMember.create({
      data: {
        memberCode,
        photoDataUrl: body.photoDataUrl || null,
        ofwLastName,
        ofwFirstName,
        ofwMiddleName: ofwMiddleName || null,
        ofwSuffix: ofwSuffix || null,
        ofwFullName,
        ofwSex: body.ofwSex || "FEMALE",
        ofwBirthdate: body.ofwBirthdate || "",
        ofwContactInfo: (body.ofwContactInfo || "").trim(),
        abroadResidencyStatus: body.abroadResidencyStatus || "PERMANENTE",
        occupationAbroad: (body.occupationAbroad || "").trim(),
        monthlyIncome: (body.monthlyIncome || "").trim() || null,
        countryOfWork: (body.countryOfWork || "").trim().toUpperCase(),
        agencyName: (body.agencyName || "").trim() || null,
        employmentStatus: body.employmentStatus || "CONTRACTUAL",
        contractDuration: (body.contractDuration || "").trim() || null,
        dingalanBarangay: body.dingalanBarangay,
        dingalanPurokSitio: (body.dingalanPurokSitio || "").trim() || null,
        familyContactInfo: (body.familyContactInfo || body.ofwContactInfo || "").trim(),
        familyMembersJson:
          typeof body.familyMembersJson === "string"
            ? body.familyMembersJson
            : JSON.stringify(body.familyMembers || []),
        representativeName: (body.representativeName || "").trim().toUpperCase(),
        membershipStatus: "ACTIVE",
        remarks: body.remarks || null,
      },
    });

    return NextResponse.json({
      success: true,
      member: created,
      memberCode: created.memberCode,
    });
  } catch (error: any) {
    console.error("POST /api/v1/migrants/family-circle error:", error);
    return NextResponse.json(
      { error: "Failed to register OFW Family Circle member", details: error.message },
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
    const { id, membershipStatus, remarks, dingalanBarangay, dingalanPurokSitio, familyContactInfo, representativeName } = body;

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (membershipStatus) updateData.membershipStatus = membershipStatus;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (dingalanBarangay) updateData.dingalanBarangay = dingalanBarangay;
    if (dingalanPurokSitio !== undefined) updateData.dingalanPurokSitio = dingalanPurokSitio;
    if (familyContactInfo !== undefined) updateData.familyContactInfo = familyContactInfo;
    if (representativeName) updateData.representativeName = representativeName.toUpperCase();

    const updated = await prisma.ofwFamilyCircleMember.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error: any) {
    console.error("PATCH /api/v1/migrants/family-circle error:", error);
    return NextResponse.json({ error: "Failed to update member record" }, { status: 500 });
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
      return NextResponse.json({ error: "Missing member id" }, { status: 400 });
    }

    await prisma.ofwFamilyCircleMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/v1/migrants/family-circle error:", error);
    return NextResponse.json({ error: "Failed to delete member record" }, { status: 500 });
  }
}

