"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
  User,
  Phone,
  MapPin,
  Lock,
  Sparkles,
  HelpCircle,
  FileQuestion,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function PublicInquiryMessageForm() {
  // Collapsible Dropdown State
  const [isOpen, setIsOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"SEND" | "TRACK">("SEND");

  // Form state
  const [category, setCategory] = useState("INQUIRY");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderContact, setSenderContact] = useState("");
  const [senderBarangay, setSenderBarangay] = useState("Paltic");
  const [dpaConsent, setDpaConsent] = useState(false);

  // CAPTCHA State (Server-Signed Challenge)
  const [captchaQuestion, setCaptchaQuestion] = useState("7 + 5 = ?");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const refreshCaptcha = async () => {
    try {
      setCaptchaInput("");
      const res = await fetch("/api/v1/public/captcha");
      if (res.ok) {
        const data = await res.json();
        setCaptchaQuestion(data.question || "8 + 4 = ?");
        setCaptchaToken(data.token || "");
      } else {
        setCaptchaQuestion("6 + 7 = ?");
      }
    } catch {
      setCaptchaQuestion("9 + 3 = ?");
    }
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const [loading, setLoading] = useState(false);
  const [successTicket, setSuccessTicket] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tracking State
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState<any | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dpaConsent) {
      setError("Mangyaring lagyan ng tsek ang pahintulot sa ilalim ng Data Privacy Act of 2012 bago ipadala ang mensahe.");
      return;
    }

    if (!captchaInput.trim()) {
      setError("Pakisagutan ang CAPTCHA Security problem.");
      return;
    }

    if (!senderName.trim()) {
      setError("Mangyaring ilagay ang inyong Buong Pangalan (Full Name) bilang Human Verifier.");
      return;
    }

    if (!senderContact.trim()) {
      setError("Mangyaring ilagay ang inyong Contact / Mobile Number.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/public/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject,
          message,
          isAnonymous,
          senderName,
          senderContact,
          senderBarangay,
          captchaAnswer: captchaInput.trim(),
          captchaToken: captchaToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "May error sa pagpapadala ng mensahe.");
      }

      setSuccessTicket(data);
      setMessage("");
      setSubject("");
      setCaptchaInput("");
      refreshCaptcha();
    } catch (err: any) {
      setError(err.message);
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleTrackLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim()) return;

    setTrackLoading(true);
    setTrackError(null);
    setTrackResult(null);

    try {
      const res = await fetch(`/api/v1/public/messages/${encodeURIComponent(trackCode.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Walang nahanap na ticket gamit ang tracking code na ito.");
      }
      setTrackResult(data.message);
    } catch (err: any) {
      setTrackError(err.message);
    } finally {
      setTrackLoading(false);
    }
  };

  const BARANGAYS = [
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

  return (
    <div id="inquiry-form" className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden transition-all">
      {/* Header Bar with Accordion Dropdown Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-5 sm:p-7 text-white relative cursor-pointer select-none transition-colors hover:brightness-105"
      >
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-1.5 bg-gov-gold/20 text-gov-goldLight px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border border-gov-gold/30">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Direct Public Channel</span>
              </div>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full text-[11px] font-bold">
                RA 10173 DPA Compliant
              </span>
            </div>

            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>PESO-Dingalan Public Message &amp; Inquiry Form</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Iparating ang inyong mga katanungan, suhestiyon, o komento direkta sa pamunuan ng PESO Dingalan.
            </p>
          </div>

          <div className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-white transition-transform duration-200">
            {isOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isOpen && (
        <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-md gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("SEND")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === "SEND"
                  ? "bg-slate-900 text-white shadow-md font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Magpadala ng Mensahe</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TRACK")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === "TRACK"
                  ? "bg-slate-900 text-white shadow-md font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>I-track ang Sagot</span>
            </button>
          </div>

          {/* TAB 1: SEND MESSAGE */}
          {activeTab === "SEND" && (
            <div className="space-y-6">
              {/* Data Privacy Notice & Consent Box */}
              <div className="p-4 sm:p-5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3 text-xs text-slate-700">
                <div className="flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-extrabold uppercase text-slate-900 text-xs tracking-wider">
                      Proteksyon sa Datos (Data Privacy Act of 2012 - R.A. 10173)
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Ang inyong mga impormasyon ay gagamitin lamang ng Tanggapan ng PESO Dingalan upang masagot ang inyong katanungan at mapabuti ang serbisyo publiko. Hindi ito isasapubliko o ibabahagi sa mga ikatlong partido nang walang kapahintulutan.
                    </p>
                  </div>
                </div>

                <label className="flex items-start space-x-3 pt-2 border-t border-blue-200/80 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dpaConsent}
                    onChange={(e) => {
                      setDpaConsent(e.target.checked);
                      if (e.target.checked && error) setError(null);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 leading-snug">
                    Sumasang-ayon ako sa pagproseso ng aking mensahe at contact details para sa opisyal na pagtugon ng PESO Dingalan alinsunod sa Data Privacy Act ng 2012. <span className="text-rose-600">*</span>
                  </span>
                </label>
              </div>

              {successTicket ? (
                <div className="p-6 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-4 text-center animate-in zoom-in-95">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-lg font-black text-slate-900">
                      Matagumpay na Naipadala ang Inyong Mensahe!
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Maraming salamat! Nakarating na ito sa System Inbox ng PESO-Dingalan Admin.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-emerald-300 max-w-sm mx-auto space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Inyong Tracking Code (Itabi ito):
                    </span>
                    <p className="text-xl font-mono font-black text-blue-900 tracking-wider">
                      {successTicket.trackingCode}
                    </p>
                  </div>

                  <div className="flex items-center justify-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessTicket(null);
                        setActiveTab("TRACK");
                        setTrackCode(successTicket.trackingCode);
                      }}
                      className="px-4 py-2.5 bg-blue-900 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                    >
                      I-track ang Status ng Mensahe
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuccessTicket(null)}
                      className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Magpadala Ulit
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Category Pills */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Uri ng Mensahe (Category) <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { val: "INQUIRY", label: "Katanungan / Inquiry", icon: HelpCircle },
                        { val: "APPLICATION_FOLLOWUP", label: "Follow-up sa TUPAD", icon: FileQuestion },
                        { val: "SUGGESTION", label: "Suhestiyon / Suggestion", icon: Lightbulb },
                        { val: "COMMENT", label: "Komentaryo / Feedback", icon: MessageSquare },
                      ].map(({ val, label, icon: Icon }) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCategory(val)}
                          className={`p-3 rounded-xl text-left border-2 transition flex flex-col justify-between cursor-pointer ${
                            category === val
                              ? "border-blue-900 bg-blue-50/70 text-blue-950 font-bold shadow-xs"
                              : "border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-medium"
                          }`}
                        >
                          <Icon className="w-4 h-4 mb-1 text-blue-800" />
                          <span className="text-xs">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject & Message */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Paksa / Subject (Opsyonal)
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Hal. Katayuan ng TUPAD Aplikasyon sa Brgy. Paltic"
                        className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Inyong Mensahe, Katanungan, o Suhestiyon <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Isulat dito ang inyong buong mensahe o katanungan..."
                        className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue leading-relaxed"
                      ></textarea>
                    </div>
                  </div>

                  {/* Anonymous Option & Human Verifier Box */}
                  <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-blue-900" />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Human Verifier &amp; Identity Section
                        </span>
                      </div>

                      {/* Anonymous Toggle */}
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="w-4 h-4 accent-blue-900 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Ipadala bilang Anonymous
                        </span>
                      </label>
                    </div>

                    {isAnonymous && (
                      <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-blue-900 font-medium leading-relaxed">
                        💡 <strong>Naka-set bilang Anonymous:</strong> Ang inyong buong pangalan at contact number ay gagamitin lamang ng sistema bilang anti-spam human verification at hindi ibubunyag sa pampublikong listahan.
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Buong Pangalan (Full Name) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Juan Dela Cruz"
                          className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-gov-blue"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Contact / Mobile No. <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={senderContact}
                          onChange={(e) => setSenderContact(e.target.value)}
                          placeholder="09123456789"
                          className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-gov-blue"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Barangay (Dingalan)
                        </label>
                        <select
                          value={senderBarangay}
                          onChange={(e) => setSenderBarangay(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-gov-blue"
                        >
                          {BARANGAYS.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* CAPTCHA Security Section */}
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-black text-amber-950 uppercase block">
                          CAPTCHA Anti-Spam Security
                        </span>
                        <p className="text-[11px] text-amber-900 font-medium">
                          Lutasin ang simpleng kalkulasyon upang patunayang tao ka:
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="px-4 py-2 bg-white rounded-xl border border-amber-300 font-mono font-black text-sm text-slate-800 shadow-inner select-none">
                        {captchaQuestion}
                      </div>

                      <input
                        type="number"
                        required
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="Sagot"
                        className="w-20 px-3 py-2 text-xs font-bold border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-gov-blue text-center"
                      />

                      <button
                        type="button"
                        onClick={refreshCaptcha}
                        className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-amber-200 text-slate-600 transition cursor-pointer"
                        title="Palitan ang CAPTCHA"
                        aria-label="Palitan ang CAPTCHA problem"
                      >
                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div 
                      role="alert"
                      aria-live="assertive"
                      className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-700 font-medium"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-8 py-3 bg-blue-900 hover:bg-blue-800 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-gov-gold" />
                      <span>{loading ? "Ipinapadala..." : "Ipadala ang Mensahe sa PESO"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: TRACK TICKET STATUS */}
          {activeTab === "TRACK" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <form onSubmit={handleTrackLookup} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Ilagay ang Inyong Message Tracking Code:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    required
                    value={trackCode}
                    onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                    placeholder="Hal. MSG-2026-A8K9Z"
                    className="flex-1 px-4 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue uppercase tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={trackLoading}
                    className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-gov-gold" />
                    <span>{trackLoading ? "Hinahanap..." : "Suriin"}</span>
                  </button>
                </div>
              </form>

              {trackError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}

              {trackResult && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono font-bold block">
                        Tracking Code
                      </span>
                      <span className="text-base font-mono font-black text-blue-900">
                        {trackResult.trackingCode}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        trackResult.status === "REPLIED" || trackResult.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      {trackResult.status === "REPLIED"
                        ? "Nasagot na ng PESO"
                        : trackResult.status === "RESOLVED"
                        ? "Naresolba"
                        : "Kasalukuyang Nirerepaso"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Inyong Mensahe ({new Date(trackResult.createdAt).toLocaleDateString()}):
                      </span>
                      <p className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium">
                        {trackResult.message}
                      </p>
                    </div>

                    {trackResult.adminReply ? (
                      <div className="pt-2">
                        <span className="text-emerald-800 text-[10px] font-bold uppercase block flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Opisyal na Tugon mula sa PESO Dingalan:</span>
                        </span>
                        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-950 font-bold leading-relaxed mt-1 shadow-xs">
                          {trackResult.adminReply}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Tugon naitala noong: {new Date(trackResult.repliedAt).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                        ⏳ Ang inyong mensahe ay kasalukuyang nakapila para suriin ng PESO Administrator. Mangyaring bumalik muli gamit ang tracking code na ito.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
