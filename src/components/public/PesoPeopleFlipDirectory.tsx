"use client";

import { useState } from "react";
import { ArrowLeft, Building2, RotateCw, UserRound } from "lucide-react";

const PORTRAIT_SHEET = "/images/peso-organizational-structure-clear-portraits.png";

// Details transcribed from the existing organizational chart, not inferred biographies.
const PEOPLE = [
  {
    id: "aurora-taay", name: "Hon. Aurora G. Taay", title: "Municipal Mayor",
    unit: "Municipal Leadership", designation: "Municipal Mayor", leadership: true,
    portrait: [970, 255, 285, 343],
  },
  {
    id: "albert-gaviola", name: "Albert D. Gaviola, MPA", title: "PESO Office Head",
    unit: "PESO Office Head", designation: "Municipal Government Department Head",
    additionalRole: "PESO Manager / System Logic & Function Designer", leadership: true,
    portrait: [1885, 255, 268, 343],
  },
  {
    id: "diola-sunga", name: "Diola G. Sunga", title: "Data Controller / Migrants’ Desk Officer",
    unit: "Labor Market Section", designation: "Data Controller / Migrants’ Desk Officer", leadership: false,
    portrait: [449, 918, 225, 250],
  },
  {
    id: "jerico-mariano", name: "Jerico S. Mariano", title: "Revenue Collection Officer I / System Data Analyst",
    unit: "Community Organizations & Manpower Development Skills Training Section",
    designation: "Revenue Collection Officer I / System Data Analyst", leadership: false,
    portrait: [798, 918, 224, 250],
  },
  {
    id: "jerome-llames", name: "Jerome U. Llames", title: "Job Order — System Data Analyst",
    unit: "Community Organizations & Manpower Development Skills Training Section",
    designation: "Job Order — System Data Analyst", leadership: false,
    portrait: [1144, 918, 224, 250],
  },
  {
    id: "mc-clain-lucero", name: "MC Clain Q. Lucero", title: "Budgeting Assistant / System Data Analyst",
    unit: "Employment Services Section", designation: "Budgeting Assistant / System Data Analyst", leadership: false,
    portrait: [1523, 918, 224, 250],
  },
  {
    id: "john-francis-padrones", name: "John Francis A. Padrones", title: "Job Order — System Programmer and Developer",
    unit: "Administrative Services & Systems Development",
    designation: "Job Order — System Programmer and Developer", leadership: false,
    portrait: [1884, 918, 225, 250],
  },
  {
    id: "lhenard-alpuerto", name: "Lhenard B. Alpuerto", title: "GIP — System Data Analyst",
    unit: "Administrative Services & Systems Development", designation: "GIP — System Data Analyst", leadership: false,
    portrait: [2224, 918, 226, 250],
  },
] as const;

type Person = (typeof PEOPLE)[number];

function PersonFlipCard({ person }: { person: Person }) {
  const [flipped, setFlipped] = useState(false);
  const [left, top, width, height] = person.portrait;
  const detailsId = "peso-person-" + person.id + "-details";

  return (
    <article className="peso-person-card flex h-full min-w-0 flex-col items-center rounded-2xl border border-cyan-300/20 bg-gradient-to-b from-[#12314c] to-[#081726] px-5 py-5 text-center shadow-lg" data-person={person.id}>
      <span className="mb-4 inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
        {person.leadership ? <Building2 className="h-3 w-3 shrink-0" /> : <UserRound className="h-3 w-3 shrink-0" />}
        {person.leadership ? person.unit : "PESO Service Team"}
      </span>

      <button
        type="button"
        className="peso-person-photo group relative block w-56 max-w-full shrink-0 overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
        style={{ aspectRatio: width + " / " + height }}
        aria-label={"I-flip ang larawan ni " + person.name}
        aria-pressed={flipped}
        aria-describedby={flipped ? detailsId : undefined}
        data-flipped={flipped}
        onClick={() => setFlipped(value => !value)}
        onKeyDown={event => {
          if (event.key === "Escape") setFlipped(false);
          if (flipped && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            event.currentTarget.querySelector("[data-person-details]")?.scrollBy({ top: event.key === "ArrowDown" ? 60 : -60 });
          }
        }}
      >
        <span className="peso-person-inner absolute inset-0 block">
          <span
            className="peso-person-face peso-person-front absolute inset-0 block overflow-hidden rounded-xl border border-cyan-200/30 bg-black shadow-xl"
            aria-hidden={flipped}
          >
            <span role="img" aria-label={"Larawan ni " + person.name} className="absolute inset-0 block overflow-hidden">
              <img src={PORTRAIT_SHEET} alt="" width={2560} height={1440} draggable={false}
                className="pointer-events-none absolute block max-w-none select-none"
                style={{ width: 2560 / width * 100 + "%", height: 1440 / height * 100 + "%", left: -left / width * 100 + "%", top: -top / height * 100 + "%" }} />
            </span>
          </span>

          <span id={detailsId} className="peso-person-face peso-person-back absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-emerald-300/40 bg-gradient-to-br from-[#0f3b41] via-[#102a40] to-[#0b172a] p-3 text-white shadow-xl" aria-hidden={!flipped}>
            <span className="mb-2 flex shrink-0 items-center gap-1.5 border-b border-white/15 pb-2 text-[10px] font-black uppercase tracking-widest text-emerald-200"><UserRound className="h-3.5 w-3.5" />Detalye</span>
            <span data-person-details className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 text-left">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Posisyon / Designation</span>
              <span className="mt-1 block text-[11px] font-semibold leading-4">{person.designation}</span>
              {"additionalRole" in person && <span className="mt-2 block text-[10px] leading-4 text-slate-200">{person.additionalRole}</span>}
              <span className="mt-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Service Unit</span>
              <span className="mt-1 block text-[11px] leading-4 text-slate-100">{person.unit}</span>
              <span className="mt-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Office / Location</span>
              <span className="mt-1 block text-[10px] leading-4 text-slate-100">{person.id === "aurora-taay" ? "Local Government Unit of Dingalan" : "Public Employment Service Office"}<br />Dingalan, Aurora</span>
            </span>
            <span className="mt-2 flex shrink-0 items-center gap-1.5 border-t border-white/15 pt-2 text-[9px] font-bold text-emerald-200"><ArrowLeft className="h-3 w-3" />I-tap muli para sa larawan</span>
          </span>
        </span>
      </button>

      <p className="mt-4 text-base font-black leading-snug text-white sm:text-lg" data-person-name>{person.name}</p>
      <p className="mt-1 max-w-[30ch] text-xs leading-relaxed text-slate-300" data-person-title>{person.title}</p>
      <p className="mt-auto flex items-center gap-2 pt-4 text-[10px] font-bold text-cyan-200">
        <RotateCw className="h-3.5 w-3.5" />I-tap ang larawan para sa detalye
      </p>
    </article>
  );
}

export function PesoPeopleFlipDirectory() {
  return (
    <div className="w-full rounded-2xl border border-slate-700 bg-[#061224] p-4 text-white shadow-2xl sm:p-6 lg:p-8" data-testid="peso-people-directory">
      <div className="mb-6 flex flex-col justify-between gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Public Employment Service Office</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Kilalanin ang aming team</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">I-tap o i-click ang bawat larawan para makita ang pangalan, posisyon, at service unit.</p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-bold text-cyan-100"><RotateCw className="h-3.5 w-3.5" />Interactive directory</span>
      </div>
      <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-emerald-200">Pamunuan</h4>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PEOPLE.filter(person => person.leadership).map(person => <PersonFlipCard key={person.id} person={person} />)}
      </div>
      <h4 className="mb-3 mt-8 text-xs font-black uppercase tracking-widest text-emerald-200">Service Units &amp; Systems Development</h4>
      <p className="mb-2 text-[11px] text-slate-400">I-swipe o i-scroll pakaliwa/pakanan para makita ang lahat ng staff.</p>
      <div
        role="region"
        aria-label="PESO staff — horizontal scrolling row"
        tabIndex={0}
        className="grid w-full min-w-0 grid-flow-col auto-cols-[260px] grid-rows-1 gap-4 overflow-x-auto overscroll-x-contain snap-x snap-proximity rounded-2xl px-1 py-2 sm:auto-cols-[280px] [&>article]:snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        style={{ scrollbarColor: "#22d3ee #0b172a" }}
      >
        {PEOPLE.filter(person => !person.leadership).map(person => <PersonFlipCard key={person.id} person={person} />)}
      </div>
      <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-400">LGU Dingalan, Aurora · Barangay PESO Coordinators Network · Dama ang bawat pamilyang Dingaleño</p>
      <style jsx global>{`
        .peso-person-photo { perspective: 1200px; }
        .peso-person-inner { transform-style: preserve-3d; transition: transform 600ms cubic-bezier(.2,.7,.2,1); }
        .peso-person-photo[data-flipped="true"] .peso-person-inner { transform: rotateY(180deg); }
        .peso-person-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .peso-person-front { transform: rotateY(0deg); }
        .peso-person-back { transform: rotateY(180deg); }
        @media (prefers-reduced-motion: reduce) { .peso-person-inner { transition: none; } }
      `}</style>
    </div>
  );
}
