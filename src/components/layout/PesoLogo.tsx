"use client";

import React from "react";

interface PesoLogoProps {
  className?: string;
  size?: number;
  src?: string;
}

export function PesoLogo({ className = "h-10 w-10", size = 44, src = "/images/peso-ec-access-emblem.gif" }: PesoLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      title="PESO e access"
    >
      <img
        src={src}
        alt="PESO EC Access Official Emblem Logo"
        className="w-full h-full object-contain rounded-xl transition-transform duration-200 group-hover:scale-105"
      />
    </div>
  );
}
