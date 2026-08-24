# Connect Google Search Console to GroovGro

This is the last Phase 6 step. GroovGro **reads** Search Console. It does **not** edit the website, submit sitemaps, or buy ads.

Do not paste Client IDs, Client secrets, or Google tokens into chat.

## What you need

- The Google account that already sees the connected website in [Google Search Console](https://search.google.com/search-console)
- Access to the **gro-mogia** project on Vercel
- About 15 minutes

If the website is not in Search Console yet:

1. Open https://search.google.com/search-console
2. Click **Add property**.
3. Choose **URL prefix** and paste the same address saved in GroovGro **Website connection** (including `https://`).
4. Finish Google’s verification. Keep that tab until it says the property is yours.

## A. Create a Google Cloud app for GroovGro

1. Open https://console.cloud.google.com and sign in with that same Google account.
2. Top bar: open the project picker (it may say **Select a project**).
3. Click **New project**.
4. Project name: `GroovGro`
5. Click **Create**.
6. Wait, then open the project picker again and click **GroovGro** so the top bar shows that name.

## B. Turn on the Search Console API

1. Left menu (☰) → **APIs & Services** → **Library**.
2. Search box: `Search Console API`
3. Click **Google Search Console API**.
4. Click **Enable**. Wait until it says the API is enabled.

## C. Fill in the OAuth consent screen

Google’s menu may say **OAuth consent screen** or **Google Auth Platform**. Use whichever you see.

1. Left menu → **APIs & Services** → **OAuth consent screen** (or **Google Auth Platform** → **Branding**).
2. User type / Audience: **External**.
3. App name: `GroovGro`
4. User support email: your email.
5. Developer contact email: your email.
6. Save.
7. Open **Scopes** / **Data access**.
8. Add the scope that ends with `webmasters.readonly`. Do **not** add Ads, Analytics, or `webmasters` (the write version).
9. Save.
10. Open **Test users** / **Audience**.
11. Add the Google email that owns Search Console for this website.
12. Save. Keep the app in **Testing**. You do not need Google to “publish” it for your own account.

## D. Create the web client

1. Left menu → **APIs & Services** → **Credentials** (or **Google Auth Platform** → **Clients**).
2. **Create credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `GroovGro web`
5. **Authorized JavaScript origins** — add all three, one per line:
   - `https://www.groovgro.com`
   - `https://groovgro.com`
   - `https://gro-mogia.vercel.app`
6. **Authorized redirect URIs** — add all three, one per line:
   - `https://www.groovgro.com/api/google/callback`
   - `https://groovgro.com/api/google/callback`
   - `https://gro-mogia.vercel.app/api/google/callback`
7. Click **Create**.
8. A popup shows **Client ID** and **Client secret**. Leave it open. Do not paste them into Cursor chat.

## E. Put the two names in Vercel

1. Open https://vercel.com and the **gro-mogia** project.
2. **Settings** → **Environment Variables**.
3. Add `GOOGLE_CLIENT_ID` = the Client ID from the popup. Environments: Production and Preview.
4. Add `GOOGLE_CLIENT_SECRET` = the Client secret from the popup. Environments: Production and Preview.
5. Save. Do not change Stripe keys.
6. **Deployments** → open the latest Production deployment → **Redeploy**.
7. Turn **Use existing Build Cache** off.
8. Redeploy. Wait until it is **Ready**.

## F. Connect it inside GroovGro

1. Open https://www.groovgro.com/app and sign in.
2. Open **GROW → SEO**.
3. In **Google Search Console**, click **Connect Search Console**.
4. Choose the Google account that owns the Search Console property.
5. Allow the read-only permission. GroovGro should not ask for Ads.
6. If GroovGro asks you to pick a property, choose the one that matches the connected website, then click **Use this property**.
7. You should see clicks, impressions, and top queries. That is a copy of Search Console, not a change to the website.

You can also start the same connect from **Next step** or **Integrations** → Google. After Google, GroovGro brings you back to **Next step** to pick the property if it still needs one.

## If something fails

- **Redirect URI mismatch:** In Google Cloud, the redirect URI must match exactly, including `https` and `/api/google/callback`.
- **Access blocked / app is in testing:** Add your Google email as a test user, then try again.
- **No property matched:** The Google account you picked must already have that website in Search Console.
- **Still no numbers:** New properties can take a few days. Click **Refresh Search Console** later.

Disconnect is on the same SEO card. Disconnect revokes Google access for GroovGro. It does not change Search Console itself or the website.

## Apply a draft to a GroovGro page

Search Console stays read-only. If you also have a GroovGro website:

1. Under **GroovGro website**, check Home or an extra page, then draft improvements.
2. Approve a **Page title**, **Meta description**, or **Main heading** draft.
3. In **Earlier decisions**, click **Apply to Home** (or the name of that page).
4. That updates that GroovGro page only. The connected existing website does not change.

