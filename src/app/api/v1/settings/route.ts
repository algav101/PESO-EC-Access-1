import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    return NextResponse.json({ settings: settingsMap, raw: settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "settings.update")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { settings } = await request.json();
    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    await logAudit({
      userId: user.id,
      action: "SETTINGS_UPDATED",
      entityType: "SYSTEM_SETTING",
      newData: settings,
    });

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
