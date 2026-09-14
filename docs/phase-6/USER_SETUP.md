# Connect Google Search Console to GroovGro

**How-to (still used).** Search Console is **IMPLEMENTED** as read-only. Keyword history is stored from those snapshots. AI Visibility owner notes, a query library, history snapshots, and citation-gap estimates can be saved on SEO. A workspace draft can be saved for later CMS review. Lookup and CMS publish adapters stay **off** (master brief §16). This setup does not turn those on.

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
8. Add the scope that ends with `webmasters.readonly`. For GA4, also add `analytics.readonly`. Do **not** add Ads or `webmasters` (the write version).
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
6. **Authorized redirect URIs** — add all of these, one per line:
   - `https://www.groovgro.com/api/google/callback`
   - `https://groovgro.com/api/google/callback`
   - `https://gro-mogia.vercel.app/api/google/callback`
   - `https://www.groovgro.com/api/google-analytics/callback`
   - `https://groovgro.com/api/google-analytics/callback`
   - `https://gro-mogia.vercel.app/api/google-analytics/callback`
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

Keyword history is stored from Search Console. AI Visibility owner notes and a query library can be saved on SEO. Lookup adapters stay **off** (master brief §16). This setup does not turn those on. GroovGro still only **reads** Search Console.

## G. Connect Google Analytics (GA4)

Same Google Cloud app as Search Console. **Separate** connect in GroovGro. Read-only. Ads stay off. Do this **one business at a time**. The Google account must already see that business’s GA4 property.

Do not paste Client IDs, Client secrets, or Google tokens into chat.

### G1. Turn on the two Analytics APIs

1. Open https://console.cloud.google.com and sign in.
2. Top bar: open the project picker and click the **GroovGro** project (the same one used for Search Console).
3. Left menu (☰) → **APIs & Services** → **Library**.
4. Search box: `Google Analytics Admin API`.
5. Click **Google Analytics Admin API** → **Enable**. Wait until it says enabled.
6. Back to **Library**. Search: `Google Analytics Data API`.
7. Click **Google Analytics Data API** → **Enable**. Wait until it says enabled.

### G2. Add the read-only Analytics scope (not Ads)

1. Left menu → **APIs & Services** → **OAuth consent screen** (or **Google Auth Platform** → **Data access**).
2. Open **Scopes** / **Data access**.
3. Add the scope that ends with `analytics.readonly`.
4. Do **not** add Ads, AdWords, or any write Analytics scope.
5. Save.
6. Under **Test users** / **Audience**, make sure the Google email that owns GA4 for this website is listed.

### G3. Add the Analytics callback addresses

1. Left menu → **APIs & Services** → **Credentials** (or **Google Auth Platform** → **Clients**).
2. Open the **GroovGro web** client.
3. **Authorized redirect URIs** — add these if they are missing (exact, including `https`):
   - `https://www.groovgro.com/api/google-analytics/callback`
   - `https://groovgro.com/api/google-analytics/callback`
   - `https://gro-mogia.vercel.app/api/google-analytics/callback`
4. Keep the existing Search Console `/api/google/callback` URIs. Do not remove them.
5. Save.

You do **not** need new Vercel keys. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` stay the same.

### G4. Connect it inside GroovGro

1. Open https://www.groovgro.com/app and sign in.
2. Switch to the **one** business whose GA4 you are connecting.
3. Open **Analytics** (or **Integrations** → Google Analytics).
4. Click **Connect Google Analytics**.
5. Choose the Google account that already sees that business’s GA4 property.
6. Allow the **read-only** permission. GroovGro should not ask for Ads.
7. If GroovGro asks you to pick a property, choose the one for this website, then save.
8. Click **Refresh Analytics** if numbers are not there yet.
9. You should see sessions, landing pages, and sources for about 28 days. That is a copy. GroovGro does not change the website.

Disconnect is on the same card. It does not change Google Analytics itself.

SEOgro does not read this GA4 snapshot yet. Search Console stays the keyword source.

### If something fails

- **Redirect URI mismatch:** the URI must match exactly, including `https` and `/api/google-analytics/callback`.
- **Access blocked / app is in testing:** add your Google email as a test user, then try again.
- **No properties:** that Google account must already have a GA4 property for this website.
- **API not enabled:** both Admin API and Data API must show Enabled on the GroovGro Cloud project.

