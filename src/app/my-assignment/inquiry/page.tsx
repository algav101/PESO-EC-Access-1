import type { Metadata } from "next";
import { ArrowLeft, Camera, CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { PublicWorkAssignmentLookupCard } from "@/components/public/PublicWorkAssignmentLookupCard";

export const metadata: Metadata = {
  title: "TUPAD Work Area Assignment | PESO Dingalan",
  description: "I-scan o i-upload ang iyong opisyal na TUPAD QR ID upang makita ang work area assignment at iskedyul.",
};

export default function WorkAreaAssignmentInquiryPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-900">
        <ArrowLeft className="h-4 w-4" /> Bumalik sa Landing Page
      </a>

      <header className="space-y-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">PESO Dingalan • TUPAD Beneficiary Portal</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Work Area Assignment at Iskedyul</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Alamin ang iyong nakatalagang lugar, araw ng trabaho, at gawain gamit ang opisyal na TUPAD Laminated QR ID.
        </p>
      </header>

      <ol aria-label="Paano tingnan ang assignment" className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Camera, title: "1. I-scan o i-upload ang QR ID", text: "Payagan ang camera, o pumili ng malinaw na larawan ng QR mula sa device." },
          { icon: CalendarDays, title: "2. Piliin ang araw ng trabaho", text: "Tingnan ang iskedyul at detalye ng gawain para sa napiling araw." },
          { icon: MapPin, title: "3. Suriin ang work area", text: "Sundin ang nakatalagang lugar at gabay. Makipag-ugnayan sa PESO kung may kailangang itama." },
        ].map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-xl border border-slate-200 bg-white p-4">
            <Icon className="mb-2 h-5 w-5 text-emerald-700" />
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{text}</p>
          </li>
        ))}
      </ol>

      <PublicWorkAssignmentLookupCard collapsible={false} />

      <aside className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-950">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Gamitin lamang ang sarili mong QR ID at huwag ibahagi ang screenshot ng personal na assignment. Kung hindi mabuksan ang camera, gamitin ang QR image upload. Sa phone, kailangan ng HTTPS para sa live camera.</p>
      </aside>
    </div>
  );
}
