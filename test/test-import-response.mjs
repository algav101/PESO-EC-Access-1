import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const module = { exports: {} };
const code = ts.transpileModule(fs.readFileSync("src/lib/import-response.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInThisContext(`(function(module,exports){${code}\n})`)(module, module.exports);
const { readImportResponse } = module.exports;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
assert.equal((await readImportResponse(json({ success: true, importedCount: 500 }), "commit")).importedCount, 500);
assert.ok((await readImportResponse(json({ success: true, preview: { rows: [] } }), "preview")).preview);
for (const status of [200, 500, 502, 504]) {
  await assert.rejects(readImportResponse(new Response('An error occurred while processing your request', { status }), "commit"), new RegExp(`HTTP ${status}.*result is unknown`));
}
await assert.rejects(readImportResponse(new Response("", { status: 200 }), "commit"), /did not|unreadable/);
await assert.rejects(readImportResponse(json({}), "commit"), /did not confirm/);
await assert.rejects(readImportResponse(json([]), "commit"), /invalid import response/);
await assert.rejects(readImportResponse(json(null), "commit"), /invalid import response/);
await assert.rejects(readImportResponse(json({ error: "Forbidden" }, 403), "commit"), /Forbidden/);
await assert.rejects(readImportResponse(json({ error: "Changes were rolled back" }, 503), "commit"), /rolled back/);
await assert.rejects(readImportResponse(new Response("<html>proxy error</html>", { status: 502 }), "preview"), /previewing the file again/);
console.log("Import response tests passed: plain text/HTML/empty responses, HTTP errors, invalid success payloads and unknown-result retry guidance.");
