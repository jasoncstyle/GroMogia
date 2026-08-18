# Phase 1 — what you add in Vercel

The GroMogia app is already deploying from GitHub. You still need two hosted services so people can sign in and organizations can be stored. Do this in the browser. Do not install Postgres or Clerk on your computer.

Project: **gro-mogia** at [https://vercel.com/dashboard](https://vercel.com/dashboard)

## 1. Add Clerk (sign-in)

1. Open the **gro-mogia** project in Vercel.
2. Go to **Integrations** (or **Marketplace**).
3. Find **Clerk** and add it to this project.
4. Finish Clerk’s screens. Use a development/test instance first.
5. Confirm these names appear under **Settings → Environment Variables**:
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
6. Also add (same values for Production and Preview):
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-up`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` = `/app`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` = `/app`
   - `NEXT_PUBLIC_APP_URL` = `https://gro-mogia.vercel.app`

In the Clerk dashboard, add allowed origins for `https://gro-mogia.vercel.app` and later Preview URLs.

## 2. Add Neon (database)

1. In the same Vercel project, add the **Neon** integration.
2. Create a new project/database for GroMogia (not an Ocean Sailing Adventures database).
3. Confirm `DATABASE_URL` appears in Vercel environment variables.

After merge of Phase 1, we will run database migrations against that URL.

## 3. Redeploy

Vercel usually redeploys when env vars change. If the homepage still says Clerk/Neon are needed, open **Deployments** and click **Redeploy** on the latest one.

## Not yet

Stripe, Resend, custom domain gromogia.com, and the website builder wait for later phases.
