import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, ContributionStatus } from "@prisma/client";
import ModerationActions from "./moderation-actions";
import AdminAudioPlayer from "./audio-player";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ status?: string; page?: string }> };
const reviewableStatuses: ContributionStatus[] = ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"];
const allowedFilters: Array<ContributionStatus | "REVIEW" | "ALL"> = ["REVIEW", "ALL", "DRAFT", "QUEUED", "SUBMITTED", "UNDER_REVIEW", "NEEDS_CORRECTION", "EXPERT_REVIEW", "VALIDATED", "REJECTED", "DUPLICATE", "ARCHIVED", "REVISION_PENDING"];

export default async function AdminContributionsPage({ searchParams }: Props) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const params = await searchParams;
  const rawStatus = params.status || "REVIEW";
  const requestedStatus = allowedFilters.includes(rawStatus as ContributionStatus | "REVIEW" | "ALL") ? rawStatus as ContributionStatus | "REVIEW" | "ALL" : "REVIEW";
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 15;
  const where: Prisma.ContributionWhereInput = requestedStatus === "ALL" ? {} : requestedStatus === "REVIEW"
    ? { status: { in: reviewableStatuses } }
    : { status: requestedStatus };

  const [total, items] = await Promise.all([
    prisma.contribution.count({ where }),
    prisma.contribution.findMany({
      where,
      orderBy: [{ submittedAt: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, type: true, status: true, title: true, originalText: true,
        normalizedText: true, englishTranslation: true, urduTranslation: true,
        dialect: true, region: true, sourceType: true, sourceDescription: true,
        license: true, aiAssisted: true, submittedAt: true, createdAt: true,
        user: { select: { id: true, email: true, username: true, displayName: true } },
        audioItems: { select: { id: true, mimeType: true, durationSeconds: true, storageStatus: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="pageShell">
      <header className="formHeader">
        <div><div className="sectionLabel">ADMINISTRATION · DATASET MODERATION</div><h1>Contributions</h1><p>Review submitted records. Decisions are saved with an administrator audit entry.</p></div>
        <Link href="/admin" className="button buttonGhost">Back to overview</Link>
      </header>
      <nav className="reviewActions" aria-label="Contribution status filter">
        {["REVIEW", "ALL", "VALIDATED", "NEEDS_CORRECTION", "REJECTED", "DUPLICATE"].map((status) => (
          <Link key={status} className={`button ${requestedStatus === status ? "" : "buttonGhost"}`} href={`/admin/contributions?status=${status}`}>{status === "REVIEW" ? "Awaiting review" : status.replaceAll("_", " ")}</Link>
        ))}
      </nav>
      <div className="reviewMeta"><span>{total.toLocaleString()} records</span><span>Page {page} of {pages}</span></div>
      {items.length === 0 ? <div className="emptyState">No contribution records in this view.</div> : (
        <div className="reviewList">
          {items.map((item) => (
            <article className="reviewCard" key={item.id}>
              <div className="reviewMeta"><span>{item.status.replaceAll("_", " ")}</span><span>{item.type}</span><span>Submitted {item.submittedAt ? item.submittedAt.toLocaleString() : "not submitted"}</span></div>
              <h2>{item.title || "Untitled contribution"}</h2>
              <p className="khowarText">{item.originalText || "No original text supplied."}</p>
              {item.normalizedText && <p><b>Normalized:</b> {item.normalizedText}</p>}
              {item.englishTranslation && <p><b>English:</b> {item.englishTranslation}</p>}
              {item.urduTranslation && <p><b>Urdu:</b> {item.urduTranslation}</p>}
              <div className="reviewMeta"><span>Contributor: {item.user.displayName || item.user.username || item.user.email}</span><span>{item.dialect || "Dialect not specified"}</span><span>{item.region || "Region not specified"}</span></div>
              <div className="reviewMeta"><span>Source: {item.sourceType || "Not specified"}</span><span>License: {item.license || "Not specified"}</span><span>AI assisted: {item.aiAssisted ? "Yes" : "No"}</span></div>
              {item.audioItems.length > 0 && <div className="adminAudioList">{item.audioItems.map((audio) => <div key={audio.id}><AdminAudioPlayer audioId={audio.id} mimeType={audio.mimeType} storageStatus={audio.storageStatus} /><span className="mutedLine">{audio.durationSeconds ?? "Duration not supplied"} sec · Audio ID: {audio.id}</span></div>)}</div>}
              {reviewableStatuses.some((status) => status === item.status) && <ModerationActions id={item.id} currentStatus={item.status} />}
            </article>
          ))}
        </div>
      )}
      <nav className="reviewActions" aria-label="Contribution pages">
        {page > 1 && <Link className="button buttonGhost" href={`/admin/contributions?status=${requestedStatus}&page=${page - 1}`}>Previous</Link>}
        {page < pages && <Link className="button" href={`/admin/contributions?status=${requestedStatus}&page=${page + 1}`}>Next</Link>}
      </nav>
    </main>
  );
}
