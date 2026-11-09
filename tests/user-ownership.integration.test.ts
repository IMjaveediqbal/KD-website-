import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { ownedContributionWhere } from "../lib/access-policy";

const shouldRun = process.env.RUN_DB_TESTS === "true";

test("database contribution reads remain isolated to the signed-in owner", { skip: !shouldRun }, async () => {
  const suffix = randomUUID();
  let ownerId: string | undefined;
  let otherId: string | undefined;
  const contributionIds: string[] = [];
  try {
    const [owner, other] = await Promise.all([
      prisma.user.create({ data: { email: `owner-${suffix}@example.test` } }),
      prisma.user.create({ data: { email: `other-${suffix}@example.test` } }),
    ]);
    ownerId = owner.id;
    otherId = other.id;
    const [owned, privateItem] = await Promise.all([
      prisma.contribution.create({
        data: { clientId: `owner-${suffix}`, userId: owner.id, type: "WORD", originalText: "Khowar owner data" },
      }),
      prisma.contribution.create({
        data: { clientId: `other-${suffix}`, userId: other.id, type: "WORD", originalText: "Private other-user data" },
      }),
    ]);
    contributionIds.push(owned.id, privateItem.id);

    const ownerItems = await prisma.contribution.findMany({
      where: ownedContributionWhere(owner.id),
      select: { id: true, userId: true },
    });
    assert.deepEqual(ownerItems.map((item) => item.id), [owned.id]);
    assert.ok(ownerItems.every((item) => item.userId === owner.id));

    const crossAccountLookup = await prisma.contribution.findFirst({
      where: ownedContributionWhere(owner.id, privateItem.id),
      select: { id: true },
    });
    assert.equal(crossAccountLookup, null);
  } finally {
    if (contributionIds.length) await prisma.contribution.deleteMany({ where: { id: { in: contributionIds } } });
    if (ownerId) await prisma.user.deleteMany({ where: { id: ownerId } });
    if (otherId) await prisma.user.deleteMany({ where: { id: otherId } });
  }
});
