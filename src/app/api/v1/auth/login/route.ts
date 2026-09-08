import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    // Auto-seed default accounts on fresh deployment if database has 0 users
    if (!user) {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        const adminPass = await bcrypt.hash("admin123", 10);
        const coordPass = await bcrypt.hash("coord123", 10);
        const dolePass = await bcrypt.hash("dole123", 10);

        await prisma.user.createMany({
          data: [
            {
              username: "admin",
              fullName: "PESO Dingalan Admin Officer",
              email: "peso.dingalan@aurora.gov.ph",
              passwordHash: adminPass,
              role: "DOMAIN_MASTER",
              status: "ACTIVE",
            },
            {
              username: "coordinator",
              fullName: "Dingalan TUPAD Field Coordinator",
              email: "coordinator@dingalan.gov.ph",
              passwordHash: coordPass,
              role: "TUPAD_COORDINATOR",
              status: "ACTIVE",
            },
            {
              username: "dole",
              fullName: "DOLE Aurora Field Officer",
              email: "dole.aurora@dole.gov.ph",
              passwordHash: dolePass,
              role: "DOLE_COORDINATOR",
              status: "ACTIVE",
            },
          ],
        });

        user = await prisma.user.findUnique({
          where: { username: cleanUsername },
        });
      }
    }

    if (!user || user.status !== "ACTIVE") {
      await logAudit({
        action: "LOGIN_FAILED",
        entityType: "USER",
        metadata: { username, reason: user ? "Account disabled" : "User not found" },
      });
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logAudit({
        userId: user.id,
        action: "LOGIN_FAILED",
        entityType: "USER",
        metadata: { username, reason: "Incorrect password" },
      });
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role as any,
      assignedBarangay: user.assignedBarangay,
    });

    await logAudit({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entityType: "USER",
      entityId: user.id,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        assignedBarangay: user.assignedBarangay,
      },
    });

    response.cookies.set("tupad_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
