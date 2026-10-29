import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

function worker(hostname) {
  const handlers = {};
  const deleted = [];
  const navigated = [];
  let unregistered = false;
  let claimed = false;
  let skipWaiting = false;
  const cachedNames = ["peso-tupad-cache-v2", "peso-tupad-cache-v3", "peso-tupad-cache-v4", "another-app-cache"];
  const self = {
    location: { hostname },
    addEventListener: (name, handler) => { handlers[name] = handler; },
    skipWaiting: () => { skipWaiting = true; },
    registration: { unregister: async () => { unregistered = true; } },
    clients: {
      claim: async () => { claimed = true; },
      matchAll: async () => [{
        url: "http://localhost:3000/apply",
        navigate: async (url) => { navigated.push(url); },
      }],
    },
  };
  runInNewContext(source, {
    self, URL, Response, Promise, console: { log() {}, warn() {} },
    caches: {
      keys: async () => cachedNames,
      delete: async (name) => { deleted.push(name); return true; },
      open: async () => { throw new Error("Unexpected cache write during recovery"); },
    },
    fetch: async () => { throw new Error("Unexpected network request during recovery"); },
  });
  return {
    handlers, deleted, navigated,
    state: () => ({ unregistered, claimed, skipWaiting }),
  };
}

for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
  const local = worker(hostname);
  local.handlers.install({});
  assert.equal(local.state().skipWaiting, true, "local recovery worker activates immediately");
  let activation;
  local.handlers.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(local.deleted, ["peso-tupad-cache-v2", "peso-tupad-cache-v3", "peso-tupad-cache-v4"]);
  assert.equal(local.state().unregistered, true, "localhost removes the app worker");
  assert.equal(local.state().claimed, true, "recovery reaches existing controlled tabs");
  assert.deepEqual(local.navigated, ["http://localhost:3000/apply"], "tabs reload after stale bundles are removed");
  let intercepted = false;
  local.handlers.fetch({
    request: { url: "http://localhost:3000/_next/static/chunks/main-app.js", method: "GET" },
    respondWith: () => { intercepted = true; },
  });
  assert.equal(intercepted, false, "local JavaScript bypasses the service worker cache");
}

const production = worker("peso.example.com");
let activation;
production.handlers.activate({ waitUntil: (promise) => { activation = promise; } });
await activation;
assert.deepEqual(production.deleted, ["peso-tupad-cache-v2", "peso-tupad-cache-v3"], "production keeps the current and unrelated caches");
assert.equal(production.state().unregistered, false, "production offline support stays registered");
assert.equal(production.state().claimed, true);
console.log("Service worker cache recovery tests passed.");
