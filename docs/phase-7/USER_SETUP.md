# Website builder (Phase 7)

This is optional. It does **not** replace a connected existing website. Ocean Sailing Adventures checkout stays on the sailing site.

The builder works in two layers:

1. **Page editor** — a full-screen view of rows and columns only (the GroovGro sidebar is hidden).
2. **Widget window** — click a box to change its words, link, heading size, or colors, then click **Done**.

**Preview** shows the real page layout while you are signed in. It is **not** live. Visitors only see the page after **Publish**.

## After this is on Production

1. Open https://www.groovgro.com/app and sign in.
2. In the left Work list, open **Website builder** (not **Website**).
3. If you see **Choose a starting layout**, **Template 1** is already selected. Click **Create draft website**, or pick Template 2, 3, or 4 first.
4. Click **Open page editor** at the top when you want to change rows and columns.
5. Click **Add a row**, then pick how many columns you want.
6. On that row, click **Row width**:
   - **Edge to edge** — the row (and a hero photo) go all the way across the screen.
   - **Normal** — the usual boxed page width.
   - **Wide** or **Narrow** if you want more or less of the screen without hitting the edges.
7. In a dashed cell, click **Add widget** and pick a type. Click the new box to edit it.
8. In the edit window you can:
   - Change the words.
   - Set **Heading size** (Heading 1, Heading 2, Heading 3, or standard text).
   - On a Text widget, add **Link text** and **Link address**.
   - Click **Upload a photo** to choose a file from your computer (jpg, png, gif, or webp). Or pick a photo already in GroovGro. Or paste a public https:// link. Pasted links are fetched by GroovGro so other sites cannot block them.
9. Click **Done**.
10. **Page colors** (in the editor bar, or on the overview) sets colors for the whole page. Use the **color wheel**, type a **hex code** (with or without #), or pick a swatch. Leave **Use this page background on every row** on so Preview matches. If you pick a light page, keep dark **Page text** and **Headings**. **Row color** is only for one row that should be different — it has the same wheel, hex, and swatches.
11. The top of Website builder shows which page you are editing (Home, or an extra page) and **Using Template 1** (or 2, 3, 4, or Blank). Every template starts **white with dark grey text**.
12. Click **Preview** to see that page as visitors would, with a yellow bar that says it is not live. Close that tab when you are done.
13. Click **Publish** when you are ready. Then **Open page** is the live GroovGro address for that page. Confirm https://www.oceansailingadventures.com/ is unchanged.

To switch the layout of the page you are editing, open **Start from a different template**, pick Template 1–4, and click **Use this template**. That replaces that GroovGro page and its page colors only.

If the draft is still dark from an older Template 1: open **Page colors**, pick White background and Dark grey text/headings, leave **Use this page background on every row** on, and click **Save colors**. Or apply Template 1 again.

## Extra pages

1. On Website builder, open the **Pages** card.
2. Under **Add a page**, type a **Page name** (for example About).
3. Check the **Address**. GroovGro fills this from the name (about). You can change it. This becomes `https://www.groovgro.com/w/your-org/about`.
4. Pick **Blank page** (one empty row) or Template 1–4.
5. Click **Add a page**. It starts as a **draft**.
6. Click **Edit** on that page. Change the title, colors, and layout the same way as Home.
7. Click **Preview**, then **Publish** when that page should be live.
8. Visitors see a simple list of published pages at the top (Home plus any other published pages).
9. To delete an extra page: **Unpublish** if it is live, then click **Remove**. Home cannot be deleted. **Unpublish** hides Home.

Extra GroovGro pages do not create pages on a connected existing website. Custom domains are a later slice.

## Widgets in this slice

Already there: Hero, Text, Call to action, Lead form, Image + text, Features, Testimonials, FAQ, Contact.

Added: Button, Image, Video (YouTube or Vimeo link), Image grid, Map (address), Pricing, Hours, Countdown, Social links, Call or message (phone / WhatsApp).

Not in this slice (need extra accounts or are easy to misuse): Instagram/Facebook feeds, Google Reviews, AI chatbot, popups, calculators.

## Check SEO for the GroovGro website

1. Open **GROW → SEO**.
2. Under **GroovGro website**, click **Check all GroovGro pages**, or **Check this page** on Home or About.
3. Click **Show check** on a page to see that page’s score and details.
4. Click **Draft improvements** on that page.
5. Approve a **Page title**, **Meta description**, or **Main heading** draft.
6. In **Earlier decisions**, click **Apply to Home** (or Apply to About).
7. Open **Website builder**, click **Edit** on that page, then **Preview**. Confirm only that GroovGro page changed. Confirm https://www.oceansailingadventures.com/ is unchanged.

The connected homepage check is still there if you have an existing public site. GroovGro does not write robots.txt or sitemap.xml on groovgro.com.

**Unpublish** hides the GroovGro page only. It does not change the connected website or Stripe.

## Upload photos (Vercel Blob)

Do this once if **Upload a photo** says Blob is not on yet. Do not paste the token into chat. Do not change Stripe keys.

1. Open https://vercel.com and the **gro-mogia** project.
2. Open **Storage**.
3. Click **Create Database** and choose **Blob**.
4. Name it `groovgro-media`.
5. Connect it to **Production** and **Preview**. Vercel adds `BLOB_READ_WRITE_TOKEN` for you.
6. Open **Deployments**, open the latest Production deployment, click **Redeploy**.
7. Turn **Use existing Build Cache** off.
8. Redeploy. Wait until it is **Ready**.

Then:

1. Open https://www.groovgro.com/app and sign in.
2. Open **Website builder** → **Open page editor** → click a Hero, Image, or Image + text widget.
3. Click **Upload a photo** and choose a file. Click **Done**.
4. Or open **Media library** in Settings, upload there, then pick that photo in the widget.
5. Click **Preview**. Confirm the photo shows. Confirm https://www.oceansailingadventures.com/ is unchanged.

Custom domains are a later slice.
