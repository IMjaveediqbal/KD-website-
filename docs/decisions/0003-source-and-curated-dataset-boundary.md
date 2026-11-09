# ADR 0003: Separate source contributions from curated dataset records

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

The current `Contribution` model is the contributor-facing submission and review workflow. It contains original text, normalized text, translations, source details, and status fields. That is a useful intake model, but it must not become the only source of truth for the published Khowar dataset.

A single source submission may support more than one curated record. A curated word or sentence may also be supported by several independent submissions, dictionary references, or recordings. Curated content can change after expert review while the original submission and the reason for each change must remain traceable.

Updating a submitted contribution in place would erase evidence of what the contributor actually supplied. Copying it directly into a public dataset without a distinct curation boundary would also mix intake status with publication status.

## Decision

### 1. Keep contributions as source submissions

- `Contribution` remains the contributor-owned intake record and workflow.
- Preserve `originalText` exactly as submitted. Normalization, transliteration, translation, and editorial corrections are separate values; they must never silently replace the source text.
- A submitted contribution is treated as a stable source snapshot. Corrections after submission create an attributable revision or a new submission version; they do not silently rewrite the original snapshot.
- Existing contribution status continues to represent the review workflow, not whether a record is included in a dataset release.
- Keep existing contribution IDs stable during the transition.

### 2. Create a separate curated-record boundary

Introduce a stable curated-record identity that is independent of a contribution. Use typed domain content for at least:

- **Lexical entries** — headword, normalized search form, script, language, dialect/region where known, and one or more senses.
- **Lexical senses** — meaning-level translations, part of speech, usage notes, and examples where verified.
- **Corpus sentences** — original sentence text, separately normalized text, transliteration, translations, dialect/region, and source context.

A curated record may be supported by multiple contributions and sources. One contribution may support multiple curated records. Represent these relationships explicitly rather than duplicating or overwriting source submissions.

Keep the common record identity small: stable ID, record kind, lifecycle state, and timestamps. Keep word- and sentence-specific fields in their typed domain models. Do not create a generic key/value table for all language content.

### 3. Make curated revisions traceable

- Every accepted editorial change creates a new immutable revision with a revision number, author/reviewer, timestamp, change reason, and links to supporting source material.
- The current curated record is a query-friendly projection of its latest approved revision.
- A revision must retain the exact Khowar source text and distinguish it from normalized or AI-assisted representations.
- Validation decisions and reviewer notes remain attributable to the relevant revision and source contribution.
- Never infer a dialect, region, translation, attribution, or consent value when it is unknown; preserve unknown as unknown.

### 4. Treat provenance and consent as first-class evidence

- Link curated revisions to the contribution(s), dictionary/reference source(s), and/or recording(s) that support them.
- Record source type, description, attribution, licence, and a stable reference where available.
- Audio permission, research permission, and model-training permission are separate purposes. A single profile-level Boolean is not sufficient evidence for the use of a particular recording or submission.
- Record consent scope, policy/version presented, grant time, and any revocation time. A revoked grant must prevent future uses that require that permission; retain the historical consent event for audit.
- Do not make a recording public merely because an upload exists or a contributor has consented to a different purpose.

### 5. Keep audio intake separate from curated audio assets

- Existing `AudioItem` records remain attached to their source contribution during the transition.
- A curated audio asset must be linked to the relevant curated record/revision and its applicable consent evidence.
- Store object keys, checksums, MIME type, duration, processing state, and retention metadata in PostgreSQL; keep the binary object private in object storage.
- Playback remains admin-authorized and uses short-lived signed URLs. Public/research access is a separate release-policy decision.

### 6. Make releases immutable

A future dataset release identifies exact approved record revision IDs and includes a reproducible manifest, schema/version information, creation time, and checksums. Later edits create a new release; they never mutate an already published release.

## Migration and rollout

1. Do not replace or rename the current `Contribution` table.
2. Add curated-record and provenance tables in additive migrations.
3. Keep current contributor and admin screens working while the new domain services are introduced.
4. Backfill only when a human-reviewed mapping exists. Do not assume every historical `VALIDATED` contribution is already a complete canonical lexical or corpus record.
5. Preserve all original IDs and source text. Reconcile counts and foreign-key relationships before any legacy field is retired.
6. Add tests for one-to-many and many-to-many source relationships, immutable revisions, consent-purpose separation, and release reproducibility before enabling public exports.

## Consequences

- Contributors' original submissions remain intact and attributable.
- Curated words, senses, sentences, and audio can evolve without losing source evidence.
- Multiple independent sources can support the same canonical record.
- Search and release generation can use stable, typed curated records instead of interpreting intake workflow fields.
- The schema and services become slightly larger, but the separation prevents data loss and avoids a risky one-table redesign.
