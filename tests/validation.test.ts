import test from "node:test";
import assert from "node:assert/strict";
import { contributionSchema, profileSchema, registerSchema } from "../lib/validation";

test("registration normalizes email and username without changing password", () => {
  const parsed = registerSchema.parse({
    email: "  DOSH@example.com ",
    password: "  valid-password  ",
    displayName: "Dosh",
    username: " Dosh_01 ",
  });
  assert.equal(parsed.email, "dosh@example.com");
  assert.equal(parsed.username, "dosh_01");
  assert.equal(parsed.password, "  valid-password  ");
});

test("profile visibility accepts a string-keyed boolean map", () => {
  const parsed = profileSchema.parse({ profileVisibility: { bio: true, village: false } });
  assert.deepEqual(parsed.profileVisibility, { bio: true, village: false });
});

test("contribution validation preserves original Khowar text exactly", () => {
  const originalText = "  ھُو ژو اَسوس  ";
  const parsed = contributionSchema.parse({
    clientId: "8f3b6f4c-52ab-4a84-9a6f-5b51a5cce012",
    type: "SENTENCE",
    originalText,
  });
  assert.equal(parsed.originalText, originalText);
});
