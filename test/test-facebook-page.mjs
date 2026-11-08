import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const exported = {};
new Function("exports", ts.transpileModule(fs.readFileSync(new URL("../src/lib/facebook-page.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText)(exported);
const { normalizeFacebookPageUrl, facebookPageEmbedUrl, shouldRefreshFacebookFeed, FACEBOOK_AUTO_REFRESH_MS } = exported;
for (const invalid of [undefined, "", "javascript:alert(1)", "https://facebook.com.evil.test/page", "http://www.facebook.com/test", "https://user:password@facebook.com/test", "https://facebook.com", "https://facebook.com/groups/test", "https://facebook.com/real/posts/test", "https://facebook.com/share/test", "https://facebook.com/profile.php?id=not-a-number"]) assert.equal(normalizeFacebookPageUrl(invalid), null, String(invalid));
assert.equal(normalizeFacebookPageUrl("https://m.facebook.com/test?tracking=removed#fragment"), "https://www.facebook.com/test");
assert.equal(normalizeFacebookPageUrl("https://www.facebook.com/profile.php?id=100077407929199&tracking=removed"), "https://www.facebook.com/profile.php?id=100077407929199");
for (const [requested, expected] of [[100, "180"], [390.5, "390"], [1000, "500"], [NaN, "500"]]) {
  const embedded = new URL(facebookPageEmbedUrl("https://www.facebook.com/example", requested));
  assert.equal(embedded.origin, "https://www.facebook.com");
  assert.equal(embedded.pathname, "/plugins/page.php");
  assert.equal(embedded.searchParams.get("width"), expected);
  assert.equal(embedded.searchParams.get("show_posts"), "true");
  assert.equal(embedded.searchParams.has("tabs"), false, "Do not reintroduce the header-only timeline parameter");
  assert.equal(embedded.searchParams.get("href"), "https://www.facebook.com/example");
}
assert.throws(() => facebookPageEmbedUrl("https://evil.test"));
assert.equal(FACEBOOK_AUTO_REFRESH_MS, 300000);
assert.equal(shouldRefreshFacebookFeed(0, 299999, true, true), false);
assert.equal(shouldRefreshFacebookFeed(0, 300000, true, true), true);
assert.equal(shouldRefreshFacebookFeed(0, 600000, false, true), false);
assert.equal(shouldRefreshFacebookFeed(0, 600000, true, false), false);
assert.equal(shouldRefreshFacebookFeed(300000, 300001, true, true), false);
console.log("PASS: secure Facebook URLs, working post-feed parameters, responsive width, and five-minute foreground-only auto refresh.");
