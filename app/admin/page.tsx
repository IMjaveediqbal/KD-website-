import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import AdminLogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const [users, contributions, awaitingReview, validated, audioItems, recentActivity] = await Promise.all([
    prisma.user.count(),
    prisma.contribution.count(),
    prisma.contribution.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"] } } }),
    prisma.contribution.count({ where: { status: "VALIDATED" } }),
    prisma.audioItem.count(),
    prisma.adminAuditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: { id: true, action: true, targetType: true, targetId: true, createdAt: true, admin: { select: { email: true, displayName: true } } },
    }),
  ]);

  const stats = [
    { label: "Registered users", value: users, detail: "All public accounts" },
    { label: "Contributions", value: contributions, detail: "All contribution records" },
    { label: "Awaiting review", value: awaitingReview, detail: "Submitted and in-review records" },
    { label: "Validated", value: validated, detail: "Approved dataset records" },
    { label: "Audio items", value: audioItems, detail: "Stored audio metadata records" },
  ];

  return (
    <main className="pageShell">
      <header className="dashboardHeader">
        <div>
          <div className="sectionLabel">KHOWAR DATASET · CONTROL CENTER</div>
          <h1>Administration</h1>
          <p>Signed in as {admin.displayName || admin.email}. Private platform management workspace.</p>
        </div>
        <div className="dashboardActions">
          <Link className="button buttonGhost" href="/">View public website</Link>
          <AdminLogoutButton />
        </div>
      </header>

      <section className="dashboardSection">
        <div className="sectionHeading"><h2>Platform overview</h2><span className="mutedLine">Live database totals</span></div>
        <div className="dashboardGrid">
          {stats.map((stat) => (
            <article className="dashboardCard" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value.toLocaleString()}</strong>
              <small>{stat.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboardSection">
        <div className="sectionHeading"><h2>Management modules</h2></div>
        <div className="cards">
          <div><b>Contributions</b><span>Review submitted text and audio records, then approve, return, reject, or mark duplicates.</span><Link className="button buttonSmall" href="/admin/contributions">Open review queue</Link></div>
          <div><b>User accounts</b><span>Browse registered accounts and their account status without exposing password or session secrets.</span><Link className="button buttonSmall" href="/admin/users">Manage users</Link></div>
          <div><b>Audit activity</b><span>Recent administrator actions are recorded for accountability.</span><span className="mutedLine">Recent activity shown below</span></div>
          <div><b>Platform security</b><span>Admin identity and sessions remain separate from contributor authentication.</span><span className="adminStatusText">Protected</span></div>
        </div>
      </section>

      <section className="dashboardSection">
        <div className="sectionHeading"><h2>Recent administrator activity</h2></div>
        {recentActivity.length === 0 ? (
          <div className="emptyState">No administrator actions have been recorded yet.</div>
        ) : (
          <div className="contributionList">
            {recentActivity.map((entry) => (
              <div className="contributionRow" key={entry.id}>
                <div><b>{entry.action.replaceAll("_", " ")}</b><p>{entry.targetType}{entry.targetId ? ` · ${entry.targetId}` : ""} · {entry.admin.displayName || entry.admin.email}</p></div>
                <span className="mutedLine">{entry.createdAt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
