import test from "node:test";
import assert from "node:assert/strict";
import { hasTrustedRequestOrigin } from "../lib/request-security";

const originalNodeEnv = process.env.NODE_ENV;
const originalBaseUrl = process.env.APP_BASE_URL;
const originalAllowedOrigins = process.env.APP_ALLOWED_ORIGINS;

test.after(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalBaseUrl;
  if (originalAllowedOrigins === undefined) delete process.env.APP_ALLOWED_ORIGINS;
  else process.env.APP_ALLOWED_ORIGINS = originalAllowedOrigins;
});

test("development accepts the exact request origin including its port", () => {
  process.env.NODE_ENV = "development";
  delete process.env.APP_BASE_URL;
  delete process.env.APP_ALLOWED_ORIGINS;
  assert.equal(hasTrustedRequestOrigin(new Request("http://localhost:3012/api/auth/login", { headers: { origin: "http://localhost:3012" } })), true);
  assert.equal(hasTrustedRequestOrigin(new Request("http://localhost:3012/api/auth/login", { headers: { origin: "http://localhost:3000" } })), false);
});

test("production requires an explicitly configured exact origin", () => {
  process.env.NODE_ENV = "production";
  process.env.APP_BASE_URL = "https://data.example.org";
  process.env.APP_ALLOWED_ORIGINS = "https://admin.example.org, https://data.example.org";
  assert.equal(hasTrustedRequestOrigin(new Request("https://data.example.org/api/auth/login", { headers: { origin: "https://data.example.org" } })), true);
  assert.equal(hasTrustedRequestOrigin(new Request("https://data.example.org/api/auth/login", { headers: { origin: "https://attacker.example" } })), false);
  assert.equal(hasTrustedRequestOrigin(new Request("https://data.example.org/api/auth/login", { headers: { origin: "https://data.example.org.evil.test" } })), false);
});

test("rejects missing, malformed, and credential-bearing origins", () => {
  process.env.NODE_ENV = "development";
  delete process.env.APP_BASE_URL;
  delete process.env.APP_ALLOWED_ORIGINS;
  assert.equal(hasTrustedRequestOrigin(new Request("http://localhost:3000/api", { headers: {} })), false);
  assert.equal(hasTrustedRequestOrigin(new Request("http://localhost:3000/api", { headers: { origin: "not-a-url" } })), false);
  assert.equal(hasTrustedRequestOrigin(new Request("http://localhost:3000/api", { headers: { origin: "http://user:pass@localhost:3000" } })), false);
});
