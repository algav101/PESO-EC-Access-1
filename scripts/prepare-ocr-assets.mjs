import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public", "ocr", "local-v1");
mkdirSync(path.join(output, "core"), { recursive: true });
const packageRoot = (name) => path.dirname(require.resolve(name + "/package.json"));
copyFileSync(path.join(packageRoot("tesseract.js"), "dist", "worker.min.js"), path.join(output, "worker.min.js"));
copyFileSync(path.join(packageRoot("@tesseract.js-data/eng"), "4.0.0_best_int", "eng.traineddata.gz"), path.join(output, "eng.traineddata.gz"));
const core = packageRoot("tesseract.js-core");
for (const file of readdirSync(core).filter((name) => /-lstm\.wasm(?:\.js)?$/.test(name))) {
  copyFileSync(path.join(core, file), path.join(output, "core", file));
}
copyFileSync(path.join(packageRoot("pdfjs-dist"), "build", "pdf.worker.min.js"), path.join(output, "pdf.worker.min.js"));
console.log("Local OCR worker, model, WASM, and PDF assets are ready.");
