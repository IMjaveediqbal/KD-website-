# KDW Platform Architecture

**Status:** Baseline architecture  
**Applies to:** KD Website (KDW)  
**Principle:** Build a dependable language-data platform first; add complexity only when real needs justify it.

## 1. Product boundaries

KDW has three user-facing surfaces:

1. **Public website** — project information, dataset discovery, public releases, and contribution entry points.
2. **Account workspace** — ordinary registration, login, profile, personal contributions, and contribution history.
3. **Admin workspace** — a separately protected operational console for platform administration and dataset operations.

The account and admin workspaces are separate experiences. A normal account must never gain administrative access merely by changing a URL or submitting a client-side value.

For the first release, ordinary accounts have the same capabilities. Fine-grained contributor, validator, researcher, expert, and administrator roles are a later authorization feature. The existing Prisma role enum is dormant compatibility scaffolding; it is not an authorization policy.

## 2. Architecture style

Use a **modular monolith** with explicit domain boundaries.

- One deployable Next.js application initially.
- Domain logic lives in server-only modules, not inside page components or route handlers.
- Route handlers validate input, authenticate the caller, invoke an application service, and translate results into HTTP responses.
- Prisma is accessed through repositories/data-access modules rather than scattered through UI components.
- External services (object storage, email, analytics, future queues) are behind adapters.
- Modules communicate through documented service interfaces and domain events where useful.

Do not split into microservices until independent scaling, deployment, or team ownership creates a measurable need.

## 3. Proposed code organization

```text
app/
  (public)/                 Public pages
  (account)/                Login, registration, account workspace
  admin/                    Separate admin interface
  api/
    auth/                   Account authentication endpoints
    admin/                  Admin-only endpoints
    v1/                     Stable public/research API (when introduced)
components/
  ui/                       Reusable design-system primitives
  layout/                   Navigation, shells, responsive layouts
  forms/                    Shared form components
  features/                 Feature-specific presentation components
modules/
  identity/                 Accounts, sessions, profiles
  administration/           Admin authentication and operations
  contributions/             Submission lifecycle and provenance
  vocabulary/                Words, meanings, lexical relations
  corpus/                    Sentences, translations, text collections
  audio/                     Consent, uploads, metadata, processing
  validation/                Review decisions and validation history
  search/                    Search contracts and indexing adapters
  releases/                  Dataset snapshots and exports
  analytics/                 Operational and dataset metrics
  audit/                     Security and data-change audit events
lib/
  config/                    Validated environment configuration
  db/                        Prisma client and database helpers
  security/                  Shared security primitives
  storage/                   Object-storage adapter
  email/                     Email-provider adapter
  observability/              Logging, tracing, error reporting
prisma/
  schema.prisma
  migrations/
  seed/
docs/
  architecture/
  decisions/
  operations/
  product/
tests/
  unit/
  integration/
  e2e/
```

This is a target organization, not a requirement to move every existing file in one risky change. Migrate incrementally while keeping the application buildable.

## 4. Domain boundaries

| Module | Owns | Must not own |
|---|---|---|
| Identity | Account, profile, account sessions | Admin policy |
| Administration | Admin identity/session, admin actions | Ordinary contributor passwords |
| Contributions | Submission, source text, provenance, lifecycle | Public release decisions |
| Vocabulary | Lexical entries and relations | Account authentication |
| Corpus | Sentences, translations, corpus collections | Audio binary storage |
| Audio | Consent, metadata, upload lifecycle | User profile policy |
| Validation | Review assignments, decisions, notes | Rewriting source submissions |
| Search | Search interface and indexing | Source-of-truth records |
| Releases | Immutable dataset snapshots and exports | Editing submitted records |
| Audit | Append-only security and data-change events | Business data ownership |

A contribution may evolve into one or more curated domain records after review. The original submission remains traceable and must not be silently overwritten.

The accepted source-submission/curated-record boundary, revision model, provenance, consent evidence, and additive migration strategy are specified in [ADR 0003](../decisions/0003-source-and-curated-dataset-boundary.md).

## 5. Data integrity and language governance

Every language record should be able to preserve:

- Original text exactly as submitted.
- Normalized text as a separate, revisable representation.
- Script, transliteration, language, dialect, and region when known.
- Source/provenance and attribution.
- Contributor consent and applicable licence.
- AI assistance disclosure where applicable.
- Validation decisions, reviewer notes, and revision history.
- Timestamps and stable identifiers.

Never fabricate production records, contributor counts, validation totals, or audio statistics. Empty states should say that no verified data is available yet.

Audio consent, research consent, and model-training consent are distinct choices. Consent must be explicit, recorded with context and timestamp, and revocable according to the published policy.

## 6. Security boundaries

- Ordinary account authentication and administrator authentication are separate.
- Admin APIs enforce authorization on the server for every request.
- Hiding admin links is not access control.
- Never trust role, user ID, ownership, or permission values supplied by the browser.
- Passwords are stored only as strong password hashes.
- Session cookies are HttpOnly, Secure in production, SameSite=Lax, scoped to the application, and expire.
- Validate all external input with Zod (or a comparable schema).
- Apply request-size limits, rate limits, safe error messages, and security logging.
- Secrets are environment-managed and never committed.
- Use least-privilege database and storage credentials.
- Keep private audio objects private; expose short-lived signed URLs only after authorization.
- Add CSRF protections appropriate to cookie-authenticated state-changing endpoints.
- Keep an auditable record of privileged actions and sensitive data changes.

The first admin bootstrap must be explicit and documented. Never expose a public admin registration route or rely on a client-side "isAdmin" flag.

## 7. API and compatibility

- Internal UI calls use server-side application services where possible.
- External/research integrations will use a versioned API namespace such as `/api/v1`.
- Use stable IDs, pagination, explicit response schemas, and predictable error formats.
- Do not expose internal database models directly as public API contracts.
- Treat schema migrations as reviewed, reversible where practical, and tested against representative data.
- Preserve backward compatibility for released dataset exports.

## 8. Storage and asynchronous work

PostgreSQL is the source of truth for structured metadata. Object storage holds audio and other binary assets. Store object keys and checksums in PostgreSQL, not public permanent URLs.

For the first release, synchronous workflows are acceptable where reliable. Introduce a durable queue for audio processing, large exports, email, and search indexing when those tasks become long-running. Jobs must be idempotent, retryable, observable, and safe to resume.

## 9. Quality gates

Every feature should include the relevant combination of:

- Unit tests for domain rules.
- Integration tests for database and service boundaries.
- API tests for authentication, authorization, validation, and ownership.
- End-to-end tests for registration, login, logout, contribution, and admin workflows.
- Type checking and production build.
- Migration checks and backup/restore verification before production releases.

No feature is complete solely because its page renders.

## 10. Architecture evolution

Keep the modular monolith until there is evidence for a separate service. Candidate future extraction boundaries are audio processing, search/indexing, and large dataset exports. These can become workers without changing the contributor-facing product contract.
