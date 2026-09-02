import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const whereClause: any = {};
    if (query) {
      whereClause.beneficiary = {
        fullName: { contains: query },
      };
    }

    const restrictions = await prisma.beneficiaryRestriction.findMany({
      where: whereClause,
      include: {
        beneficiary: true,
        sourceProgram: true,
      },
      orderBy: { restrictionEnd: "desc" },
    });

    return NextResponse.json({ restrictions });
  } catch (error: any) {
    console.error("GET restrictions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { fullName, birthday } = await request.json();

    if (!fullName || !birthday) {
      return NextResponse.json({ error: "Full name and birthday are required" }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const restriction = await prisma.beneficiaryRestriction.findFirst({
      where: {
        beneficiary: {
          fullName: fullName.trim().toUpperCase(),
          birthday,
        },
        status: "ACTIVE",
        restrictionEnd: { gte: todayStr },
      },
      include: {
        sourceProgram: true,
      },
    });

    if (restriction) {
      return NextResponse.json({
        eligible: false,
        restricted: true,
        restrictionEnd: restriction.restrictionEnd,
        reason: restriction.reason,
        programName: restriction.sourceProgram?.programName,
      });
    }

    return NextResponse.json({
      eligible: true,
      restricted: false,
      message: "Beneficiary is eligible for TUPAD participation.",
    });
  } catch (error: any) {
    console.error("POST restrictions check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
