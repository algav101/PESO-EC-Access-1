"use client";

import React from "react";

interface PesoLogoProps {
  className?: string;
  size?: number;
}

export function PesoLogo({ className = "h-10 w-10", size = 44 }: PesoLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      title="PESO e access"
    >
      <img
        src="/peso-logo.png"
        alt="PESO e access Logo"
        className="w-full h-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-105"
      />
    </div>
  );
}
