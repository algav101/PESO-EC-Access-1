export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { POST as canonicalImportCommitPost } from "@/app/api/v1/beneficiaries/import/commit/route";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid import JSON. Preview the file again." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Invalid import request." }, { status: 400 });
  const proxiedRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      ...body,
      programId: params.id,
    }),
  });
  return canonicalImportCommitPost(proxiedRequest);
}
