export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

function getPresetPasswordFallback(uname?: string | null, brgy?: string | null, role?: string | null): string {
  const u = (uname || "").toLowerCase();
  if (u === "admin") return "admin123";
  if (u === "coordinator") return "coord123";
  if (u === "documentor") return "doc123";
  if (u === "dole") return "dole123";
  if (u.includes("umiray")) return "UMIRAY123";
  if (u.includes("ibona")) return "IBONA123";
  if (u.includes("matawe")) return "MATAWE123";
  if (u.includes("bnb") || (brgy && brgy.toLowerCase().includes("butas"))) return "BUTAS NA BATO123";
  if (u.includes("aplaya")) return "APLAYA123";
  if (u.includes("poblacion")) return "POBLACION123";
  if (u.includes("davildavilan")) return "DAVILDAVILAN123";
  if (u.includes("caragsacan")) return "CARAGSACAN123";
  if (u.includes("tanawan")) return "TANAWAN123";
  if (u.includes("dika")) return "DIKAPANIKIAN123";
  if (u.includes("paltic")) return "PALTIC123";
  if (u.includes("dolefoaurora") || role === "DOLE_COORDINATOR") return "ALL BARANGAY123";
  if (brgy) return `${brgy.toUpperCase()}123`;
  return "Dingalan123!";
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "user.read")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const isSuperAdmin = user.role === "DOMAIN_MASTER" || user.role === "PESO_ADMIN";

    const rawUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        assignedBarangay: true,
        plainPassword: isSuperAdmin,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const users = rawUsers.map((u) => {
      if (isSuperAdmin) {
        return {
          ...u,
          plainPassword: u.plainPassword || getPresetPasswordFallback(u.username, u.assignedBarangay, u.role),
        };
      }
      return u;
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

    const trimmedPassword = String(password).trim();
    const passwordHash = await bcrypt.hash(trimmedPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        plainPassword: trimmedPassword,
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
        plainPassword: true,
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
    if (password && String(password).trim().length > 0) {
      const trimmed = String(password).trim();
      updateData.passwordHash = await bcrypt.hash(trimmed, 10);
      updateData.plainPassword = trimmed;
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
        plainPassword: true,
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
