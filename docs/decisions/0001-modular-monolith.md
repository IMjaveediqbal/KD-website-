# ADR 0001: Start with a modular monolith

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

KDW is an early-stage language preservation platform. It needs reliable identity, contributions, review, audio, search, and dataset release workflows, while remaining manageable by a small team.

Starting with microservices would add deployment, networking, observability, and data-consistency overhead before independent scaling needs are known.

## Decision

Use one Next.js application and PostgreSQL database, organized into explicit domain modules with server-only application services and adapters for infrastructure.

Route handlers remain thin. UI components do not contain business rules or direct database access. Cross-module dependencies should point to stable service interfaces.

## Consequences

- Faster development and simpler local setup.
- One deployment and migration workflow initially.
- Clear boundaries make later extraction possible.
- Teams must resist turning the modular monolith into an unstructured collection of shared helpers.
- A module may be extracted only when operational or organizational evidence justifies it.
