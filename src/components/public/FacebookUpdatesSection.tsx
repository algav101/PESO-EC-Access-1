"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, ExternalLink, Facebook, Images, Megaphone, RefreshCw, ShieldCheck } from "lucide-react";
import { facebookPageEmbedUrl, normalizeFacebookPageUrl, shouldRefreshFacebookFeed } from "@/lib/facebook-page";

export function FacebookUpdatesSection({ pageUrl, accountType = "PAGE" }: { pageUrl?: string; accountType?: "PROFILE" | "PAGE" }) {
  const url = normalizeFacebookPageUrl(pageUrl);
  const isProfile = accountType === "PROFILE";
  const [enabled, setEnabled] = useState(true);
  const [width, setWidth] = useState(500);
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const lastRefreshAt = useRef(Date.now());

  const reloadFeed = () => {
    lastRefreshAt.current = Date.now();
    setRetry((value) => value + 1);
    setFailed(false);
  };

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(180, Math.min(500, Math.floor(entry.contentRect.width)))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isProfile || !url || !enabled) return;
    const element = container.current;
    if (!element) return;
    let inViewport = false;
    const refreshIfDue = () => {
      const now = Date.now();
      if (shouldRefreshFacebookFeed(lastRefreshAt.current, now, document.visibilityState === "visible", inViewport)) {
        lastRefreshAt.current = now;
        setRetry((value) => value + 1);
        setFailed(false);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      refreshIfDue();
    });
    observer.observe(element);
    const timer = window.setInterval(refreshIfDue, 60000);
    document.addEventListener("visibilitychange", refreshIfDue);
    window.addEventListener("focus", refreshIfDue);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfDue);
      window.removeEventListener("focus", refreshIfDue);
    };
  }, [isProfile, url, enabled]);

  return (
    <section id="gallery" aria-labelledby="facebook-updates-title" className="relative z-10 scroll-mt-20 border-y border-slate-200 bg-slate-100/95 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="grid lg:grid-cols-12">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-950 p-6 text-white sm:p-10 lg:col-span-5 lg:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative space-y-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
                <Facebook className="h-3.5 w-3.5" /> PESO Community Updates
              </span>
              <div className="space-y-4">
                <h2 id="facebook-updates-title" className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">TUPAD in Action<span className="mt-2 block text-emerald-300">Mga balita mula sa Facebook.</span></h2>
                <p className="text-sm leading-relaxed text-slate-300">Mga anunsyo, aktibidad, at kuwento ng komunidad mula sa aming Facebook {isProfile ? "profile" : "Page"}.</p>
              </div>
              <ul className="space-y-4 border-y border-white/10 py-6">
                {[
                  { icon: Megaphone, title: "Mga anunsyo at paalala", text: "Balita tungkol sa mga programa at serbisyo ng PESO." },
                  { icon: CalendarDays, title: "Mga aktibidad ng komunidad", text: "Mga update sa orientation, trabaho, at iba pang gawain." },
                  { icon: Images, title: "Mga larawan at kuwento", text: "Mga public post na ibinahagi sa Facebook." },
                ].map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5"><Icon className="h-4 w-4 text-emerald-300" /></span>
                    <div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p></div>
                  </li>
                ))}
              </ul>
              {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-300">Buksan sa Facebook <ArrowUpRight className="h-4 w-4" /></a>}
              <p className="text-xs leading-relaxed text-slate-400">Para sa buong timeline at lahat ng available na post, buksan ang Facebook {isProfile ? "profile" : "Page"}. Maaaring mangailangan ng Facebook login ang ilang content.</p>
            </div>
          </div>

          <div className="min-w-0 p-4 sm:p-8 lg:col-span-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Facebook className="h-5 w-5" /></span><div><h3 className="text-base font-extrabold text-slate-900">Facebook Updates</h3><p className="text-xs text-slate-500">{isProfile ? "PESO Dingalan on Facebook" : "Public Page timeline"}</p></div></div>
              {!isProfile && url && enabled && <button type="button" onClick={reloadFeed} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"><RefreshCw className="h-3.5 w-3.5" /> I-load muli</button>}
            </div>
            {!isProfile && url && <p className="mx-auto mb-3 max-w-[500px] text-[11px] font-semibold text-emerald-700">Automatic updates · Nire-refresh bawat 5 minuto habang nakikita ang feed.</p>}
            <div ref={container} className="mx-auto w-full max-w-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {isProfile ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[560px]">
                  <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><img src="/images/peso-eccess-chrome-emblem.png" alt="PESO eCCESS" className="h-24 w-24 object-contain" /></div>
                  <h4 className="text-2xl font-black tracking-tight text-slate-900">PESO Dingalan</h4>
                  <p className="mt-1 text-sm font-semibold text-blue-700">PESO Community Updates</p>
                  <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-600">Bisita sa Facebook para sa mga bagong anunsyo, larawan, at aktibidad ng komunidad.</p>
                  {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"><Facebook className="h-4 w-4" /> Tingnan ang mga post <ArrowUpRight className="h-4 w-4" /></a>}
                  <div className="mt-7 max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500">Personal profile ang account na ito. Ang buong timeline ay bubukas sa Facebook; hindi ito automatic feed sa website. Maaaring i-embed nang hiwalay ang mga available na public post kapag may post links.</div>
                </div>
              ) : url && enabled && !failed ? (
                <iframe key={`${url}-${retry}`} title="PESO Facebook Page timeline" src={facebookPageEmbedUrl(url, width)} width={width} height={700} loading="lazy" allow="encrypted-media; clipboard-write; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" className="block max-w-full border-0 bg-white" onError={() => setFailed(true)} />
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-5 px-5 py-10 text-center sm:min-h-[560px]">
                  <span className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><Facebook className="h-10 w-10 text-blue-600" /></span>
                  <div className="max-w-xs space-y-2"><h4 className="text-lg font-extrabold text-slate-900">{!url ? "Ikinakabit pa ang Facebook Page" : failed ? "Hindi ma-load ang Facebook feed" : "Tingnan ang aming Facebook feed"}</h4><p className="text-sm leading-relaxed text-slate-500">{!url ? "Lalabas dito ang mga public update kapag na-configure na ang tamang Facebook Page URL." : failed ? "Maaari mong buksan ang Page mismo o subukang i-load muli." : "Pindutin sa ibaba para i-load ang embedded timeline mula sa Facebook."}</p></div>
                  {url && <button type="button" onClick={() => { setEnabled(true); reloadFeed(); }} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">{failed ? "Subukang muli" : "Ipakita ang Facebook posts"}</button>}
                  {url && <p className="max-w-xs text-[11px] leading-relaxed text-slate-500">Kapag nag-load ang feed, kokonekta ang browser mo sa Meta/Facebook, na maaaring gumamit ng cookies.</p>}
                </div>
              )}
            </div>
            {!isProfile && url && <div className="mx-auto mt-4 flex max-w-[500px] items-start gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>Kung blanko o hindi available ang feed, <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline">buksan ang Page sa Facebook <ExternalLink className="inline h-3 w-3" /></a>. Facebook ang kumokontrol sa mga post na ipinapakita ng embed.</p></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
