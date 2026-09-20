"use client";

import React, { useState } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  ExternalLink,
} from "lucide-react";

export function PesoOrganizationalChart() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section id="org-structure" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 scroll-mt-24">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
            <Building2 className="w-3.5 h-3.5 text-blue-800" />
            <span>Public Employment Service Office</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            PESO Dingalan Organizational Structure
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Ang opisyal na balangkas ng pamunuan at field coordinators na nagpapatupad ng TUPAD Emergency Community Employment sa Bayan ng Dingalan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <span>{isExpanded ? "Itago ang Org Chart" : "Ipakita ang Org Chart"}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Organizational Chart Container */}
      {isExpanded && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-8 flex flex-col items-center animate-fadeIn space-y-6">
          {/* Executive Hierarchy Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl text-xs font-bold text-slate-700">
            <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              Municipal Leadership: Mayor Shierwin H. Taay
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              PESO Manager &amp; TUPAD Focal Person
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              11 Barangay Field Coordinators Network
            </span>
          </div>

          {/* High-Resolution Org Chart Graphic */}
          <div className="w-full max-w-5xl rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-50 transition-all hover:shadow-lg">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDN8Ny5eh3j7XXuXv2Vc0-1mj7lYhtg1JC7WDBy-NLkzb-MsEy9tOxi0aw782zPcxbZTK1GZYK5FkuWlBO9gZET_ZBtBAqhClHq5oARWR_p3YeTY_imh9_K67eKuYDCMT4shXHh1My7Y168aoEuHLfpQY-PdnluhcbR5AHjPQQk7F4uHsuegMDVRIO2lRweiajb3AMwV7Rs8J5p9affuNwnEPyG5tsyYhg7PepIldtNMNEql-NHw4MkG2uxYUrYF4KM"
              alt="PESO Dingalan Official Organizational Structure Chart"
              className="w-full h-auto object-contain block"
            />
          </div>

          <div className="text-center text-xs text-slate-500 max-w-2xl">
            Pinamumunuan ng PESO Dingalan sa direktang pakikipagtulungan sa Department of Labor and Employment (DOLE) Regional Office III at Aurora Field Office.
          </div>
        </div>
      )}
    </section>
  );
}
