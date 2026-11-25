# Kavitha Notebook — backend source

`Code.gs` is the Google Apps Script project **"Kavitha Notebook backend"**. The page
(`../kavitha-notebook/index.html`) works without it: speech-to-text, notes and poems are kept on the phone.
The backend adds Telugu ⇄ English translation, poem writing and a Google Sheet backup that every phone shares.

## Set it up (about 5 minutes, once)

1. Open https://script.google.com → **New project**, name it "Kavitha Notebook backend".
2. Replace the code with `Code.gs` from this folder and save.
3. Choose **setup** in the function menu and press **Run**; allow the permissions it asks for.
   The Execution log prints the **family code** and the link of the new sheet **"Kavitha Notebook – Poems"**.
4. Optional, for real poems instead of line-by-line translation: **Project Settings → Script properties →
   Add** `ANTHROPIC_API_KEY` (from console.anthropic.com; the same key as the GP Nomination backend works).
5. **Deploy → New deployment → Web app**, Execute as: **Me**, Who has access: **Anyone** → Deploy.
   Copy the `/exec` link.
6. On the phone, open https://raghuslogiclab.com/tools/kavitha-notebook/ → **Settings**, paste the link and
   the family code → **Save & test**. Then **Copy setup link for another phone** and send it to Dad:
   opening that link fills in both values on his phone.

After changing `Code.gs`: **Deploy → Manage deployments → Edit → Version: New version**, so the same link serves the new code.

## What it does

- `ping`, `list`, `save`, `delete` — the poems, one row each in tab `Poems` of the sheet (`SHEET_ID` property).
- `translate` — Google Translate through `LanguageApp` (free, no key).
- `compose` — with `ANTHROPIC_API_KEY`: Claude writes the Telugu note, English note, Telugu poem, English poem and titles.
  Without it: the note is translated and laid out one phrase per line for editing.
- Script properties: `ACCESS_CODE` (required, made by `setup()`), `SHEET_ID` (made by `setup()`),
  `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (optional).

No access code, API key, sheet id or poem belongs in this repo. The page keeps the link and code only in the phone's browser.
