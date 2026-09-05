import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

const DINGALAN_BARANGAYS = [
  "Aplaya",
  "Butas na Bato",
  "Caragsacan",
  "Davildavilan",
  "Dikapanikian",
  "Ibona",
  "Matawe",
  "Paltic",
  "Poblacion",
  "Tanawan",
  "Umiray",
];

function normalizeRole(rawRole?: string): string {
  const r = (rawRole || "").trim().toUpperCase().replace(/[\s_-]+/g, "_");
  if (r.includes("DOMAIN") || r.includes("MASTER")) return "DOMAIN_MASTER";
  if (r.includes("DOLE")) return "DOLE_COORDINATOR";
  if (r.includes("STAFF") || r.includes("OPERATIONS") || r.includes("PESO_STAFF")) return "PESO_STAFF";
  if (r.includes("ADMIN") || r.includes("PESO_ADMIN")) return "PESO_ADMIN";
  return "TUPAD_COORDINATOR";
}

function normalizeBarangay(rawBarangay?: string): string | null {
  if (!rawBarangay) return null;
  const bClean = rawBarangay.trim().toUpperCase().replace(/\s+/g, " ");
  if (bClean.includes("ALL") || bClean.includes("MUNICIPALITY") || bClean.includes("N/A") || bClean === "-") {
    return null;
  }

  // Find matching Dingalan barangay
  const found = DINGALAN_BARANGAYS.find(
    (b) => b.toUpperCase() === bClean || bClean.includes(b.toUpperCase())
  );
  return found || rawBarangay.trim();
}

function parseCSVLines(csvContent: string): any[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toUpperCase());

  const fullNameIdx = headers.findIndex((h) => h.includes("FULL") || h.includes("NAME"));
  const usernameIdx = headers.findIndex((h) => h.includes("USER"));
  const roleIdx = headers.findIndex((h) => h.includes("ROLE"));
  const scopeIdx = headers.findIndex((h) => h.includes("SCOPE") || h.includes("BARANGAY"));
  const passwordIdx = headers.findIndex((h) => h.includes("PASS"));
  const emailIdx = headers.findIndex((h) => h.includes("EMAIL"));

  const parsedUsers: any[] = [];
  const seenUsernames = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple CSV parser handling comma separated values
    const cols = rawLine.split(",").map((c) => c.trim());
    if (cols.length === 0 || !cols.some((c) => c.length > 0)) continue;

    const fullName = fullNameIdx !== -1 && cols[fullNameIdx] ? cols[fullNameIdx] : `User ${i}`;
    let rawUsername = usernameIdx !== -1 && cols[usernameIdx] ? cols[usernameIdx] : `user_${i}`;
    const rawRole = roleIdx !== -1 && cols[roleIdx] ? cols[roleIdx] : "TUPAD COORDINATOR";
    const rawScope = scopeIdx !== -1 && cols[scopeIdx] ? cols[scopeIdx] : null;
    const password = passwordIdx !== -1 && cols[passwordIdx] ? cols[passwordIdx] : "Password123!";
    const email = emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : "";

    // Normalize username: replace spaces and clean up
    let cleanUsername = rawUsername
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    if (!cleanUsername) cleanUsername = `user_${i}`;

    // Handle duplicate usernames in the same CSV
    if (seenUsernames.has(cleanUsername)) {
      const count = (seenUsernames.get(cleanUsername) || 1) + 1;
      seenUsernames.set(cleanUsername, count);
      cleanUsername = `${cleanUsername}_${count}`;
    } else {
      seenUsernames.set(cleanUsername, 1);
    }

    const role = normalizeRole(rawRole);
    const assignedBarangay = role === "TUPAD_COORDINATOR" ? normalizeBarangay(rawScope) : null;

    parsedUsers.push({
      fullName,
      username: cleanUsername,
      role,
      assignedBarangay,
      password: password || "Dingalan123!",
      email: email || null,
      rawRole,
      rawScope,
    });
  }

  return parsedUsers;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "user.create")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";
    let csvText = "";
    let previewOnly = false;
    let customUsers: any[] | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      previewOnly = formData.get("preview") === "true";
      if (!file) {
        return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      const json = await request.json();
      csvText = json.csvContent || "";
      previewOnly = Boolean(json.preview);
      if (Array.isArray(json.users)) {
        customUsers = json.users;
      }
    }

    const parsedUsers = customUsers || parseCSVLines(csvText);

    if (parsedUsers.length === 0) {
      return NextResponse.json({ error: "No valid user rows found in CSV" }, { status: 400 });
    }

    // If preview mode, return parsed rows without writing to DB
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: true,
        total: parsedUsers.length,
        users: parsedUsers,
      });
    }

    // Commit Import to Database
    const createdUsers: any[] = [];
    const updatedUsers: any[] = [];
    const errors: any[] = [];

    for (const u of parsedUsers) {
      try {
        const passwordHash = await bcrypt.hash(u.password, 10);

        const upserted = await prisma.user.upsert({
          where: { username: u.username },
          update: {
            fullName: u.fullName,
            email: u.email || undefined,
            role: u.role,
            assignedBarangay: u.assignedBarangay,
            passwordHash,
            status: "ACTIVE",
          },
          create: {
            username: u.username,
            fullName: u.fullName,
            email: u.email || null,
            role: u.role,
            assignedBarangay: u.assignedBarangay,
            passwordHash,
            status: "ACTIVE",
          },
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            role: true,
            assignedBarangay: true,
            status: true,
          },
        });

        createdUsers.push(upserted);
      } catch (err: any) {
        errors.push({ username: u.username, error: err.message });
      }
    }

    await logAudit({
      userId: user.id,
      action: "USER_BATCH_IMPORTED",
      entityType: "USER",
      metadata: {
        totalRows: parsedUsers.length,
        createdCount: createdUsers.length,
        errorsCount: errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      total: parsedUsers.length,
      importedCount: createdUsers.length,
      errors,
      users: createdUsers,
    });
  } catch (error: any) {
    console.error("User CSV Import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
