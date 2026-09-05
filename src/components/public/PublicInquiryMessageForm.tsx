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
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  FileQuestion,
  Lightbulb,
} from "lucide-react";

export function PublicInquiryMessageForm() {
  const [activeTab, setActiveTab] = useState<"SEND" | "TRACK">("SEND");

  // Form state
  const [category, setCategory] = useState("INQUIRY");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderContact, setSenderContact] = useState("");
  const [senderBarangay, setSenderBarangay] = useState("Paltic");

  // CAPTCHA State
  const [mounted, setMounted] = useState(false);
  const [num1, setNum1] = useState(7);
  const [num2, setNum2] = useState(5);
  const [captchaInput, setCaptchaInput] = useState("");

  const refreshCaptcha = () => {
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 15) + 3;
    setNum1(a);
    setNum2(b);
    setCaptchaInput("");
  };

  useEffect(() => {
    setMounted(true);
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

    // Verify CAPTCHA locally
    const expected = num1 + num2;
    if (parseInt(captchaInput, 10) !== expected) {
      setError("Maling CAPTCHA Security Code. Pakisagutan nang wasto ang simpleng math problem.");
      refreshCaptcha();
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
          captchaAnswer: captchaInput,
          captchaExpected: expected,
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
    <div id="inquiry-form" className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 p-6 sm:p-8 text-white relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-gov-gold/20 text-gov-goldLight px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-gov-gold/30">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Direct Public Channel</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              PESO-Dingalan Public Message & Inquiry Form
            </h3>
            <p className="text-xs text-slate-300">
              Iparating ang inyong mga katanungan, suhestiyon, o komento direkta sa pamunuan ng PESO Dingalan.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold self-start">
            <button
              type="button"
              onClick={() => setActiveTab("SEND")}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === "SEND" ? "bg-gov-blue text-white shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              Magpadala ng Mensahe
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TRACK")}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === "TRACK" ? "bg-gov-blue text-white shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              I-track ang Sagot
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {/* TAB 1: SEND MESSAGE */}
        {activeTab === "SEND" && (
          <div className="space-y-6">
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
                  <p className="text-xl font-mono font-black text-gov-blue tracking-wider">
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
                    className="px-4 py-2 bg-gov-blue text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    I-track ang Status ng Mensahe
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuccessTicket(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl transition"
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
                        className={`p-3 rounded-xl text-left border-2 transition flex flex-col justify-between ${
                          category === val
                            ? "border-gov-blue bg-blue-50/70 text-gov-blue font-bold shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-medium"
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1 text-gov-blue" />
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
                      <ShieldCheck className="w-4 h-4 text-gov-blue" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Human Verifier & Identity Section
                      </span>
                    </div>

                    {/* Anonymous Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="w-4 h-4 accent-gov-blue rounded"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        Ipadala bilang Anonymous
                      </span>
                    </label>
                  </div>

                  {isAnonymous && (
                    <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-gov-blue font-medium leading-relaxed">
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
                      {mounted ? `${num1} + ${num2} = ?` : "7 + 5 = ?"}
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
                      className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-amber-200 text-slate-600 transition"
                      title="Palitan ang CAPTCHA"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-700 font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3 bg-gov-blue hover:bg-gov-light text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
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
                  className="px-6 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
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
                    <span className="text-base font-mono font-black text-gov-blue">
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
    </div>
  );
}
