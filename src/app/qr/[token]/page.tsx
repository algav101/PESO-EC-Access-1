import { redirect } from "next/navigation";

export default function QrRedirectPage({ params }: { params: { token: string } }) {
  const token = params.token || "";
  redirect(`/my-assignment?token=${encodeURIComponent(token)}`);
}
