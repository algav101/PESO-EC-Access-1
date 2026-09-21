export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const photoId = params.id;
    if (!photoId) {
      return new NextResponse("Missing photo ID", { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "true";

    const photo = await prisma.accomplishmentPhoto.findUnique({
      where: { id: photoId },
      select: {
        id: true,
        fileKey: true,
        fileName: true,
        barangay: true,
        specificActivity: true,
      },
    });

    if (!photo || !photo.fileKey) {
      return new NextResponse("Photo not found", { status: 404 });
    }

    // 1. If stored as Base64 Data URL (e.g. data:image/jpeg;base64,...)
    if (photo.fileKey.startsWith("data:")) {
      const match = photo.fileKey.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1] || "image/jpeg";
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");

        const headers: Record<string, string> = {
          "Content-Type": mimeType,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
        };

        if (isDownload) {
          const downloadName = photo.fileName || `Accomplishment_${photo.barangay || "Dingalan"}_${photo.id}.jpg`;
          headers["Content-Disposition"] = `attachment; filename="${downloadName}"`;
        }

        return new NextResponse(buffer, {
          status: 200,
          headers,
        });
      }
    }

    // 2. If stored as an external URL (e.g. Supabase Storage / S3 / Cloudinary)
    if (photo.fileKey.startsWith("http://") || photo.fileKey.startsWith("https://")) {
      return NextResponse.redirect(photo.fileKey, 307);
    }

    // 3. Fallback: Return raw text / key
    return new NextResponse(photo.fileKey, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error: any) {
    console.error("GET photo image error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
