import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PublicStatusInquiryCard } from "@/components/public/PublicStatusInquiryCard";
import { PublicInquiryMessageForm } from "@/components/public/PublicInquiryMessageForm";

export const metadata: Metadata = { title: "Application Status & Inquiry | PESO Dingalan" };

export default function PublicInquiryPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-900">
        <ArrowLeft className="h-4 w-4" /> Bumalik sa Landing Page
      </a>
      <header className="space-y-2">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Application Status &amp; Inquiry</h1>
        <p className="text-sm text-slate-600">Suriin ang status ng iyong TUPAD application o magpadala at mag-track ng mensahe sa PESO Dingalan.</p>
      </header>
      <section aria-label="Application status inquiry"><PublicStatusInquiryCard /></section>
      <section id="message" aria-label="Public message and feedback" className="scroll-mt-24"><PublicInquiryMessageForm /></section>
    </div>
  );
}
