/** Validate build inputs without logging their values. Only VITE_* may enter the browser. */
export function resolveFrontendEnvironment(env, { mode, apiPath, defaultProxy }) {
  const fail = (key, reason) => { throw new Error(`CONFIGURATION_INVALID: ${key} ${reason}`); };
  const base = (env.VITE_API_BASE_URL || apiPath).trim().replace(/\/+$/, "");
  const absolute = /^https?:\/\//i.test(base);
  if (base !== apiPath && !absolute) fail("VITE_API_BASE_URL", `must be ${apiPath} or an absolute API URL ending in ${apiPath}.`);
  if (absolute) {
    let url;
    try { url = new URL(base); } catch { fail("VITE_API_BASE_URL", "must be a valid API URL."); }
    if (url.username || url.password || url.search || url.hash || url.pathname !== apiPath)
      fail("VITE_API_BASE_URL", `must end in ${apiPath} without credentials, query or fragment.`);
    if (mode === "production" && url.protocol !== "https:") fail("VITE_API_BASE_URL", "must use HTTPS in Production.");
    if (/YOUR[-_]|CHANGE[-_]ME/i.test(url.hostname)) fail("VITE_API_BASE_URL", "must not contain a placeholder.");
  }
  if (env.VERCEL === "1" && !absolute) fail("VITE_API_BASE_URL", "must be an absolute HTTPS API URL on Vercel.");
  // Legacy names remain readable during local configuration migration.
  const proxy = env.API_PROXY_TARGET || env.NTC_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || defaultProxy;
  if (mode !== "production") {
    let url;
    try { url = new URL(proxy); } catch { fail("API_PROXY_TARGET", "must be an HTTP(S) origin."); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/")
      fail("API_PROXY_TARGET", "must be an HTTP(S) origin without credentials, path, query or fragment.");
  }
  return { apiBaseUrl: base, proxyTarget: proxy };
}
