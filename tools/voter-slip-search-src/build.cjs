const fs=require('fs');
let h=fs.readFileSync('index.src.html','utf8');
const data=JSON.parse(fs.readFileSync('ps16.json','utf8'));
const rep={'/*PDFLIB*/':fs.readFileSync('node_modules/pdf-lib/dist/pdf-lib.min.js','utf8'),
'/*XLSX*/':fs.readFileSync('node_modules/xlsx/dist/xlsx.mini.min.js','utf8'),
'/*EXTRACT*/':fs.readFileSync('extract.js','utf8'),'/*SEARCH*/':fs.readFileSync('search.js','utf8'),
'/*EXPORT*/':fs.readFileSync('exporter.js','utf8'),'/*DATA*/':JSON.stringify(data).replace(/</g,'\\u003c')};
for(const [k,v] of Object.entries(rep)){ if(/<\/script/i.test(v)) throw k; h=h.split(k).join(v);}
h=h.split('\uFFFD').join('\\uFFFD');
const site=process.argv[2]==='site';
if(site){
  h=h.replace('<!--SITE-HEAD-->','<meta name="description" content="Free tool: search AP SEC MPTC/ZPTC photo voter slip PDFs by Telugu or English name, EPIC number, serial number or house number, and download an Excel list. Upload any polling station PDF.">\n<meta name="robots" content="noindex">\n<meta name="rll-track-files" content="type-only"><script defer src="../assets/track.js?v=1"></script>\n')
   .replace('<!--SITE-NAV-->','    <nav class="rll-bar" aria-label="Site"><a href="../index.html"><span class="rll-mark">RL</span>RaghusLogicLab</a><span aria-hidden="true">/</span><a href="../index.html#elections">Local body elections</a></nav>\n')
   .replace('<title>ఓటరు స్లిప్ శోధన · Voter Slip Search</title>','<title>ఓటరు స్లిప్ శోధన · Voter Slip Search · RaghusLogicLab</title>');
} else h=h.replace('<!--SITE-HEAD-->','').replace('<!--SITE-NAV-->','');
const out=site?process.argv[3]:'voter-search.html';
fs.writeFileSync(out,h); console.log(out,'size',h.length);
