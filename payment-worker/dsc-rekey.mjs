#!/usr/bin/env node
/*
  AP DSC 2026 Exam Hall — change the content key (key rotation).

  Re-encrypts every paid file in tools/ap-dsc-2026/ (app.enc and data/books/*.enc, plus any .txt
  variants) from the OLD key to a NEW key. Run it on your own computer, never in a shared place.

    node payment-worker/dsc-rekey.mjs --new-key                  print a new random key (changes nothing)
    node payment-worker/dsc-rekey.mjs --check OLD_KEY            only test that OLD_KEY opens every file
    node payment-worker/dsc-rekey.mjs OLD_KEY NEW_KEY            re-encrypt every file with NEW_KEY

  Save the new key in WORKER-SETTINGS-PRIVATE.txt BEFORE re-encrypting, so it can never be lost.

  Keys are the same base64 text as the DSC_CONTENT_KEY worker secret. Needs Node.js 18 or newer.
  Nothing is written unless EVERY file opens with OLD_KEY first. Afterwards:
    1. In Cloudflare, set the DSC_CONTENT_KEY secret of the rll-pay worker to the NEW key → Deploy.
    2. Commit and push the changed .enc files (GitHub Desktop) right away.
    3. Save the NEW key in WORKER-SETTINGS-PRIVATE.txt and delete the old one.
  Members may see "could not open" for the minute between steps 1 and 2; a reload fixes it.

  File format (unchanged): 12-byte random IV + AES-256-GCM ciphertext of the gzip-compressed file.
  .txt files hold the same bytes as base64 text.
*/
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const subtle = globalThis.crypto.subtle;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "tools", "ap-dsc-2026");

const args = process.argv.slice(2);
if (args[0] === "--new-key") {
  console.log(Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(32))).toString("base64"));
  process.exit(0);
}
const checkOnly = args[0] === "--check";
if (checkOnly) args.shift();
const [oldB64, givenNew] = args;
if (!oldB64 || (!checkOnly && !givenNew)) {
  console.error("Usage:\n  node payment-worker/dsc-rekey.mjs --new-key\n  node payment-worker/dsc-rekey.mjs --check OLD_KEY\n  node payment-worker/dsc-rekey.mjs OLD_KEY NEW_KEY");
  process.exit(1);
}

const keyOf = (b64, use) => {
  const raw = Buffer.from(String(b64).trim(), "base64");
  if (raw.length !== 32 && raw.length !== 16) throw new Error("A key must be 16 or 32 bytes of base64 (got " + raw.length + " bytes).");
  return subtle.importKey("raw", raw, "AES-GCM", false, [use]);
};

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(enc|txt)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const files = await walk(ROOT);
if (!files.length) { console.error("No .enc/.txt files found in " + ROOT); process.exit(1); }

const oldKey = await keyOf(oldB64, "decrypt");
const plain = new Map();
let bad = 0;
for (const f of files) {
  const isTxt = /\.txt$/i.test(f);
  const raw = await readFile(f);
  const buf = isTxt ? Buffer.from(raw.toString("utf8").trim(), "base64") : raw;
  try {
    const p = await subtle.decrypt({ name: "AES-GCM", iv: buf.subarray(0, 12) }, oldKey, buf.subarray(12));
    plain.set(f, { isTxt, data: new Uint8Array(p) });
  } catch (e) {
    bad++; console.error("  ✗ cannot open " + relative(ROOT, f));
  }
}
if (bad) { console.error(`\n${bad} of ${files.length} files did not open with OLD_KEY. Nothing was changed.`); process.exit(2); }
console.log(`✓ OLD_KEY opens all ${files.length} files.`);
if (checkOnly) process.exit(0);

const newB64 = givenNew;
if (newB64.trim() === oldB64.trim()) { console.error("NEW_KEY is the same as OLD_KEY. Nothing was changed."); process.exit(1); }
const newKey = await keyOf(newB64, "encrypt");
const checkKey = await keyOf(newB64, "decrypt");

for (const [f, { isTxt, data }] of plain) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, newKey, data));
  const out = Buffer.concat([Buffer.from(iv), Buffer.from(ct)]);
  // verify before writing
  const back = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: out.subarray(0, 12) }, checkKey, out.subarray(12)));
  if (back.length !== data.length || !back.every((b, i) => b === data[i])) throw new Error("Verification failed for " + f);
  await writeFile(f, isTxt ? out.toString("base64") : out);
}
console.log(`✓ Re-encrypted ${plain.size} files with NEW_KEY.`);
console.log("Next: set the DSC_CONTENT_KEY secret of the rll-pay worker to NEW_KEY → Deploy, then commit and push these files.");
