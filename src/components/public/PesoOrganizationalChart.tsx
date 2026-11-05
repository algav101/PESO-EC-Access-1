"use client";

import React, { useState } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Award,
  Maximize2,
  X,
  Download,
} from "lucide-react";

export function PesoOrganizationalChart() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  return (
    <section
      id="org-structure"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 scroll-mt-24"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
            <Building2 className="w-3.5 h-3.5 text-blue-800" />
            <span>Public Employment Service Office • EC Access</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            PESO Dingalan Organizational Structure
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Ang opisyal na Digital Organizational Directory ng pamunuan, service units, at field coordinators na nagpapatupad ng PESO EC Access sa Bayan ng Dingalan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isExpanded && (
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-700" />
              <span>Buong Screen (HD)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <span>{isExpanded ? "Itago ang Org Chart" : "Ipakita ang Org Chart"}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Organizational Chart Container */}
      {isExpanded && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-8 flex flex-col items-center animate-fadeIn space-y-6">
          {/* Executive Hierarchy Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-5xl text-xs font-bold text-slate-700">
            <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              Municipal Leadership: Hon. Aurora G. Taay
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              PESO Office Head: Albert D. Gaviola, MPA
            </span>
            <span className="px-3 py-1 bg-cyan-50 text-cyan-900 border border-cyan-200 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-cyan-700" />
              4 Functional Service Units &amp; Systems Dev
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Barangay PESO Coordinators Network
            </span>
          </div>

          {/* High-Resolution 2560x1440 Enhanced Org Chart Graphic */}
          <div
            onClick={() => setIsLightboxOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsLightboxOpen(true);
              }
            }}
            title="I-click upang palakihin sa Buong Screen (2560x1440 Ultra-HD)"
            className="group relative w-full max-w-6xl rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-[#061224] transition-all hover:shadow-blue-950/25 cursor-zoom-in"
          >
            <img
              src="/images/peso-organizational-structure.png"
              alt="PESO EC ACCESS - LGU Dingalan Official Organizational Structure Directory"
              width={2560}
              height={1440}
              className="w-full h-auto object-contain block select-none"
            />
            <div className="pointer-events-none absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-400/30 text-white text-[11px] font-bold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>I-click upang palakihin (Ultra-HD)</span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 max-w-2xl">
            Pinamumunuan ng PESO Dingalan sa ilalim ng Lokal na Pamahalaan ng Dingalan, Aurora — katuwang ang Department of Labor and Employment (DOLE) Regional Office III at Aurora Field Office.
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal for Ultra-HD Inspection */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="w-full max-w-7xl flex items-center justify-between gap-3 mb-3 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white">
              <h3 className="text-sm sm:text-base font-extrabold tracking-wide">
                PESO EC ACCESS — Digital Organizational Directory (Ultra-HD 2560×1440)
              </h3>
              <p className="text-[11px] text-slate-300">
                Local Government Unit of Dingalan, Aurora • Public Employment Service Office
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/images/peso-organizational-structure.png"
                download="PESO-EC-Access-Dingalan-Organizational-Structure-HD.png"
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">I-download ang HD Image</span>
              </a>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                aria-label="Isara ang preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className="w-full max-w-7xl max-h-[85vh] overflow-auto rounded-2xl border border-slate-700/80 shadow-2xl bg-[#061224]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="/images/peso-organizational-structure.png"
              alt="PESO EC ACCESS - LGU Dingalan Official Organizational Structure Directory (Full HD)"
              width={2560}
              height={1440}
              className="w-full h-auto object-contain block"
            />
          </div>
        </div>
      )}
    </section>
  );
}
