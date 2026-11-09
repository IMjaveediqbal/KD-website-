import test from "node:test";
import assert from "node:assert/strict";
import {
  buildModerationUpdate,
  isContributionReviewable,
  isModerationDecision,
  isModerationNoteValid,
} from "../lib/admin-policy";

const now = new Date("2026-11-09T12:00:00.000Z");

test("only submitted and active review-queue contributions can be moderated", () => {
  for (const status of ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"]) {
    assert.equal(isContributionReviewable(status), true);
  }
  for (const status of ["DRAFT", "QUEUED", "NEEDS_CORRECTION", "REVISION_PENDING", "VALIDATED", "REJECTED", "DUPLICATE", "ARCHIVED"]) {
    assert.equal(isContributionReviewable(status), false);
  }
});

test("moderation accepts only the four supported decisions", () => {
  for (const decision of ["VALIDATED", "NEEDS_CORRECTION", "REJECTED", "DUPLICATE"]) {
    assert.equal(isModerationDecision(decision), true);
  }
  for (const decision of ["APPROVED", "PUBLISHED", "", "DELETE"]) {
    assert.equal(isModerationDecision(decision), false);
  }
});

test("validation may omit a note, but other decisions require a non-empty note", () => {
  assert.equal(isModerationNoteValid("VALIDATED", ""), true);
  assert.equal(isModerationNoteValid("NEEDS_CORRECTION", ""), false);
  assert.equal(isModerationNoteValid("REJECTED", "Insufficient source context"), true);
  assert.equal(isModerationNoteValid("DUPLICATE", "Duplicate entry"), true);
  assert.equal(isModerationNoteValid("REJECTED", "x".repeat(1001)), false);
});

test("moderation update fields are mutually exclusive and preserve reviewer identity", () => {
  assert.deepEqual(buildModerationUpdate("VALIDATED", "", "admin-1", now), {
    status: "VALIDATED", validatedAt: now, validatedBy: "admin-1", correctionNote: null, rejectionReason: null,
  });
  assert.deepEqual(buildModerationUpdate("NEEDS_CORRECTION", "Fix dialect", "admin-1", now), {
    status: "NEEDS_CORRECTION", validatedAt: null, validatedBy: null, correctionNote: "Fix dialect", rejectionReason: null,
  });
  assert.deepEqual(buildModerationUpdate("REJECTED", "Not sourced", "admin-1", now), {
    status: "REJECTED", validatedAt: null, validatedBy: null, correctionNote: null, rejectionReason: "Not sourced",
  });
  assert.deepEqual(buildModerationUpdate("DUPLICATE", "Already exists", "admin-1", now), {
    status: "DUPLICATE", validatedAt: null, validatedBy: null, correctionNote: null, rejectionReason: "Already exists",
  });
});
