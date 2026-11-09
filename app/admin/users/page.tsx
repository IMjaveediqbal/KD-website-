import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import UserStatusAction from "./user-status-action";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 80);
  const requestedPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 25;
  const where = query ? {
    OR: [
      { email: { contains: query, mode: "insensitive" as const } },
      { username: { contains: query, mode: "insensitive" as const } },
      { displayName: { contains: query, mode: "insensitive" as const } },
    ],
  } : {};

  const total = await prisma.user.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pages);
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true, email: true, username: true, displayName: true,
      status: true, createdAt: true, emailVerifiedAt: true,
      _count: { select: { contributions: true } },
    },
  });

  return (
    <main className="pageShell">
      <header className="formHeader">
        <div><div className="sectionLabel">ADMINISTRATION · ACCOUNTS</div><h1>User accounts</h1><p>Browse public accounts and suspend or restore access. Password hashes, session tokens, and private authentication data are never displayed.</p></div>
        <Link href="/admin" className="button buttonGhost">Back to overview</Link>
      </header>
      <form className="datasetFilters" action="/admin/users">
        <input name="q" defaultValue={query} placeholder="Search email, username, or display name" aria-label="Search users" />
        <button className="button" type="submit">Search users</button>
      </form>
      <div className="reviewMeta"><span>{total.toLocaleString()} matching accounts</span><span>Page {page} of {pages}</span></div>
      {users.length === 0 ? <div className="emptyState">No accounts match this search.</div> : (
        <div className="reviewList">
          {users.map((user) => (
            <article className="reviewCard" key={user.id}>
              <div className="reviewMeta"><span>{user.status}</span><span>{user._count.contributions} contributions</span><span>Joined {user.createdAt.toLocaleDateString()}</span><span>{user.emailVerifiedAt ? "Email verified" : "Email not verified"}</span></div>
              <h2>{user.displayName || user.username || "Unnamed user"}</h2>
              <p>{user.email}</p>
              <div className="mutedLine">{user.username ? `@${user.username}` : "No username"} · Account ID: {user.id}</div>
              <UserStatusAction userId={user.id} status={user.status} />
            </article>
          ))}
        </div>
      )}
      <nav className="reviewActions" aria-label="User pages">
        {page > 1 && <Link className="button buttonGhost" href={`/admin/users?q=${encodeURIComponent(query)}&page=${page - 1}`}>Previous</Link>}
        {page < pages && <Link className="button" href={`/admin/users?q=${encodeURIComponent(query)}&page=${page + 1}`}>Next</Link>}
      </nav>
    </main>
  );
}
