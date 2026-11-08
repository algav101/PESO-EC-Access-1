// Accept only Facebook page addresses, never arbitrary iframe sources or scripts.
export function normalizeFacebookPageUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !["facebook.com", "www.facebook.com", "m.facebook.com"].includes(url.hostname) || url.username || url.password || url.port) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (!parts.length || parts.some((part) => ["plugins", "share", "sharer", "sharer.php", "login", "watch", "groups", "posts", "reel", "reels", "videos", "photos"].includes(part.toLowerCase()))) return null;
    const page = new URL(`https://www.facebook.com/${parts.join("/")}`);
    if (url.pathname === "/profile.php") {
      const id = url.searchParams.get("id");
      if (!id || !/^\d+$/.test(id)) return null;
      page.searchParams.set("id", id);
    }
    // A profile.php URL alone cannot prove that the account is a Page.
    return page.toString();
  } catch { return null; }
}

export function facebookPageEmbedUrl(pageUrl: string, width = 500): string {
  const validated = normalizeFacebookPageUrl(pageUrl);
  if (!validated) throw new Error("A valid HTTPS Facebook Page URL is required.");
  const pixelWidth = Number.isFinite(width) ? Math.max(180, Math.min(500, Math.floor(width))) : 500;
  // Verified against Meta's live endpoint: tabs=timeline currently returns only
  // the Page header; show_posts=true without tabs returns the public post feed.
  const params = new URLSearchParams({ href: validated, show_posts: "true", width: String(pixelWidth), height: "700", small_header: "false", adapt_container_width: "true", hide_cover: "false", show_facepile: "false" });
  return `https://www.facebook.com/plugins/page.php?${params}`;
}

export const FACEBOOK_AUTO_REFRESH_MS = 5 * 60 * 1000;

export function shouldRefreshFacebookFeed(lastRefreshAt: number, now: number, documentVisible: boolean, inViewport: boolean): boolean {
  return documentVisible && inViewport && now - lastRefreshAt >= FACEBOOK_AUTO_REFRESH_MS;
}
