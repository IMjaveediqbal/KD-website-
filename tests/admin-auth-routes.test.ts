import test from "node:test";
import assert from "node:assert/strict";
import { POST as adminLogin } from "../app/api/admin/auth/login/route";
import { POST as adminLogout } from "../app/api/admin/auth/logout/route";

const originalNodeEnv = process.env.NODE_ENV;
const originalBaseUrl = process.env.APP_BASE_URL;
const originalAllowedOrigins = process.env.APP_ALLOWED_ORIGINS;

test.before(() => {
  Reflect.set(process.env, "NODE_ENV", "development");
  delete process.env.APP_BASE_URL;
  delete process.env.APP_ALLOWED_ORIGINS;
});

test.after(() => {
  if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
  if (originalBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalBaseUrl;
  if (originalAllowedOrigins === undefined) delete process.env.APP_ALLOWED_ORIGINS;
  else process.env.APP_ALLOWED_ORIGINS = originalAllowedOrigins;
});

test("admin login route rejects an untrusted browser origin before database access", async () => {
  const response = await adminLogin(new Request("http://localhost:3100/api/admin/auth/login", {
    method: "POST",
    headers: {
      origin: "http://attacker.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ email: "admin@example.test", password: "correct-horse-battery" }),
  }));

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Request origin is not allowed." });
});

test("admin login route validates credentials before database access", async () => {
  const response = await adminLogin(new Request("http://localhost:3100/api/admin/auth/login", {
    method: "POST",
    headers: {
      origin: "http://localhost:3100",
      "content-type": "application/json",
    },
    body: JSON.stringify({ email: "not-an-email", password: "" }),
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid email or password." });
});

test("admin logout route rejects an untrusted origin before reading or revoking a session", async () => {
  const response = await adminLogout(new Request("http://localhost:3100/api/admin/auth/logout", {
    method: "POST",
    headers: { origin: "http://attacker.example" },
  }));

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Request origin is not allowed." });
});

test("admin logout route accepts the active development port for same-origin requests", async () => {
  const response = await adminLogout(new Request("http://localhost:3100/api/admin/auth/logout", {
    method: "POST",
    headers: { origin: "http://localhost:3100" },
  }));

  // Outside a Next.js request context the cookie store is unavailable; the
  // route must pass origin validation and fail safely rather than return 403.
  assert.notEqual(response.status, 403);
});
