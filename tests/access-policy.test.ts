import test from "node:test";
import assert from "node:assert/strict";
import {
  canEditContribution,
  isAdminSessionUsable,
  isUserSessionUsable,
  ownedContributionWhere,
} from "../lib/access-policy";

const now = new Date("2026-11-09T10:00:00.000Z");

test("ordinary user sessions require an active account and a future expiry", () => {
  assert.equal(isUserSessionUsable({ expiresAt: new Date(now.getTime() + 1000), user: { status: "ACTIVE" } }, now), true);
  assert.equal(isUserSessionUsable({ expiresAt: now, user: { status: "ACTIVE" } }, now), false);
  assert.equal(isUserSessionUsable({ expiresAt: new Date(now.getTime() + 1000), user: { status: "SUSPENDED" } }, now), false);
  assert.equal(isUserSessionUsable({ expiresAt: new Date(now.getTime() + 1000), user: { status: "DEACTIVATED" } }, now), false);
});

test("administrator sessions require active admin, future expiry, and no revocation", () => {
  assert.equal(isAdminSessionUsable({ expiresAt: new Date(now.getTime() + 1000), revokedAt: null, admin: { status: "ACTIVE" } }, now), true);
  assert.equal(isAdminSessionUsable({ expiresAt: now, revokedAt: null, admin: { status: "ACTIVE" } }, now), false);
  assert.equal(isAdminSessionUsable({ expiresAt: new Date(now.getTime() + 1000), revokedAt: now, admin: { status: "ACTIVE" } }, now), false);
  assert.equal(isAdminSessionUsable({ expiresAt: new Date(now.getTime() + 1000), revokedAt: null, admin: { status: "DISABLED" } }, now), false);
});

test("contribution ownership filters always include the signed-in user id", () => {
  assert.deepEqual(ownedContributionWhere("user-a"), { userId: "user-a" });
  assert.deepEqual(ownedContributionWhere("user-a", "contribution-1"), { userId: "user-a", id: "contribution-1" });
  assert.notDeepEqual(ownedContributionWhere("user-a", "contribution-1"), ownedContributionWhere("user-b", "contribution-1"));
});

test("only drafts and returned contributions can be edited", () => {
  for (const status of ["DRAFT", "NEEDS_CORRECTION", "REVISION_PENDING"]) assert.equal(canEditContribution(status), true);
  for (const status of ["QUEUED", "SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW", "VALIDATED", "REJECTED", "DUPLICATE", "ARCHIVED"]) assert.equal(canEditContribution(status), false);
});
