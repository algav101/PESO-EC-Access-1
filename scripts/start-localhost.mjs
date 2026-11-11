import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = "http://localhost:3000";

export function validateSetup(root = projectDir, nodeVersion = process.versions.node) {
  if (Number(nodeVersion.split(".")[0]) < 20) throw new Error("Use Node.js 20 or newer for this project.");
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  if (manifest.name !== "peso-tupad-dingalan") throw new Error("This launcher must stay in the PESO project folder.");
  const nextBin = path.join(root, "node_modules/next/dist/bin/next");
  if (!existsSync(nextBin) || !existsSync(path.join(root, "node_modules/@prisma/client/package.json"))) {
    throw new Error("Dependencies are missing. Run npm ci in this folder first, then open Start Localhost.cmd again.");
  }
  if (!existsSync(path.join(root, ".env")) && !existsSync(path.join(root, ".env.local")) && !process.env.DATABASE_URL) {
    throw new Error("Local settings are missing. Copy .env.example to .env and configure your database/server settings first.");
  }
  return { nextBin };
}

export function portIsAvailable(port = 3000) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", error => error.code === "EADDRINUSE" ? resolve(false) : reject(error));
    probe.listen({ port, host: "0.0.0.0", exclusive: true }, () => probe.close(() => resolve(true)));
  });
}

function responds(address) {
  return new Promise(resolve => {
    const request = http.get(address, response => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 400);
    });
    request.setTimeout(2000, () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

export async function waitUntilReady(address, isRunning, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && isRunning()) {
    if (await responds(address)) return true;
    await new Promise(resolve => setTimeout(resolve, 750));
  }
  return false;
}

function runNode(args) {
  const child = spawn(process.execPath, args, { cwd: projectDir, stdio: "inherit", windowsHide: true });
  const finished = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", code => resolve(code ?? 1));
  });
  return { child, finished };
}

function openBrowser() {
  // Fixed local URL only; do not pass user input to a shell.
  const command = process.platform === "win32"
    ? [process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", 'start "" "http://localhost:3000"']]
    : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const browser = spawn(command[0], command[1], { windowsHide: true, stdio: "ignore" });
  browser.on("error", () => console.log(`Open your browser manually: ${url}`));
  browser.unref();
}

export async function main(args = process.argv.slice(2)) {
  if (args.some(arg => !["--check", "--no-browser"].includes(arg))) throw new Error("Supported options: --check, --no-browser");
  const { nextBin } = validateSetup();
  console.log(`PESO EC Access\nProject: ${projectDir}\nLocal URL: ${url}\n`);
  const available = await portIsAvailable();
  if (args.includes("--check")) {
    console.log(`Setup OK. Port 3000: ${available ? "available" : "already in use"}. No server started.`);
    return 0;
  }
  if (!available) throw new Error(`Port 3000 is already in use. If PESO is already running, open ${url}. Otherwise stop the other server first. No process was stopped or replaced.`);
  console.log("Preparing local OCR assets...");
  const prepared = await runNode([path.join(projectDir, "scripts/prepare-ocr-assets.mjs")]).finished;
  if (prepared !== 0) throw new Error("Could not prepare OCR assets. Check the message above; no database changes were made by this launcher.");
  console.log("Starting localhost. Keep this window open; press Ctrl+C to stop.\n");
  const { child, finished } = runNode([nextBin, "dev", "-H", "0.0.0.0", "-p", "3000"]);
  let running = true;
  let interrupted = false;
  let startupError;
  const stop = () => { interrupted = true; child.kill("SIGINT"); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // Attach immediately so a failed spawn/early exit cannot produce an unhandled rejection.
  const completion = finished.then(code => { running = false; return code; }, error => { running = false; startupError = error; return 1; });
  const ready = await waitUntilReady("http://127.0.0.1:3000/login", () => running);
  if (ready && running) {
    console.log(`\nReady: ${url}`);
    if (!args.includes("--no-browser")) openBrowser();
  } else if (running) {
    console.log(`\nStartup is taking longer than expected. Check the logs above, then open ${url} when ready.`);
  }
  try {
    const code = await completion;
    if (startupError) throw startupError;
    return interrupted ? 0 : code;
  }
  finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(`\nCould not start localhost: ${error.message}`);
    process.exitCode = 1;
  });
}
