"use client";

import { useCallback, useRef, useState, type SetStateAction } from "react";

const STORAGE_KEY = "tupad_selected_program_id";

export function rememberProgramSelection(programId: string) {
  if (!programId || typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, programId); } catch {}
}

/** Only restore a program that is still present in the available roster list. */
export function resolveProgramSelection(programs: { id: string }[], current = ""): string {
  let requested: string | null = null, remembered: string | null = null;
  if (typeof window !== "undefined") {
    requested = new URLSearchParams(window.location.search).get("programId");
    try { remembered = localStorage.getItem(STORAGE_KEY); } catch {}
  }
  return [current, requested, remembered].find((id) => id && programs.some((p) => p.id === id))
    || programs[0]?.id || "";
}

/** Masterlist, printing and all scanner stages share the same program choice. */
export function useProgramSelection() {
  const [programId, setProgramId] = useState("");
  const programRef = useRef(programId);
  const selectProgram = useCallback((value: SetStateAction<string>) => {
    const next = typeof value === "function" ? value(programRef.current) : value;
    programRef.current = next;
    rememberProgramSelection(next);
    setProgramId(next);
  }, []);
  return [programId, selectProgram, programRef] as const;
}
