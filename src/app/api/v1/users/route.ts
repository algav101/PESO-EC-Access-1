export const dynamic = "force-dynamic";

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
        assignedBarangay: true,
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

    const {
      username,
      password,
      fullName,
      email,
      role = "TUPAD_COORDINATOR",
      assignedBarangay = null,
    } = await request.json();

    if (!username || !password || !fullName) {
      return NextResponse.json({ error: "Username, password, and full name are required" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        fullName: fullName.trim(),
        email: email?.trim() || null,
        role,
        status: "ACTIVE",
        assignedBarangay:
          role === "TUPAD_COORDINATOR" || role === "TUPAD_ASSISTING_DOCUMENTOR"
            ? assignedBarangay?.trim() || null
            : null,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        assignedBarangay: true,
      },
    });

    await logAudit({
      userId: user.id,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: newUser.id,
      newData: {
        username: newUser.username,
        role: newUser.role,
        assignedBarangay: newUser.assignedBarangay,
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Username already in use" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "user.update")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id, fullName, email, role, status, assignedBarangay, password } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (assignedBarangay !== undefined) {
      const activeRole = role || existing.role;
      updateData.assignedBarangay =
        activeRole === "TUPAD_COORDINATOR" || activeRole === "TUPAD_ASSISTING_DOCUMENTOR"
          ? assignedBarangay?.trim() || null
          : null;
    }
    if (password && password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        assignedBarangay: true,
        lastLoginAt: true,
      },
    });

    await logAudit({
      userId: user.id,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: updatedUser.id,
      oldData: { role: existing.role, assignedBarangay: existing.assignedBarangay, status: existing.status },
      newData: { role: updatedUser.role, assignedBarangay: updatedUser.assignedBarangay, status: updatedUser.status },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
