export const dynamic = "force-dynamic";

import { POST as canonicalImportCommitPost } from "@/app/api/v1/beneficiaries/import/commit/route";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const proxiedRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      ...body,
      programId: body.programId || params.id,
    }),
  });
  return canonicalImportCommitPost(proxiedRequest);
}
