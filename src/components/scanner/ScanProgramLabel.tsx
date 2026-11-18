interface ScanProgram {
  programCode?: string;
  programName?: string;
}

export function ScanProgramLabel({ program }: { program?: ScanProgram }) {
  if (!program) return null;
  return (
    <p data-testid="scan-work-program" className="text-xs font-semibold text-gov-blue leading-snug">
      Work program: {program.programCode}{program.programName ? ` — ${program.programName}` : ""}
    </p>
  );
}
