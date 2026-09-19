"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";

interface TableScrollWrapperProps {
  children: React.ReactNode;
  className?: string;
  showScrollHint?: boolean;
}

export function TableScrollWrapper({
  children,
  className = "",
  showScrollHint = true,
}: TableScrollWrapperProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isSyncingTop = useRef(false);
  const isSyncingBottom = useRef(false);

  const [scrollWidth, setScrollWidth] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateDimensions = useCallback(() => {
    if (!bottomScrollRef.current) return;
    const scrollW = bottomScrollRef.current.scrollWidth;
    const clientW = bottomScrollRef.current.clientWidth;
    setScrollWidth(scrollW);
    setCanScroll(scrollW > clientW + 2);

    const maxScroll = scrollW - clientW;
    if (maxScroll > 0) {
      setScrollProgress(
        Math.min(100, Math.max(0, Math.round((bottomScrollRef.current.scrollLeft / maxScroll) * 100)))
      );
    } else {
      setScrollProgress(0);
    }
  }, []);

  useEffect(() => {
    updateDimensions();

    const bottomEl = bottomScrollRef.current;
    if (!bottomEl) return;

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(bottomEl);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    window.addEventListener("resize", updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [updateDimensions]);

  const handleTopScroll = () => {
    if (isSyncingBottom.current) return;
    isSyncingTop.current = true;
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      const maxScroll =
        bottomScrollRef.current.scrollWidth - bottomScrollRef.current.clientWidth;
      if (maxScroll > 0) {
        setScrollProgress(
          Math.min(100, Math.max(0, Math.round((bottomScrollRef.current.scrollLeft / maxScroll) * 100)))
        );
      }
    }
    requestAnimationFrame(() => {
      isSyncingTop.current = false;
    });
  };

  const handleBottomScroll = () => {
    if (isSyncingTop.current) return;
    isSyncingBottom.current = true;
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
      const maxScroll =
        bottomScrollRef.current.scrollWidth - bottomScrollRef.current.clientWidth;
      if (maxScroll > 0) {
        setScrollProgress(
          Math.min(100, Math.max(0, Math.round((bottomScrollRef.current.scrollLeft / maxScroll) * 100)))
        );
      }
    }
    requestAnimationFrame(() => {
      isSyncingBottom.current = false;
    });
  };

  const scrollByAmount = (delta: number) => {
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Top Synchronized Horizontal Scrollbar */}
      {canScroll && (
        <div className="border-b border-slate-200 bg-slate-100/90 text-slate-600 select-none">
          {showScrollHint && (
            <div className="px-3 py-1 flex items-center justify-between text-[11px] border-b border-slate-200/70 bg-slate-50/80">
              <div className="flex items-center space-x-1.5 text-slate-600">
                <ArrowLeftRight className="w-3.5 h-3.5 text-gov-blue" />
                <span className="font-bold text-slate-700">Top Horizontal Scrollbar</span>
                <span className="text-slate-400 hidden sm:inline">• Slide bar or click buttons to scroll left/right without going to the bottom</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono text-slate-500 font-bold mr-1">
                  {scrollProgress}%
                </span>
                <button
                  type="button"
                  onClick={() => scrollByAmount(-350)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold transition flex items-center space-x-0.5 shadow-2xs text-[10px] cursor-pointer"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollByAmount(350)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold transition flex items-center space-x-0.5 shadow-2xs text-[10px] cursor-pointer"
                  title="Scroll Right"
                >
                  <span>Right</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Native Draggable Top Scrollbar Container */}
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="overflow-x-auto overflow-y-hidden custom-horizontal-scrollbar bg-slate-100/90"
            style={{ minHeight: "13px" }}
          >
            <div
              style={{
                width: scrollWidth ? `${scrollWidth}px` : "100%",
                height: "1px",
              }}
            />
          </div>
        </div>
      )}

      {/* Main Bottom Table Container */}
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        className="overflow-x-auto custom-horizontal-scrollbar"
      >
        <div ref={contentRef} className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
