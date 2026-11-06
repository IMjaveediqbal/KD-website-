import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import AdminLogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <main className="pageShell">
      <header className="dashboardHeader">
        <div>
          <div className="sectionLabel">KHOWAR DATASET · CONTROL CENTER</div>
          <h1>Administration</h1>
          <p>Signed in as {admin.displayName || admin.email}. This is the separate administrator workspace.</p>
        </div>
        <div className="dashboardActions">
          <Link className="button buttonGhost" href="/">View public website</Link>
          <AdminLogoutButton />
        </div>
      </header>

      <section className="dashboardSection">
        <div className="sectionLabel">FOUNDATION STATUS</div>
        <div className="dashboardGrid">
          <article className="dashboardCard">
            <span>Administrator identity</span>
            <strong className="adminStatusText">Protected</strong>
            <small>Separate account and session store</small>
          </article>
          <article className="dashboardCard">
            <span>Session security</span>
            <strong className="adminStatusText">Active</strong>
            <small>HttpOnly, secure-in-production, strict same-site cookie</small>
          </article>
          <article className="dashboardCard">
            <span>Login protection</span>
            <strong className="adminStatusText">Enabled</strong>
            <small>Persistent failed-attempt throttling</small>
          </article>
        </div>
      </section>

      <section className="dashboardSection">
        <div className="sectionHeading"><h2>Administration modules</h2></div>
        <div className="emptyState">
          The secure admin shell is in place. Dataset moderation, account management, review queues, audit-log browsing, and platform settings will be added as separate modules. No sample records or invented statistics are shown here.
        </div>
      </section>
    </main>
  );
}
