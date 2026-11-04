// Creates the sanitized, layout-preserving application asset. Never overwrites the source.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import ts from "typescript";
import JSZip from "jszip";
const require = createRequire(import.meta.url), root = process.cwd(), cache = new Map();
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const module = { exports: {} }; cache.set(resolved, module);
  const code = ts.transpileModule(fs.readFileSync(resolved, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: resolved })((name) => name.startsWith("@/") ? load("src/" + name.slice(2) + ".ts") : require(name), module, module.exports);
  return module.exports;
}
const source = process.argv[2];
if (!source) throw new Error("Usage: node scripts/prepare-dole-template.mjs <original.xlsx>");
const original = fs.readFileSync(source);
const output = path.resolve(root, "public/templates/dole-2026-all-forms.xlsx");
if (path.resolve(source) === output) throw new Error("The source workbook must not be overwritten");
const { sanitizeDoleTemplate } = load("src/lib/dole-report-xml.ts");
const clean = await sanitizeDoleTemplate(original);
const [a, b] = await Promise.all([JSZip.loadAsync(original), JSZip.loadAsync(clean)]);
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
for (const name of Object.keys(a.files).filter((n) => /^xl\/(media|drawings)\//.test(n) && !a.files[n].dir)) {
  if (hash(await a.file(name).async("nodebuffer")) !== hash(await b.file(name).async("nodebuffer"))) throw new Error("Original logo/drawing changed: " + name);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, clean);
// A temporary HEADER-ONLY copy avoids evaluating ~70k formulas/full-column arrays merely to inspect logos/layout.
for (const [name, entry] of Object.entries(b.files)) {
  if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) continue;
  const xml = await entry.async("string");
  b.file(name, xml.replace(/<row\b[^>]*?\br="(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g, (row, r) => Number(r) > 18 ? "" : row.replace(/<f\b[^>]*?(?:\/>|>[\s\S]*?<\/f>)/g, "")).replace(/<dimension\b[^>]*\/>/, '<dimension ref="A1:BH18"/>'));
}
const review = path.resolve(root, "node_modules/.cache/dole-report-review");
fs.mkdirSync(review, { recursive: true });
fs.writeFileSync(path.join(review, "headers-only.xlsx"), await b.generateAsync({ type: "nodebuffer" }));
console.log(`Sanitized DOLE asset prepared (${clean.length} bytes); original logos/drawings verified unchanged. Source SHA256 ${hash(original)}. Source file untouched.`);
