"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Search,
  Home,
  Users,
  Briefcase,
  FileCheck,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  Phone,
  Mail,
  Building2,
  Globe,
  HelpCircle,
  FileText,
} from "lucide-react";

export function LandingNavDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Lock scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape key closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const menuItems = [
    {
      category: "Pangunahing Pahina",
      links: [
        { title: "Home (Portal Landing Page)", href: "#hero", icon: Home, badge: "Active", isExternal: false },
      ],
    },
    {
      category: "Institutional",
      links: [
        { title: "About Us & PESO Org Chart • Leadership", href: "#org-structure", icon: Users, isExternal: false },
      ],
    },
    {
      category: "Core Mandate Services",
      links: [
        { title: "TUPAD Online Application & Registration", href: "/apply", icon: Sparkles, highlight: true, isExternal: false },
        { title: "TUPAD Application Status Inquiry", href: "#inquiry", icon: FileCheck, isExternal: false },
        { title: "365-Day Eligibility Rule Checker", href: "/restrictions/checker", icon: ShieldCheck, isExternal: false },
        { title: "Active Work Programs Hub", href: "#programs", icon: Briefcase, isExternal: false },
        { title: "DAMA E-Trabaho Job Matching", href: "#", icon: Globe, status: "Under Dev", isExternal: false },
        { title: "Technical Skills Accreditation", href: "#", icon: FileText, status: "Future Dev", isExternal: false },
        { title: "SPES, GIP, DILEEP, Career Guidance", href: "#", icon: Briefcase, status: "Future Dev", isExternal: false },
        { title: "Migrants' Corner (OFW Helpdesk)", href: "#", icon: Globe, status: "Future Dev", isExternal: false },
      ],
    },
    {
      category: "Inobasyon at Teknolohiya",
      links: [
        { title: "Public Services Digitalization (PESO GovTech)", href: "#hero", icon: Sparkles, badge: "GovTech", isExternal: false },
      ],
    },
    {
      category: "Bukas at Mabuting Pamamahala",
      links: [
        { title: "Transparency Seal & Citizen's Charter", href: "https://dingalan.gov.ph", icon: ShieldCheck, isExternal: true },
        { title: "DOLE Philippines Portal", href: "https://dole.gov.ph", icon: ExternalLink, isExternal: true },
      ],
    },
    {
      category: "Ugnayan at Sumbong Desk",
      links: [
        { title: "Direct Citizen Message & Feedback Desk", href: "#inquiry-form", icon: MessageSquare, isExternal: false },
        { title: "Staff & Coordinator Terminal Log In", href: "/login", icon: Lock, highlight: true, isExternal: false },
      ],
    },
  ];

  const filteredCategories = menuItems
    .map((cat) => ({
      ...cat,
      links: cat.links.filter((l) =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.links.length > 0);

  return (
    <>
      {/* Primary Navigation Bar Matching Screenshot */}
      <nav className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b-2 border-emerald-500" data-purpose="primary-navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 h-14 sm:h-16">
          {/* Left: Drawer Menu Trigger & e PESO Logo */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Green Popping Drawer Trigger Button */}
            <button
              onClick={() => setIsOpen(true)}
              aria-controls="portal-sidebar-drawer"
              aria-expanded={isOpen}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-lg shadow transition-all transform active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 ring-offset-2 ring-offset-slate-900"
              type="button"
            >
              <Menu className="w-5 h-5" />
              <span>Narito ang mga Serbisyo ng PESO</span>
              <span className="bg-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wide hidden sm:inline-block">
                Menu
              </span>
            </button>

            {/* e PESO access logo mark */}
            <div className="flex items-center shrink-0 pl-1">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtqq1AnBWH-IzGl0TscldgxBJ_eyEGCS0nd9WZmSFUVAf4L7caXSH1ql5LKwwNGYrQxSDRH8ctQQlAJtTQhTf0YcatJbBY-2WCk4q-2-B7xqHWzGcNbALIlc8_2AjPiM6XNqJz1SKhth4ueruC9B4xKn_oypFD1xnFXZLL5fKWRPe4ra1UzHRCbkBmdowTklgFaPj6KVn3sY2Ch2nnAwbYsNAvjA4sYP5gfObxzMBHZJDJHGdtgOTN8yubzq8xruwNxGk"
                alt="e PESO access Logo"
                className="h-8 sm:h-10 w-auto object-contain transition-transform hover:scale-105"
              />
            </div>
          </div>

          {/* Right: MAEDUP! Staff & Coordinator Portal CTA */}
          <div className="flex items-center shrink-0">
            <Link
              href="/login"
              className="group relative flex items-center gap-2 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-600 p-0.5 rounded-xl shadow-lg hover:shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 focus:outline-none"
              title="MAEDUP! e PESO Access Login & Coordinator Terminal"
            >
              <div className="bg-slate-950 hover:bg-slate-900 text-white rounded-[10px] px-3 py-1.5 flex items-center gap-2.5 transition-colors">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAuFRrdS56G2DSbPoUVZz4HCox-4sYgn0iLcMXXnIy6XXQpXrJZC11lk8PhfZbUMkQLAuSEi9uN98FRwRJDzuefzCGGc_UgW5X9NaJlVUwvXe_hZHfbwuKjnUGVgJ74DjwombkIsngdU-OsZWW0rtI29btWxwK4uvz67PCxc3_E2Y4F6v-7EFYxvDrrLlKfwWmN7MCY9y2BCWKJ6Wbs9gOToCjss0c0fN8whfVE1uKHZjuLevN54R_Qx2kCZ3UuDm260U"
                  alt="MAEDUP! e PESO access Portal Login"
                  className="h-8 sm:h-10 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="text-left hidden sm:block">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400 leading-none">
                    Staff &amp; Coordinator
                  </span>
                  <span className="text-xs font-extrabold text-white flex items-center gap-1 mt-0.5">
                    Portal Log In <span className="text-xs text-emerald-400 group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Popping Off-Canvas Sidebar Drawer */}
      <aside
        id="portal-sidebar-drawer"
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Dark Backdrop */}
        <div
          onClick={() => setIsOpen(false)}
          className={`absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Sliding Panel */}
        <div
          className={`absolute top-0 left-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out z-10 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img
                alt="PESO e-access Logo"
                className="w-9 h-9 object-contain"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAj1q8BH2iNh9KtYs8CRdUdk9X5cr1XGEYHBF0KtIfW7SiEKZCjkWtGZanoKud35gvZ7CJHrlsuFduLuZhrC1jNuxWeXijl6C8QV-difKhqPUsc60LMG5wcU5aDttRSD1t0nPlo7_D8gE8ETdVrwVK7mpu_GXRlqegfgKPXZUYjqYdI5dTjqRDPgw07PUfFwqNJERfismMSOpqMMUj-NyC1SI2RFSnrAONbP30b-dEfk62NXCbe5Nx_ojvd9o2TbtxI6BiGDZPS3gDYwYc"
              />
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Navigation Directory
                </span>
                <h2 className="text-base font-extrabold text-white">PESO EC Access Menu</h2>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close drawer"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Search inside Drawer */}
          <div className="p-3 bg-slate-100 border-b border-slate-200">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="Hanapin ang serbisyo, mensahe, o module..."
                type="text"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Nav Categories List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-slate-100">
            {filteredCategories.map((cat, catIdx) => (
              <div key={catIdx} className={catIdx > 0 ? "pt-3" : "pt-1"}>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                  {cat.category}
                </div>
                <div className="space-y-1">
                  {cat.links.map((link, linkIdx) => {
                    const IconComponent = link.icon;
                    return (
                      <div key={linkIdx}>
                        {link.isExternal ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between py-2 px-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-slate-500" />
                              <span>{link.title}</span>
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          <a
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center justify-between py-2 px-3 rounded-lg font-medium text-xs transition-colors ${
                              link.highlight
                                ? "bg-emerald-50 text-emerald-900 font-bold hover:bg-emerald-100"
                                : link.badge === "Active"
                                ? "bg-blue-50 text-blue-900 font-bold hover:bg-blue-100"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <IconComponent
                                className={`w-4 h-4 ${
                                  link.highlight
                                    ? "text-emerald-700"
                                    : link.badge === "Active"
                                    ? "text-blue-700"
                                    : "text-slate-500"
                                }`}
                              />
                              <span>{link.title}</span>
                            </span>
                            {link.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                  link.badge === "Active"
                                    ? "bg-blue-200 text-blue-900"
                                    : "bg-emerald-600 text-white font-bold"
                                }`}
                              >
                                {link.badge}
                              </span>
                            )}
                            {link.status && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                {link.status}
                              </span>
                            )}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <img
                alt="PESO emblem"
                className="w-10 h-10 object-contain shrink-0"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuANBUA3BdYyqzNv4ams8ja9AUC4nmzO1ByHg1Jt2PDdsLZ71dm0ero1ICGiflRLiPHd6oOg5C87GKkyuCiHWovXBBEUPEU1XGBPznPBpscCUKBqHpMLhbZ1wFWabFsQX57wjSqwIF9qxPga9_ZHmV3_SPFVxamcxdLOzVBDjxGoXTyJ7FS44hNjyOMemLGdCPjD5RHsSiVGXr5ugApEjW8qpNeOOgdyaEyeHFNVJX8L1oN5LM3t4stlYg"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-800">PESO Dingalan Aurora</div>
                <p className="text-slate-500 text-[11px]">Serbisyong may DAMA sa bawat Dingaleño</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
