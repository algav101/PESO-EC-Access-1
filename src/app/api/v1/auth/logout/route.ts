import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      userId: user.id,
      action: "LOGOUT",
      entityType: "USER",
      entityId: user.id,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("tupad_auth_token");
  return response;
}
