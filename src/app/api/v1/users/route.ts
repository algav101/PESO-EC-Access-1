import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "user.read")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "user.create")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { username, password, fullName, email, role = "TUPAD_COORDINATOR" } = await request.json();

    if (!username || !password || !fullName) {
      return NextResponse.json({ error: "Username, password, and full name are required" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        fullName: fullName.trim(),
        email: email?.trim(),
        role,
        status: "ACTIVE",
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await logAudit({
      userId: user.id,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: newUser.id,
      newData: { username: newUser.username, role: newUser.role },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Username already in use" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
