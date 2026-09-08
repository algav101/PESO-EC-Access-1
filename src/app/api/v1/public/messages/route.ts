export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Generate unique tracking code e.g. MSG-2026-A8K9Z
function generateTrackingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomStr = "";
  for (let i = 0; i < 5; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `MSG-${year}-${randomStr}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      senderName,
      senderContact,
      senderBarangay,
      isAnonymous = false,
      category = "INQUIRY",
      subject,
      message,
      captchaAnswer,
      captchaExpected,
    } = body;

    // 1. Validate required fields for Human Verifier
    if (!senderName || String(senderName).trim().length < 2) {
      return NextResponse.json(
        { error: "Mangyaring ilagay ang inyong Buong Pangalan (Full Name) bilang Human Verifier." },
        { status: 400 }
      );
    }

    if (!senderContact || String(senderContact).trim().length < 7) {
      return NextResponse.json(
        { error: "Mangyaring ilagay ang inyong Contact / Mobile Number para sa verification." },
        { status: 400 }
      );
    }

    if (!message || String(message).trim().length < 5) {
      return NextResponse.json(
        { error: "Mangyaring ilagay ang inyong mensahe, katanungan, o suhestiyon." },
        { status: 400 }
      );
    }

    // 2. CAPTCHA Security Verification
    if (captchaExpected !== undefined && captchaAnswer !== undefined) {
      if (String(captchaAnswer).trim() !== String(captchaExpected).trim()) {
        return NextResponse.json(
          { error: "Maling CAPTCHA Security Code. Pakisubukan muli upang mapatunayang hindi ka robot." },
          { status: 400 }
        );
      }
    }

    // 3. Create Ticket
    const trackingCode = generateTrackingCode();

    const record = await prisma.publicInquiryMessage.create({
      data: {
        trackingCode,
        category: category || "INQUIRY",
        subject: subject?.trim() || null,
        message: message.trim(),
        isAnonymous: Boolean(isAnonymous),
        senderName: senderName.trim(),
        senderContact: senderContact.trim(),
        senderBarangay: senderBarangay?.trim() || null,
        status: "UNREAD",
      },
    });

    return NextResponse.json({
      success: true,
      trackingCode,
      message: `Maraming salamat! Matagumpay na naipadala ang inyong mensahe sa Tanggapan ng PESO-Dingalan. Ang inyong Tracking Code ay: ${trackingCode}`,
      ticket: {
        trackingCode: record.trackingCode,
        createdAt: record.createdAt,
        category: record.category,
        isAnonymous: record.isAnonymous,
      },
    });
  } catch (error: any) {
    console.error("POST /public/messages error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
