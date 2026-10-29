export type ApplicationWriteAction = "DRAFT" | "SUBMIT";

export function isIdempotentReplay(existingSubmissionStatus: string | null | undefined, action: ApplicationWriteAction): boolean {
  return existingSubmissionStatus === "SUBMITTED" && action === "SUBMIT";
}
