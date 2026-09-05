"use client";

import React from "react";
import styles from "./TextCubeLoader.module.css";

interface TextCubeLoaderProps {
  subtitle?: string;
  className?: string;
  scale?: number;
  highlightColor?: string;
  animationDuration?: string;
}

/**
 * 13-Cube 3D Isometric Wave Loader
 * Spells out " PESOECACCESS" across 13 sequential 3D transform cubes
 * with synchronized depth, lighting, and glow keyframes.
 */
export function TextCubeLoader({
  subtitle = "Sinisimulan ang PESO EC Access Portal...",
  className = "",
  scale,
  highlightColor,
  animationDuration,
}: TextCubeLoaderProps) {
  // Exactly 13 sequential characters matching: [" ", "P", "E", "S", "O", "E", "C", "A", "C", "C", "E", "S", "S"]
  const cubeLetters = [
    "\u00A0", // Cube 1: &nbsp; / leading space
    "P",      // Cube 2
    "E",      // Cube 3
    "S",      // Cube 4
    "O",      // Cube 5
    "E",      // Cube 6
    "C",      // Cube 7
    "A",      // Cube 8
    "C",      // Cube 9
    "C",      // Cube 10
    "E",      // Cube 11
    "S",      // Cube 12
    "S",      // Cube 13
  ];

  const customStyle: React.CSSProperties = {
    ...(scale ? { transform: `scale(${scale})` } : {}),
    ...(highlightColor ? ({ "--highlight-color": highlightColor } as any) : {}),
    ...(animationDuration ? ({ "--animation-duration": animationDuration } as any) : {}),
  };

  return (
    <div className={`${styles.loaderContainer} ${className}`} role="status" aria-label="Loading PESO EC Access">
      {/* 3D Grid Wrapper with Perspective */}
      <div className={styles["wrapper-grid"]} style={customStyle}>
        {cubeLetters.map((char, index) => (
          <div key={`cube-${index}`} className={styles.cube}>
            {/* 6 Geometric Faces with Precise 3D Rotations and Translations */}
            <div className={`${styles.face} ${styles["face-front"]}`}>
              {char}
            </div>
            <div className={`${styles.face} ${styles["face-back"]}`} aria-hidden="true" />
            <div className={`${styles.face} ${styles["face-left"]}`} aria-hidden="true" />
            <div className={`${styles.face} ${styles["face-right"]}`} aria-hidden="true" />
            <div className={`${styles.face} ${styles["face-top"]}`} aria-hidden="true" />
            <div className={`${styles.face} ${styles["face-bottom"]}`} aria-hidden="true" />
          </div>
        ))}
      </div>

      {/* Optional Subtitle and Status Pulse */}
      {subtitle && (
        <div className="mt-8 flex flex-col items-center justify-center space-y-1.5 text-center">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{subtitle}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            LGU Dingalan • DOLE Emergency Employment Digital Portal
          </p>
        </div>
      )}
    </div>
  );
}

export default TextCubeLoader;
