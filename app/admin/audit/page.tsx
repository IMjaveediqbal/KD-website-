import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function AdminAuditPage({ searchParams }: Props) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 80);
  const requestedPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 30;
  const where = query ? {
    OR: [
      { action: { contains: query, mode: "insensitive" as const } },
      { targetType: { contains: query, mode: "insensitive" as const } },
      { targetId: { contains: query, mode: "insensitive" as const } },
      { admin: { email: { contains: query, mode: "insensitive" as const } } },
      { admin: { displayName: { contains: query, mode: "insensitive" as const } } },
    ],
  } : {};

  const total = await prisma.adminAuditLog.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pages);
  const entries = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true, action: true, targetType: true, targetId: true, metadata: true, createdAt: true,
      admin: { select: { email: true, displayName: true } },
    },
  });

  return (
    <main className="pageShell">
      <header className="formHeader">
        <div><div className="sectionLabel">ADMINISTRATION · SECURITY</div><h1>Audit log</h1><p>Searchable history of privileged actions. Entries are read-only from this screen.</p></div>
        <Link href="/admin" className="button buttonGhost">Back to overview</Link>
      </header>
      <form className="datasetFilters" action="/admin/audit">
        <input name="q" defaultValue={query} placeholder="Search action, target, ID, or admin" aria-label="Search audit log" />
        <button className="button" type="submit">Search activity</button>
      </form>
      <div className="reviewMeta"><span>{total.toLocaleString()} audit entries</span><span>Page {page} of {pages}</span></div>
      {entries.length === 0 ? <div className="emptyState">No audit entries match this search.</div> : (
        <div className="reviewList">
          {entries.map((entry) => (
            <article className="reviewCard auditCard" key={entry.id}>
              <div className="reviewMeta"><span>{entry.action.replaceAll("_", " ")}</span><span>{entry.createdAt.toLocaleString()}</span></div>
              <h2>{entry.targetType}{entry.targetId ? ` · ${entry.targetId}` : ""}</h2>
              <p>Administrator: {entry.admin.displayName || entry.admin.email}</p>
              {entry.metadata !== null && <details><summary>Event metadata</summary><pre>{JSON.stringify(entry.metadata, null, 2)}</pre></details>}
            </article>
          ))}
        </div>
      )}
      <nav className="reviewActions" aria-label="Audit log pages">
        {page > 1 && <Link className="button buttonGhost" href={`/admin/audit?q=${encodeURIComponent(query)}&page=${page - 1}`}>Previous</Link>}
        {page < pages && <Link className="button" href={`/admin/audit?q=${encodeURIComponent(query)}&page=${page + 1}`}>Next</Link>}
      </nav>
    </main>
  );
}
