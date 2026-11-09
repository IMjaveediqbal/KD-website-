# KDW Implementation Roadmap

The roadmap is ordered to protect data integrity and avoid building disconnected screens.

## Phase 0 — Architecture and engineering foundation

- [x] Confirm modular monolith direction.
- [x] Define domain boundaries and security principles.
- [x] Document the staged target folder structure.
- [ ] Validate environment variables at startup.
- [ ] Establish lint, typecheck, build, and test gates.
- [x] Add an initial core-schema migration and safe fresh/existing-database migration runbook.
- [ ] Add backup/restore runbooks and verified restore drills.

## Phase 1 — Identity and workspace foundation

- [x] Add shared same-origin protection to browser authentication and all current cookie-authenticated mutation endpoints; support dynamic development ports and explicit production origins.
- [x] Normalize email addresses and usernames consistently during registration; handle concurrent duplicate-account attempts safely.
- [x] Keep public account responses independent of internal role metadata; all ordinary accounts begin with the same access.
- [x] Use constant-work password comparison for unknown email addresses and revoke sessions for inactive accounts.
- [x] Keep initial signup simple: email and password, with email verification deferred until an email provider is selected.
- [ ] Add persistent rate limiting and security monitoring for public registration and login before production.
- [ ] Add account recovery and email verification when an email provider is configured.
- [ ] Add server-protected account layouts and consistent loading/error states.
- [x] Keep the user dashboard and contribution API scoped to the signed-in user's own records; show moderation feedback to that contributor.
- [ ] Add unit, integration, and end-to-end coverage for the account lifecycle.

## Phase 2 — Secure administration

- [x] Implement separate admin sign-in and sign-out endpoints and a protected admin shell.
- [x] Add private out-of-band admin provisioning; no public admin registration.
- [x] Add server-side admin session verification and revocation.
- [ ] Add persistent rate limiting and security monitoring for all privileged endpoints before production.
- [x] Build an admin overview using live database counts only.
- [x] Add searchable admin user directory with audited suspend/restore actions and session revocation.
- [x] Add a protected contribution review queue with validate, return-for-correction, reject, and duplicate decisions.
- [x] Record administrator login, moderation, and account-status changes in the admin audit log.
- [x] Show recent administrator activity on the overview and provide a searchable, read-only audit-log browser.
- [x] Provide admin-only audio playback through short-lived signed URLs and audit playback URL issuance.

## Phase 3 — Dataset operations

- [ ] Establish canonical vocabulary, corpus, and audio domain models.
- [ ] Separate original submissions from curated records.
- [ ] Implement draft, submit, review, correction, validation, and archive workflows.
- [ ] Add provenance, licensing, consent, and revision history.
- [ ] Add deduplication and data-quality checks.

## Phase 4 — Search, releases, and research access

- [ ] Add indexed search with dialect/script-aware behavior.
- [ ] Create immutable dataset releases and reproducible exports.
- [ ] Add documented, versioned research API with access controls.
- [ ] Publish dataset documentation, licence, and release notes.

## Phase 5 — Scale and ecosystem

- [ ] Add durable background jobs for audio, exports, and indexing.
- [ ] Add monitoring, alerting, backups, and restore drills.
- [ ] Verify audio object lifecycle, storage CORS, and retention/deletion policy before accepting production recordings.
- [ ] Add advanced roles and scoped permissions when workflows require them.
- [ ] Evaluate mobile/offline synchronization and external integrations.

## Definition of done

A feature is done when its behavior, permissions, data ownership, validation, failure states, tests, and operational impact are documented—not merely when the UI is complete.
