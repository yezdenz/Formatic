# Deploy Formatic on Vercel

This repository contains a Next.js website in `apps/web` and a Chrome extension in `apps/extension`. Vercel hosts the website. It does not build or publish the extension.

## Connect the website and database

1. Import the GitHub repository into Vercel as a Next.js project and set **Root Directory** to `apps/web`. Keep the install command at the Vercel default (`npm install` / `npm ci`). `apps/web/vercel.json` runs `npm run vercel-build`.
2. Create a database with the [Prisma Postgres integration on Vercel](https://vercel.com/marketplace/prisma) and connect it to this project. The integration adds `DATABASE_URL` and `POSTGRES_URL` automatically. With another PostgreSQL provider, set these variables manually to its pooled and direct URLs.
3. Set these variables for **Production** before the first successful deployment:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Pooled PostgreSQL URL for application queries. |
   | `POSTGRES_URL` | Direct PostgreSQL URL for the **same database**, for migrations. |
   | `JWT_SECRET` | A random secret with at least 32 characters. |
   | `ADMIN_SECRET_KEY` | A private admin passcode with at least 16 characters. |
   | `NEXT_PUBLIC_APP_URL` | The production HTTPS site origin, such as `https://formatic.vercel.app`. |
   | `EXTENSION_ID` | The Chrome extension ID once it has been loaded or published. It is needed for extension requests, not browser sign-in. |

   Copy the URL values from the database provider. Keep credentials in Vercel environment variables; never commit them or paste them into an issue. `apps/web/.env.example` contains placeholders only. The app expects both database URLs because the Prisma schema uses one for runtime queries and the other for migrations.

4. Deploy or redeploy the Vercel project. Its build runs `prisma migrate deploy`, then generates the Prisma client and builds Next.js. A build fails if the database is unavailable or migrations fail, instead of deploying a site with broken sign-in.
5. Open `/api/status` on the deployed site. `{"signInAvailable":true}` means the app can read the migrated `User` table. Sign in with a new username and passcode. To create the first admin account, use `ADMIN_SECRET_KEY` as the passcode; the first admin account can be named `admin`. Then choose a unique team code, such as `TS31`, and create courses. A fresh database has no team code, courses, or folders.

If you enable **Preview** deployments, connect them to a **separate database or database branch**. The Vercel build runs migrations in every environment that has database variables. Do not point preview builds at the production database.

## Chrome extension

Build `apps/extension` separately with `npm ci && npm run build`, then load `apps/extension/dist` in Chrome or publish it through the Chrome Web Store. Put the deployed HTTPS origin in the extension popup's Hub URL. Set `EXTENSION_ID` in Vercel to the extension ID and redeploy so credentialed extension API requests are allowed.

## Local verification

From `apps/web`, run `npm ci`, `npm run typecheck`, and `npm run build`. With database URLs in a local ignored `.env`, run `npx prisma validate`, `npm run db:deploy`, and check `/api/status`. Running `npx prisma db seed` is optional; it creates only the admin account.
