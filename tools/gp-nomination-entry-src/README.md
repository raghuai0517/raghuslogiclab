# GP Nomination Entry — backend source

`Code.gs` is the Google Apps Script project **"GP Nomination Entry backend"** (account raghuslogiclab@gmail.com).
It is deployed as a web app (Execute as: Me · Who has access: Anyone) and its `/exec` URL is `GAS_URL` in
`../gp-nomination-entry.html`. This copy is for reference; edit the project at script.google.com, then
**Deploy → Manage deployments → Edit → Version: New version** so the same URL serves the new code.

- Writes to the Google Sheet **GP Nomination Register – Tada Mandal (Live)**, tab `Nominations` (header row 3, data from row 5).
- `ping` also returns the `GP Master` tab (Gram Panchayats, wards, SEC reservations, voters, Stage-I RO / ARO) so the page can fill the reservation and check eligibility. Officer names and phone numbers live only in that private Sheet, never in this repo.
- The Sheet also has GP Status, Ward Reservations, one tab per Gram Panchayat and one per RO headquarters (HQ1–HQ6); they are formulas over `Nominations`.
- Scans go to the Drive folder `GP Nomination Scans`.
- Script properties: `ACCESS_CODE` (required; `setup()` creates one), `ANTHROPIC_API_KEY` (optional, turns on scan reading).
- `setup()` and `selfTest()` can be run from the editor to check the sheet connection.

No access code, API key or candidate data belongs in this repo.
