import test from "node:test";
import assert from "node:assert/strict";
import { revokeAdminSession } from "../lib/admin-session-management";

test("logout revokes the session before attempting the audit write", async () => {
  const events: string[] = [];
  let queriedHash = "";
  const store = {
    adminSession: {
      async updateMany(args: { where: { tokenHash: string; revokedAt: null }; data: { revokedAt: Date } }) {
        events.push("revoke");
        queriedHash = args.where.tokenHash;
        return { count: 1 };
      },
    },
    adminAuditLog: {
      async create() {
        events.push("audit");
        throw new Error("audit store unavailable");
      },
    },
  } as unknown as Parameters<typeof revokeAdminSession>[0];

  await assert.rejects(revokeAdminSession(store, "opaque-session-token", "admin-1"));
  assert.deepEqual(events, ["revoke", "audit"]);
  assert.notEqual(queriedHash, "opaque-session-token");
  assert.match(queriedHash, /^[a-f0-9]{64}$/);
});

test("logout does not create an audit event when no active session was revoked", async () => {
  let auditWrites = 0;
  const store = {
    adminSession: {
      async updateMany() {
        return { count: 0 };
      },
    },
    adminAuditLog: {
      async create() {
        auditWrites += 1;
      },
    },
  } as unknown as Parameters<typeof revokeAdminSession>[0];

  const result = await revokeAdminSession(store, "already-revoked-token", "admin-1");
  assert.equal(result.count, 0);
  assert.equal(auditWrites, 0);
});
