import test from "node:test";
import assert from "node:assert/strict";
import { resolveFrontendEnvironment as resolve } from "../config/environment.mjs";
const options = { mode: "production", apiPath: "/api/v1", defaultProxy: "http://localhost:5032" };

test("same-origin local builds and a distinct API suffix are supported", () => {
  assert.equal(resolve({}, options).apiBaseUrl, "/api/v1");
  assert.equal(resolve({}, { ...options, apiPath: "/api" }).apiBaseUrl, "/api");
  assert.equal(resolve({ VITE_API_BASE_URL: "https://api.example.test/api/v1/" }, options).apiBaseUrl, "https://api.example.test/api/v1");
});
test("Vercel requires an absolute API URL", () => {
  assert.throws(() => resolve({ VERCEL: "1" }, options), /VITE_API_BASE_URL/);
  assert.equal(resolve({ VERCEL: "1", VITE_API_BASE_URL: "https://api.example.test/api/v1" }, options).apiBaseUrl, "https://api.example.test/api/v1");
});
test("rejects invalid and unsafe production API settings without exposing values", () => {
  for (const value of ["http://api.example.test/api/v1", "https://api.example.test/api", "//evil.test/api/v1", "https://user:private-value@api.test/api/v1", "https://api.test/api/v1?token=private-value", "https://api.test/api/v1#private-value", "https://YOUR-PROJECT.test/api/v1", "https://"]) {
    assert.throws(() => resolve({ VITE_API_BASE_URL: value }, options), error => error.message.includes("CONFIGURATION_INVALID") && !error.message.includes("private-value"));
  }
});
test("private proxy takes precedence and legacy aliases remain compatible", () => {
  const dev = { ...options, mode: "development" };
  assert.equal(resolve({ API_PROXY_TARGET: "http://localhost:5033", NTC_API_PROXY_TARGET: "http://localhost:5034" }, dev).proxyTarget, "http://localhost:5033");
  assert.equal(resolve({ NTC_API_PROXY_TARGET: "http://localhost:5034" }, dev).proxyTarget, "http://localhost:5034");
  assert.equal(resolve({ VITE_API_PROXY_TARGET: "http://localhost:5035" }, dev).proxyTarget, "http://localhost:5035");
  for (const proxy of ["https://user:private-value@example.test", "ftp://example.test", "http://localhost/path"]) assert.throws(() => resolve({ API_PROXY_TARGET: proxy }, dev), /API_PROXY_TARGET/);
});
