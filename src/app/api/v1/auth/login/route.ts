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

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

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
