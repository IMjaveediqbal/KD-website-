# Database migrations and deployment

KDW uses Prisma Migrate to version PostgreSQL schema changes. Never run a schema migration against production until a current backup exists and the target database has been inspected.

## Fresh database

1. Create an empty PostgreSQL database.
2. Configure `DATABASE_URL` in the deployment environment.
3. Install the exact dependencies recorded by the project lockfile.
4. Apply migrations in order:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. Provision the first administrator using the private provisioning procedure in [admin-provisioning.md](admin-provisioning.md).

The repository migrations are ordered so the core application schema is created first, followed by the separate administrator identity tables.

## Existing database created before migration history

Some development databases may have been created with `prisma db push` rather than Prisma Migrate. Do not run `migrate deploy` blindly on such a database.

1. Take and verify a restorable PostgreSQL backup.
2. Inspect the existing database and confirm that its core tables, columns, enum values, indexes, and foreign keys match the schema represented by `20261105000000_initial_schema`.
3. Confirm whether the administrator tables from `20261106000000_admin_identity` already exist and whether that migration is already recorded in `_prisma_migrations`.
4. Only when the core schema is already present and matches the initial migration, mark that baseline as applied:

   ```bash
   npx prisma migrate resolve --applied 20261105000000_initial_schema
   ```

5. Check migration status, then apply any genuinely pending later migrations:

   ```bash
   npx prisma migrate status
   npx prisma migrate deploy
   ```

If any table or column is missing, has a different type, or contains an unexpected enum/index/constraint, stop and prepare a reviewed reconciliation migration. Do not use `migrate resolve` to conceal schema drift. If the admin migration is partially applied, reconcile it manually from a backup before continuing.

## Change workflow

- Update `prisma/schema.prisma` and create a new timestamped migration for every schema change.
- Review the generated SQL before committing it.
- Test migrations against a disposable PostgreSQL database.
- Verify both upgrade and application startup after migration.
- Never edit a migration that has already been applied to a shared or production database; create a follow-up migration instead.

## Backup and restore

A backup/restore runbook and scheduled restore drills are still required before production launch. At minimum, take a database backup before each production migration and verify that the backup can be restored into an isolated database.
