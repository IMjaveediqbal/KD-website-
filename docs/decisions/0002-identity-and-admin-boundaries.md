# ADR 0002: Separate ordinary identity from administration

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

The initial product needs ordinary registration and login for contributors, plus an administrative console. Fine-grained roles are intentionally deferred to keep the first release simple.

The admin console nevertheless contains privileged operations and cannot share the trust assumptions of a public account interface.

## Decision

- All ordinary registered accounts have the same initial product permissions.
- Role-based authorization is deferred; existing role fields are not treated as a security boundary.
- Administration has a separate server-enforced authentication boundary and no public admin registration.
- Every admin API verifies an administrator session server-side.
- Administrative credentials are provisioned out of band and stored as secrets or strong password hashes, never as source-code constants.
- Admin sessions have a shorter lifetime, are revocable, and are isolated from ordinary account sessions.
- Add audit events for privileged actions from the first admin release.

Before production launch, admin authentication must include persistent rate limiting, secure recovery/rotation procedures, CSRF protection, and monitoring for suspicious attempts.

## Consequences

The initial contributor experience stays simple, while the admin area remains protected. Later role-based access can be introduced behind a centralized authorization service without redesigning every route.
