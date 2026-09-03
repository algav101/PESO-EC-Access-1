import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { code: string } }) {
  try {
    const code = params.code?.toUpperCase().trim();
    if (!code) {
      return NextResponse.json({ error: "Tracking code is required" }, { status: 400 });
    }

    const message = await prisma.publicInquiryMessage.findUnique({
      where: { trackingCode: code },
      select: {
        trackingCode: true,
        category: true,
        subject: true,
        message: true,
        isAnonymous: true,
        senderName: true,
        senderBarangay: true,
        status: true,
        adminReply: true,
        repliedAt: true,
        createdAt: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Walang nahanap na mensahe gamit ang tracking code na ito." }, { status: 404 });
    }

    // Mask name if anonymous
    const displayedSender = message.isAnonymous
      ? "Anonymous Resident"
      : message.senderName;

    return NextResponse.json({
      message: {
        ...message,
        senderName: displayedSender,
      },
    });
  } catch (error: any) {
    console.error("GET /public/messages/[code] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
