# KD Website

A website-first platform for building, validating, exploring, and contributing to a high-quality Khowar language dataset.

## Vision

KD Website is designed as the web foundation for Khowar language data collection and future Khowar AI research.

### Core areas
- Khowar words and meanings
- Sentences and translations
- Audio contributions
- Dictionary and dataset search
- Community discussion and voting
- Expert validation
- Contributor profiles and progress
- Dataset statistics
- Research/API-ready data architecture

## Product principles
- Native Khowar language preservation
- Accuracy before quantity
- Transparent validation
- Respect for dialect and uncommon/local vocabulary
- Privacy and responsible data licensing
- Mobile-first responsive design
- No fake or mock production data

## Architecture

KDW follows a modular-monolith architecture: one deployable application with clear domain boundaries, server-side application services, and replaceable infrastructure adapters. This keeps the first release maintainable while allowing future capabilities to be added without redesigning the whole platform.

Start here:
- [Platform architecture](docs/architecture/README.md)
- [ADR 0001: Modular monolith](docs/decisions/0001-modular-monolith.md)
- [ADR 0002: Identity and admin boundaries](docs/decisions/0002-identity-and-admin-boundaries.md)
- [Implementation roadmap](docs/product/implementation-roadmap.md)

## Current product direction

- Public website for discovery and project information.
- Ordinary account registration, login, and contributor workspace.
- Separate, server-protected administration workspace.
- Role-based access is intentionally deferred; all ordinary accounts have the same initial permissions.
- Original Khowar submissions and their provenance must remain preserved.
- Production statistics must come from real records, never fabricated sample data.

## Status

Architecture baseline established. Implementation proceeds incrementally, with security, data integrity, tests, and operational readiness treated as part of each feature.
