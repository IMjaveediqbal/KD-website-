# KDW Implementation Roadmap

The roadmap is ordered to protect data integrity and avoid building disconnected screens.

## Phase 0 — Architecture and engineering foundation

- [x] Confirm modular monolith direction.
- [x] Define domain boundaries and security principles.
- [x] Document the staged target folder structure.
- [ ] Validate environment variables at startup.
- [ ] Establish lint, typecheck, build, and test gates.
- [ ] Add migration and backup/restore runbooks.

## Phase 1 — Identity and workspace foundation

- [ ] Review and harden existing registration, login, logout, and session flows.
- [ ] Add account recovery and email verification when an email provider is configured.
- [ ] Add server-protected account layouts and consistent loading/error states.
- [ ] Keep the user dashboard focused on the signed-in user's own records.
- [ ] Add end-to-end coverage for account lifecycle.

## Phase 2 — Secure administration

- [ ] Implement separate admin sign-in and sign-out.
- [ ] Provision the first admin out of band; no public admin registration.
- [ ] Add server-side admin session verification and revocation.
- [ ] Add persistent rate limiting and security monitoring before production.
- [ ] Build an admin overview using real database counts only.
- [ ] Add audit logging for all privileged actions.

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
- [ ] Add advanced roles and scoped permissions when workflows require them.
- [ ] Evaluate mobile/offline synchronization and external integrations.

## Definition of done

A feature is done when its behavior, permissions, data ownership, validation, failure states, tests, and operational impact are documented—not merely when the UI is complete.
