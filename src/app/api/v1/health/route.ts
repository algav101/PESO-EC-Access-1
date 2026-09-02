import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      version: "1.0.0",
      app: "LGU Dingalan PESO TUPAD Platform",
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      database: "disconnected",
      error: error.message,
    }, { status: 500 });
  }
}
