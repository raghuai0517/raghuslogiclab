# Voter Slip Search — source

Builds `../voter-slip-search.html` (one self-contained page).

- `extract.js` — reads AP SEC photo voter slip PDFs with pdf-lib, including `/ActualText` (Telugu conjuncts), and turns each slip into a record.
- `search.js` — Telugu normalisation, English transliteration and sound-alike keys for name search.
- `exporter.js` — Excel workbook (Voters + Summary sheets) with SheetJS.
- `index.src.html` — the page; `/*PDFLIB*/`, `/*XLSX*/`, `/*EXTRACT*/`, `/*SEARCH*/`, `/*EXPORT*/`, `/*DATA*/` are filled in by the build.
- `ps16.json` — built-in data for PS 16 (made with `extract.js` from the PS 16 PDF).

Rebuild (needs Node.js):

```
cd tools/voter-slip-search-src
npm install --no-save pdf-lib@1.17.1 xlsx@0.18.5
node build.cjs site ../voter-slip-search.html
```

To change the built-in polling station, regenerate `ps16.json` from a PDF:

```
node -e "const X=require('./extract.js'),P=require('pdf-lib'),fs=require('fs');X.extract(P,fs.readFileSync('PS.pdf')).then(r=>fs.writeFileSync('ps16.json',JSON.stringify(r)))"
```
