export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    // Auto-seed default/preset accounts if missing
    if (!user) {
      const presetDefaults: Record<string, { fullName: string; role: any; brgy: string | null; pass: string }> = {
        admin: { fullName: "PESO Dingalan Admin Officer", role: "DOMAIN_MASTER", brgy: null, pass: "admin123" },
        coordinator: { fullName: "Dingalan TUPAD Field Coordinator", role: "TUPAD_COORDINATOR", brgy: null, pass: "coord123" },
        documentor: { fullName: "Dingalan TUPAD Assisting Documentor", role: "TUPAD_ASSISTING_DOCUMENTOR", brgy: null, pass: "doc123" },
        dole: { fullName: "DOLE Aurora Field Officer", role: "DOLE_COORDINATOR", brgy: null, pass: "dole123" },
        peso_paltic_doc: { fullName: "MARIA (Brgy. Paltic Documentor)", role: "TUPAD_ASSISTING_DOCUMENTOR", brgy: "Paltic", pass: "PALTIC123" },
        peso_umiray_doc: { fullName: "JUAN (Brgy. Umiray Documentor)", role: "TUPAD_ASSISTING_DOCUMENTOR", brgy: "Umiray", pass: "UMIRAY123" },
        peso_aplaya_doc: { fullName: "LIZA (Brgy. Aplaya Documentor)", role: "TUPAD_ASSISTING_DOCUMENTOR", brgy: "Aplaya", pass: "APLAYA123" },
        peso_paltic: { fullName: "RAMONITA", role: "TUPAD_COORDINATOR", brgy: "Paltic", pass: "PALTIC123" },
      };

      const preset = presetDefaults[cleanUsername];
      if (preset) {
        const hashed = await bcrypt.hash(preset.pass, 10);
        user = await prisma.user.create({
          data: {
            username: cleanUsername,
            fullName: preset.fullName,
            role: preset.role,
            assignedBarangay: preset.brgy,
            passwordHash: hashed,
            plainPassword: preset.pass,
            status: "ACTIVE",
          },
        });
      }
    }

    if (!user || user.status !== "ACTIVE") {
      logAudit({
        action: "LOGIN_FAILED",
        entityType: "USER",
        metadata: { username, reason: user ? "Account disabled" : "User not found" },
      }).catch(() => {});
      return NextResponse.json(
        { error: "Invalid username or password" },
        {
          status: 401,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      logAudit({
        userId: user.id,
        action: "LOGIN_FAILED",
        entityType: "USER",
        metadata: { username, reason: "Incorrect password" },
      }).catch(() => {});
      return NextResponse.json(
        { error: "Invalid username or password" },
        {
          status: 401,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Update last login & log audit asynchronously
    Promise.allSettled([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      logAudit({
        userId: user.id,
        action: "LOGIN_SUCCESS",
        entityType: "USER",
        entityId: user.id,
      }),
    ]).catch(() => {});

    const token = signToken({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role as any,
      assignedBarangay: user.assignedBarangay,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          assignedBarangay: user.assignedBarangay,
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

    response.cookies.set("tupad_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}
