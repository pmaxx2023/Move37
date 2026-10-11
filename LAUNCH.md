# Launch plan: $1,000 a month from Ink Trace

## Where things stand

| Part | State |
| --- | --- |
| Store page with the free tool | Built and tested in Chromium on desktop and phone width |
| Ink Trace Full and Pro app files | Built and tested. Built by `tools/build.py` into `dist/` |
| Pricing, terms, privacy and thank-you pages | Written |
| Hosting | GitHub Pages workflow ready. Not live yet. |
| Checkout | Not connected. Buy buttons say "Coming soon" until links are added. |
| Ads | Not started. No money spent. |
| Sales | None yet. |

A working store is not proof that people will buy. Only real traffic and real sales prove that.

## The math

The goal is $1,000 a month in sales.

| Item | Number |
| --- | --- |
| Full price | $19 |
| Pro price | $39 |
| Average order, if 60% buy Full and 40% buy Pro | $27 |
| Orders needed per month | 37, about 1 or 2 a day |
| Visitors needed if 2% of visitors buy | about 1,850 a month |
| Visitors needed if 1% of visitors buy | about 3,700 a month |

The 1% and 2% rates are planning guesses. The first 2 weeks of traffic will give the real rate.

Each ad click is worth what it earns. At 2% buying and a $27 average order, a click earns about $0.54.
Ads pay for themselves only if a click costs less than that.

## Steps to go live

### 1. Put the store online

1. In the GitHub repo, open Settings, then Pages. Set Source to GitHub Actions.
2. Merge the branch `claude/stoic-babbage-8rzdr4` into `main`. The store deploys on its own.
3. The store will be at `https://pmaxx2023.github.io/Move37/`.
4. Optional: buy a domain such as `inktrace.app` or use a Phogold domain. Add it under Settings, then Pages, then Custom domain.

### 2. Set up checkout

Pick one. Shopify is faster if the store at `r6eqv0-1d` can sell these.

**Shopify, using the existing store**

1. Install the free Shopify Digital Downloads app.
2. Make two digital products: "Phogold Ink Trace Full" at $19 and "Phogold Ink Trace Pro" at $39.
3. Attach `dist/Phogold-Ink-Trace-Full.zip` and `dist/Phogold-Ink-Trace-Pro.zip`.
4. Turn off "requires shipping" on both.
5. Copy each variant ID. The checkout link is `https://YOUR-STORE-DOMAIN/cart/VARIANT_ID:1`.

**Lemon Squeezy, a new account**

1. Make two products at $19 and $39 and upload the two zips.
2. Set the redirect after purchase to `https://YOUR-SITE/thanks.html?tier=full` or `?tier=pro`.
3. Copy each product's checkout link.
4. Lemon Squeezy charges 5% plus $0.50 a sale. It also collects and pays sales tax.

### 3. Fill in `site/config.js`

- `checkout.full` and `checkout.pro`: the two checkout links.
- `supportEmail`: the email buyers should write to.
- `googleAdsId` and `conversionLabel`: from Google Ads, step 5.

### 4. Make one test purchase

Buy Full with a real card or a discount code. Check four things:
the checkout opens, the payment goes through, the email arrives, and the zip opens and works.
Refund it after.

### 5. Turn on ad tracking

1. In Google Ads, create two Purchase conversions: "Ink Trace Full" with value $19 and "Ink Trace Pro" with value $39.
2. Put the tag ID and the two labels in `site/config.js`.
3. With Lemon Squeezy, the thank-you page sends the sale to Google Ads.
4. With Shopify, the buyer ends on Shopify's thank-you page. Use the Google and YouTube app in Shopify to send purchases instead.
5. Check that one test purchase shows up in Google Ads before spending.

## Google Ads plan for the $1,400 in credits

Check the credit's terms first. Many Google Ads credits need a set amount of paid spend before they apply.

**Budget:** $40 a day. That is about 35 days of data.

**Campaign:** one Search campaign, United States, sending people to the store page.

**Ad group 1: photo to line art**

- photo to line art
- turn photo into line drawing
- photo to line drawing
- one line drawing from photo
- photo to pen and ink drawing
- photo to sketch

**Ad group 2: makers and sellers**

- photo to svg line art
- line art svg for cricut
- pet portrait line art
- custom line art from photo

**Negative keywords:** tutorial, how to draw, class, course, jobs, procreate, brush.

Use Keyword Planner to check the cost per click before launch. Drop any keyword whose cost per click is above $1.

### Two ads to compare

Each ad has one main hook.

**Ad A, privacy hook**

- Headline 1: Turn a Photo Into Line Art
- Headline 2: Free to Try. No Upload.
- Headline 3: Your Photos Stay Private
- Description 1: Drop in a photo. Get pen and ink, watercolor or one line art right in your browser.
- Description 2: Pay once, no subscription. Full size saves with no mark for $19.

**Ad B, seller hook**

- Headline 1: Line Art From Any Photo
- Headline 2: SVG Line Art for Cricut
- Headline 3: Sell What You Make
- Description 1: Pro adds batch mode, SVG line art and a commercial license. $39, one time.
- Description 2: Try it free in your browser first. Your photos are never uploaded.

Running both ads at once lets Google pick who sees which. That is a rough comparison, not a clean test.

### Stop rules

- If an ad group spends $150 with no sale, pause it.
- If the cost per sale is above $20 after 10 sales, cut the bid or pause.
- If the whole campaign spends $500 with fewer than 5 sales, stop. Fix the page or the offer before spending more.
- Never add money beyond the credits without a new decision.

## Free traffic, every week

Ads alone will not reach 1,850 visitors a month once the credits run out. These channels cost time, not money.

- **Pinterest:** post before-and-after pins. Each one links to the store page. Aim for 5 a week.
- **TikTok and Instagram Reels:** screen-record the one line style drawing itself. It is the most eye-catching style.
- **Reddit and Facebook groups:** Etsy sellers, print on demand, Cricut and pet portrait groups. Share results and answer questions. Follow each group's rules on self-promotion.
- **Etsy:** sell a few finished line-art prints made with Ink Trace. Link to the tool from the shop's About page.

## Weekly scoreboard

Track these every Monday:

| Number | Where it comes from |
| --- | --- |
| Visitors | GitHub Pages has no analytics. Use Google Ads or add a free counter. |
| Photos added | Google Ads event `photo_added` |
| Saves | Google Ads event `save_image` |
| Upgrade clicks | Google Ads event `upgrade_click` |
| Checkouts started | Google Ads event `begin_checkout` |
| Sales and revenue | Shopify or Lemon Squeezy |
| Ad spend and cost per sale | Google Ads |

If visitors try the tool but few save, the tool needs work.
If they save but few buy, the price or the offer needs work.
If few visitors come at all, the traffic needs work.

## Next product: the 3D printer

Proven: custom pet and house line art sells well on Etsy as prints and ornaments.
Better: Ink Trace makes the line art from the customer's photo in seconds, so each order takes little design time.
New: 3D-printed line-art ornaments, wall art and keychains from a customer's photo.

What it takes:

1. Add an outline export that turns each line into a filled shape. Slicers need filled shapes to print. This is a small change to the Pro SVG code.
2. Print 3 test pieces. Weigh each one in the slicer to get the real filament cost.
3. List one product on Etsy, for example a custom pet ornament, with photos of the test prints.

A physical product adds shipping, print time and returns. Start it only after the digital store is live.

## Run record

| Field | Value |
| --- | --- |
| Product | Phogold Ink Trace Full and Pro |
| Prices | $19 and $39, USD, one time |
| Source | `src/`, built by `tools/build.py` |
| Customer files | `dist/Phogold-Ink-Trace-Full.zip`, `dist/Phogold-Ink-Trace-Pro.zip`. Rebuilt each run, so check sizes after each build. |
| Tests done | Six styles, two looks, free 1080 px save with mark, Full and Pro full-size save, Pro batch of 3 photos to a valid zip, Pro SVG export, phone width with no sideways scroll |
| Tests not done | Safari, Firefox, real phones, checkout, payment, email delivery |
| Spend approved | None. The $1,400 in Google credits is not yet in use. |
| Next action | Owner sets up checkout and Pages, then fills in `site/config.js` |
