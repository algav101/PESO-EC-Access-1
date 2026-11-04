/** Gateways can return plain text/HTML instead of our API JSON on failure. */
export async function readImportResponse(response: Response, stage: "preview" | "commit") {
  const uncertain = stage === "commit"
    ? " The import result is unknown. Check the program roster before retrying; do not repeatedly click Commit."
    : " Please try previewing the file again.";
  let data: any;
  try {
    const text = await response.text();
    data = JSON.parse(text);
  } catch {
    const reason = [408, 504].includes(response.status) ? "The server timed out"
      : response.status === 413 ? "The uploaded roster is too large for the server"
      : "The server returned an unreadable response";
    throw new Error(`${reason} (HTTP ${response.status}).${uncertain}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`The server returned an invalid import response (HTTP ${response.status}).${uncertain}`);
  }
  if (!response.ok) {
    throw new Error(typeof data.error === "string" && data.error.trim()
      ? data.error : `Import ${stage} failed (HTTP ${response.status}).${uncertain}`);
  }
  const valid = data.success === true && (stage === "preview"
    ? data.preview && Array.isArray(data.preview.rows)
    : Number.isInteger(data.importedCount) && data.importedCount >= 0);
  if (!valid) throw new Error(`The server did not confirm the import ${stage}.${uncertain}`);
  return data;
}
