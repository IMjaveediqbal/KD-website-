# Administrator provisioning and operations

Administrator accounts are intentionally separate from public contributor accounts. There is no public administrator registration endpoint and changing a public user's `role` does not grant access to the administrator workspace.

## First-time setup

1. Configure `DATABASE_URL` and `AUTH_SECRET` (a cryptographically random secret of at least 32 bytes). For local development, copy `.env.example` to `.env`; leave `APP_BASE_URL` and `APP_ALLOWED_ORIGINS` empty unless you specifically need an additional trusted origin. Never commit `.env`.

   Local development automatically checks the browser Origin against the actual request origin, including the active port. You can run Next.js on a different port (for example, with `npm run dev -- --port 3100`) without editing origin configuration.

   In production, set `APP_BASE_URL` to the exact public origin (scheme, hostname, and optional port), such as `https://dataset.example.org`. If the same deployment must accept additional preview or alternate origins, list each exact origin in `APP_ALLOWED_ORIGINS`, separated by commas. Do not use wildcards.
2. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   npx prisma generate
   ```

3. Apply the committed database migration:

   ```bash
   npx prisma migrate deploy
   ```

4. Provision the first administrator from a trusted operator terminal. Do not put the password in source control, a shell history, or a committed environment file.

   macOS/Linux:

   ```bash
   export ADMIN_EMAIL="admin@example.org"
   read -s -p "Administrator password: " ADMIN_PASSWORD; echo
   export ADMIN_PASSWORD
   npm run admin:create
   unset ADMIN_EMAIL ADMIN_PASSWORD
   ```

   Windows PowerShell:

   ```powershell
   $env:ADMIN_EMAIL = "admin@example.org"
   $secure = Read-Host "Administrator password" -AsSecureString
   $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
   $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
   npm run admin:create
   Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
   [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
   ```

   The password must be 14–128 characters. The provisioning command refuses to overwrite an existing administrator account.

5. Visit `/admin/login`. Never expose the provisioning command as a public web endpoint.

## Security behavior

- Admin identities, sessions, and audit events use dedicated database tables.
- Admin sessions use a random opaque token; only its SHA-256 hash is stored in the database.
- The browser cookie is HttpOnly, SameSite=Strict, expires after eight hours, and is Secure in production.
- Disabled administrators and revoked or expired sessions are rejected server-side.
- Failed attempts are throttled persistently by a keyed email-and-client-address identifier.
- Admin login and logout require a trusted request Origin. In development, the expected origin follows the actual request host and port. In production, `APP_BASE_URL` and/or comma-separated `APP_ALLOWED_ORIGINS` must explicitly list exact trusted origins; an arbitrary Host or forwarded-host header is never used to expand the allow-list. Configure the hosting proxy to set trusted client-address headers.
- Login and logout events are written to the administrator audit log.
- Every future admin API must authenticate with `getCurrentAdmin()` / `requireAdmin()`; hiding a link or protecting only a page is not authorization.

## Production hardening still required

Before public production launch, add edge-level rate limiting/WAF rules, MFA or passkeys, an audited password-rotation and recovery procedure, alerting for repeated failures, and automated security tests. Do not rely on application-level throttling as the only defense against distributed attacks.
