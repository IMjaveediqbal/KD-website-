# Curated dataset workflow — initial implementation

This document describes the first server-side domain services and the boundaries that remain intentionally unavailable until their policy checks are implemented.

## Source submissions and curated records

- `Contribution` and `AudioItem` are intake/source records. Keep their IDs and original text stable.
- `CuratedRecord` is a separate canonical identity of kind `LEXICAL_ENTRY` or `CORPUS_SENTENCE`.
- `CuratedRevision` stores a numbered editorial snapshot. Typed content is stored in `LexicalEntryRevision` (with `LexicalSense` rows) or `CorpusSentenceRevision`.
- `ContributionEvidence` links a source submission to a curated revision. A submission may support multiple revisions, and a revision may cite multiple submissions.
- `SourceReference` and `RevisionSourceReference` record dictionaries, publications, archives, attribution, licence, and a locator such as a page or entry number.

## Transactional service contract

Use `lib/curated-records.ts` from server-side application services. Do not call these functions directly from client components.

1. `createCuratedDraft(tx, input)` creates a new stable record and revision 1 in the caller's transaction.
2. `createNextCuratedRevision(tx, input)` creates a new numbered draft for an existing non-archived record. It checks that the content type matches the record kind, validates the minimum content, and takes a PostgreSQL transaction-scoped advisory lock before allocating the next revision number. The unique `(recordId, revisionNumber)` constraint remains the final integrity guard.
3. `approveCuratedRevision(tx, input)` requires the typed content to exist (and a lexical entry to contain at least one sense), sets the approval metadata, updates the record state, and writes the administrator audit event in the same transaction. Re-approval is rejected.

Every caller must wrap these service calls in `prisma.$transaction`. If a transaction fails, its record, revision, state change, and audit event roll back together.

Approved revision content is not edited by these services. Editorial corrections create a new revision; the earlier revision remains available to explain what was approved at that point. Direct database writes should not bypass these services.

## Consent and audio

- `ConsentEvent` stores a purpose, action (`GRANTED` or `REVOKED`), scope, policy version, timestamp, and at least one subject. A revocation is a new event, not an update to the original grant.
- Consent purposes are separate: audio recording, research, model training, and dataset distribution.
- `CuratedAudioAsset` points to an exact curated revision, can point back to its source `AudioItem`, and stores private object metadata (key, MIME type, size, duration, checksum, processing state).
- Binary audio remains in private object storage. Never expose `storageKey` as a public URL. Existing admin playback authorization and short-lived signed URLs remain separate.
- Before research use, model training, or distribution, a future consent-policy service must evaluate the latest applicable events for that exact asset and purpose. Do not infer asset permission from legacy `Profile` booleans.

## Dataset releases

`DatasetRelease` and `DatasetReleaseItem` identify exact curated revision IDs and a schema version. The first schema does not yet provide a public export endpoint or a complete release-publication service. Do not publish or distribute a release until the service verifies that every included revision is approved, all required provenance and consent checks pass, the manifest/checksum are generated, and published snapshots cannot be changed.

## Migration safety

The migrations `20261110000000_curated_dataset_foundation` and `20261110010000_curated_audio_assets` are additive. They do not rename, rewrite, delete, or backfill existing contribution or source-audio rows. Apply them through Prisma Migrate after a verified backup; do not use `prisma db push` as a production migration strategy.
