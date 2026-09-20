export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        assignedBarangay: true,
      },
      orderBy: [
        { role: "asc" },
        { assignedBarangay: "asc" },
        { fullName: "asc" },
      ],
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("GET /api/v1/auth/presets error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
