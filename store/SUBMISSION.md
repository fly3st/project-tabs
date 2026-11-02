# Publishing Project Tabs to the Chrome Web Store

About 30 minutes of clicking, then Google's review (usually a few days). Everything you need to paste is in [listing.md](listing.md).

## What you need

- `project-tabs-1.2.1.zip`, attached in the project thread.
- The images in `store/screenshots/` and `store/promo/`.
- A Google account with 2-Step Verification turned on.
- $5 for the one-time registration fee.

## 0. Test the exact build (2 minutes)

Unzip the zip into a new folder, load that folder with **Load unpacked** in `chrome://extensions`, and click through the panel once. This is exactly what reviewers will run. Remove that copy afterwards so you don't have two Project Tabs installed.

## 1. Register as a Chrome Web Store developer

1. Go to the Developer Dashboard: https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account that should own the extension. You can't move an extension to another account later, so pick the one you want long term.
3. Accept the developer agreement and pay the **$5 one-time fee**.
4. In **Account**:
   - Set a **Publisher name** (shown on the listing, e.g. your name).
   - Add and **verify your contact email**. You can't publish until it's verified.
   - Answer the **trader / non-trader** question. If this is a personal, non-commercial project, choose **non-trader**. Traders have to publish an address and phone number in the EU.

## 2. Privacy policy link

The repository is public, so the policy is already online. Use this as the privacy policy URL:

```
https://github.com/fly3st/project-tabs/blob/main/PRIVACY.md
```

Open it in a private window first to check it loads without signing in. If you ever make the repo private again, the link stops working; move the policy to a public gist or another public page then.

## 3. Upload the package

1. In the dashboard, click **+ New item**.
2. Drop in `project-tabs-1.2.1.zip`.
3. The dashboard opens a draft of the new item. Its name, summary, icon and version come from the zip.

## 4. Store listing tab

Copy each field from [listing.md](listing.md) → *Store listing tab*:

1. **Description**: paste the description block.
2. **Category**: Productivity → Workflow & Planning. **Language**: English.
3. **Store icon**: upload `icons/128.png`.
4. **Screenshots**: upload `store/screenshots/1-overview.png` through `5-focus.png`, in that order. The first one is the one people see first.
5. **Small promo tile**: `store/promo/small-tile-440x280.png`. Optional, but without it the extension is shown less prominently.
6. **Marquee promo tile**: `store/promo/marquee-1400x560.png`. Optional; needed only to be eligible for the big featured banner.
7. Homepage and support URLs are optional. Leave them empty if you don't have a public page.
8. Click **Save draft**.

## 5. Privacy tab

From [listing.md](listing.md) → *Privacy tab*:

1. **Single purpose**: paste the sentence.
2. **Permission justification**: one box per permission (`tabs`, `tabGroups`, `storage`, `sidePanel`, `favicon`, `sessions`). Paste each block.
3. **Remote code**: *No, I am not using remote code.*
4. **Data usage**: tick **Web history** only, then tick all three certifications.
5. **Privacy policy URL**: the link from step 2.
6. **Save draft**.

## 6. Distribution tab

- Payments: **Free of charge**
- Visibility: **Public** (or **Unlisted** for a quiet start; anyone with the link can install it)
- Regions: **All regions**
- **Save draft**.

## 7. Submit

1. Click **Submit for review** (top right). If the button is greyed out, the dashboard lists what's still missing.
2. In the dialog you can untick *Publish automatically after review* if you want to choose the moment yourself. Then you get a **Publish** button once it's approved, valid for 30 days.
3. Google emails your contact address when the review finishes. First submissions are often approved within a few days, but can take a couple of weeks.

## After it's live

- Copy the listing link and replace "coming soon" in the README's *Install* section.
- Install it from the store and remove your unpacked copy. The store version is a separate extension with its own storage, so **export a backup from the unpacked version first** and import it into the store version.

## Publishing an update later

1. Bump `"version"` in `manifest.json` (it must be higher than the live one).
2. Zip the runtime files: `manifest.json`, `background.js`, `sidepanel.html`, `sidepanel.css`, `sidepanel.js` and the `icons/` folder (or ask Claude, who keeps the packaging script in your private project files).
3. Dashboard → Project Tabs → **Package** → **Upload new package**, then **Submit for review**.
4. If you add a permission, add its justification on the Privacy tab too. New permissions show users a warning and may disable the extension until they accept.

## If it's rejected

The email names the policy and usually the fix. The usual causes are a permission that isn't justified or isn't used (all six are used and justified here), a description that doesn't match what the extension does, or a privacy policy link that isn't publicly reachable. Fix it, upload again if needed, and resubmit.
