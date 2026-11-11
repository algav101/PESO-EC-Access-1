import assert from "node:assert/strict";
import http from "node:http";
import { validateSetup, portIsAvailable, waitUntilReady } from "../scripts/start-localhost.mjs";

assert.match(validateSetup().nextBin, /node_modules[\\/]next[\\/]dist[\\/]bin[\\/]next$/);
assert.throws(() => validateSetup(undefined, "18.0.0"), /Node.js 20/);
const server = http.createServer((request, response) => {
  response.statusCode = request.url === "/login" ? 200 : 503;
  response.end("Synthetic readiness test; no database access.");
});
await new Promise(resolve => server.listen(0, "0.0.0.0", resolve));
try {
  const port = server.address().port;
  assert.equal(await portIsAvailable(port), false, "Detect occupied ports without killing their process");
  assert.equal(await waitUntilReady(`http://127.0.0.1:${port}/login`, () => true, 2000), true);
  assert.equal(await waitUntilReady(`http://127.0.0.1:${port}/login`, () => false, 2000), false);
  assert.equal(await waitUntilReady(`http://127.0.0.1:${port}/error`, () => true, 100), false);
} finally { await new Promise(resolve => server.close(resolve)); }
assert.equal(await portIsAvailable(0), true);
console.log("PASS: launcher setup checks, occupied-port safety, and readiness/failed-start detection");
