# G&G App — Setup guide (operator)

VALE — Build 1 of the Ginger & Gleam app
What Shannon gets: one icon on her iPhone with Quote, Clients (home notes + before/after photos), Checklist, Money, Texts, and Setup. Everything she enters lands in the Google Sheet; photos land in Google Drive. Works with no signal and sends when it has one.

Total time: about 40 minutes, once. Cost: $0.

## Files in this folder

- `Code.gs` — the Google Apps Script backend. Goes inside the Sheet.
- `index.html`, `manifest.json`, `apple-touch-icon.png`, `icon-512.png` — the app. Goes on a web host.
- `SETUP.md` — this guide.

## Part A: The Google Sheet and backend (15 min, operator, on a laptop)

1. In Shannon's Google account (or yours, shared with her as editor), create a new Google Sheet named **Ginger & Gleam**.
2. In the Sheet: **Extensions → Apps Script**. Delete the sample code, paste the entire contents of `Code.gs`, and click the save icon.
3. In the function dropdown at the top, choose **setup** and click **Run**. Google will ask you to authorize; choose the account, click Advanced → Go to (project name) → Allow. This creates the tabs (Clients, Quotes, Checklists, Payments, Photos, Pricing, Snippets), fills Pricing with Quill's draft, and makes a Drive folder named **Ginger & Gleam Photos**.
4. **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**. Description: "G&G app". Execute as: **Me**. Who has access: **Anyone**. Click Deploy. Authorize again if asked.
5. Copy the **Web app URL** (ends in `/exec`). Keep it; it goes into the app in Part C.

Notes:
- "Anyone" means anyone with that long URL can write rows to the Sheet. The URL is unguessable; don't post it anywhere public. If it ever leaks, Deploy → Manage deployments → archive it and create a new one.
- Every time you change `Code.gs`, you must Deploy → Manage deployments → edit → New version for the change to go live.
- To change a price: edit the number in the Pricing tab. The app picks it up on its next sync. No code change.
- To change the text snippets: add rows to the Snippets tab (Key, Title, Text). If that tab has rows, the app uses them instead of its built-in set.

## Part B: Hosting the app (10 min)

The app is four static files. Any free static host works. Two good ones:

**GitHub Pages** (recommended; I can do this for you from here if you say the word)
1. Create a public repo named `gg-app`; upload the four files.
2. Settings → Pages → Source: Deploy from a branch → main → / (root). Save.
3. The app is at `https://<username>.github.io/gg-app/`. Takes a minute to go live.

**Netlify Drop**
1. Go to app.netlify.com/drop, sign in (free), drag the folder in.
2. Netlify gives a URL like `https://something.netlify.app`. Rename it in Site settings if you like.

Later, when the website exists, the app can live at `app.gingerandgleam.com` (or whatever the domain is) with one DNS record.

## Part C: Shannon's phone (5 min, Shannon, with you on the phone)

1. Open the app URL in **Safari** (it must be Safari for the home-screen install).
2. Tap the **Setup** tab at the bottom. Paste the Web app URL from Part A into the box. Tap **Save & connect**. The dot in the top corner turns green and says "Synced."
3. Tap the Share button (square with the arrow) → **Add to Home Screen** → Add. The copper seal appears on her home screen.
4. Open it from the home screen from now on. It runs full-screen like an app.
5. Tap **Clients → Add a client** and enter her three current clients with their home notes.

## Part D: Check it worked (5 min)

- In the app, Quote tab: enter a name, tap Save quote. The Quotes tab in the Sheet gets a row within a few seconds.
- Clients → open a client → Take photo → take any picture. In Drive, "Ginger & Gleam Photos / [client name]" gets a file named "[Client] · [date] · Before · Kitchen.jpg", and the Photos tab gets a row with the link.
- Money: add a $1 test payment, see it in the Payments tab, then delete the row in the Sheet.

## How the operator (and Claude) see everything

Everything is in the Sheet and Drive. Share the Sheet and the photo folder with the operator's Google account as editor. When the operator connects Google Drive to the Project, Claude can read the Sheet and the photo list directly.

## What the app does when there's no signal

Every save goes into a queue on the phone and the status dot turns amber with a count. As soon as the phone is online and the app is open, the queue sends. Photos are shrunk on the phone (max 1600 px, roughly 300–500 KB each) before sending, so they go quickly on cellular.

## Known limits of this build

- Data on the phone is a working copy; the Sheet is the record. If Safari data is cleared, the app re-downloads clients, payments, and photo links from the Sheet on the next sync. Checklist progress for the current day is phone-only.
- A photo taken with no signal is held on the phone until the app is opened with signal. Don't clear Safari data with amber items waiting.
- The app can't open the camera on its own; "Take photo" opens the iPhone camera through the standard photo picker. One tap more than a native app, which is the trade-off for $0 and no App Store.
- No login. Anyone with the app URL *and* the Web app URL can add rows. Keep both private.

## What's next (Vale's list, not started)

- Build 2: client "home notes" editable from the detail screen; quote → client in one tap; a weekly "send to operator" summary.
- The website, on the same host and the same brand.
- If Shannon wants in-app camera and a real App Store icon later: Option 1 (native), same backend.

Save this as: APP-SETUP.md
