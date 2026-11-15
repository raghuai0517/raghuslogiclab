# Voter Slip Search — source

Builds `../voter-slip-search.html` (one self-contained page).

- `extract.js` — reads AP SEC photo voter slip PDFs with pdf-lib, including `/ActualText` (Telugu conjuncts), and turns each slip into a record.
- `search.js` — Telugu normalisation, English transliteration and sound-alike keys for name search.
- `exporter.js` — Excel workbook (Voters + Summary sheets) with SheetJS.
- `index.src.html` — the page; `/*PDFLIB*/`, `/*XLSX*/`, `/*EXTRACT*/`, `/*SEARCH*/`, `/*EXPORT*/`, `/*DATA*/` are filled in by the build.
- No voter data is bundled. Never commit voter PDFs or extracted JSON to this public repo; the page reads PDFs in the user's browser only.

Rebuild (needs Node.js):

```
cd tools/voter-slip-search-src
npm install --no-save pdf-lib@1.17.1 xlsx@0.18.5
node build.cjs site ../voter-slip-search.html
```

Privacy: this public repo must never hold voter PDFs or data extracted from them (names, EPIC numbers, house numbers).
Users upload their own polling-station PDF; it is read in their browser and kept only in that browser.
