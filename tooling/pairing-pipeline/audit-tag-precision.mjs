#!/usr/bin/env node
// tooling/pairing-pipeline/audit-tag-precision.mjs
//
// Precision audit for the context-vocab title classifier. Streams every corpus title,
// classifies it with the SAME loadTitleClassifier the mining/merge/client stack uses,
// and reports — per tag, per keyword — the most frequent distinct titles that keyword
// matched. False positives ("Chicken Pot Pie" under desserts via bare "pie") show up
// immediately at the top of the offending keyword's list.
//
// Usage:
//   node audit-tag-precision.mjs --input <recipes.csv> [--limit <n>] [--top <n>]
// Output:
//   output/tag-precision-report.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeGetArg, parseCsv, loadTitleClassifier } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = makeGetArg(args);
const INPUT = getArg('input');
const LIMIT = getArg('limit') ? Number(getArg('limit')) : Infinity;
const TOP = Number(getArg('top', '25'));

if (!INPUT) {
  console.error('Error: --input <recipes.csv> is required.');
  process.exit(1);
}

const { DISH, CUISINE, vocab } = loadTitleClassifier();

// Per-keyword regexes (same construction as the classifier's per-tag alternation, but
// one keyword at a time so a match attributes to the keyword that caused it).
// "!"-prefixed entries are the tag's exclusions: positive keyword rows only count when
// no exclusion matches (mirroring the classifier), and each exclusion gets its own row
// counting what it suppressed — so both precision and exclusion collateral are visible.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const kwRe = (kw) => new RegExp(`(?:^|[^a-z])(?:${esc(kw)})(?:e?s)?(?=[^a-z]|$)`);
const buildKeywordTable = (group) => {
  const table = []; // { tag, kw, re, negRe, isExclusion, count, titles: Map(title -> n) }
  for (const [tag, entries] of Object.entries(group)) {
    const neg = entries.filter((k) => k.startsWith('!')).map((k) => k.slice(1));
    const negAlt = neg.length
      ? new RegExp(`(?:^|[^a-z])(?:${neg.map(esc).join('|')})(?:e?s)?(?=[^a-z]|$)`)
      : null;
    for (const kw of entries) {
      if (kw.startsWith('!')) {
        table.push({ tag, kw, re: kwRe(kw.slice(1)), negRe: null, isExclusion: true, count: 0, titles: new Map() });
      } else {
        table.push({ tag, kw, re: kwRe(kw), negRe: negAlt, isExclusion: false, count: 0, titles: new Map() });
      }
    }
  }
  return table;
};
const tables = [
  ['dish', buildKeywordTable(vocab.dishTypes)],
  ['cuisine', buildKeywordTable(vocab.cuisines)],
];

// Capped per-keyword title sketch (space-saving eviction) — high-frequency titles
// enter early so the top ranks are exact in practice.
const CAP = 4000;
const bump = (map, t) => {
  if (map.has(t)) { map.set(t, map.get(t) + 1); return; }
  if (map.size < CAP) { map.set(t, 1); return; }
  let minK = null; let minV = Infinity;
  for (const [k, v] of map) if (v < minV) { minK = k; minV = v; }
  map.delete(minK);
  map.set(t, minV + 1);
};

let header = null;
let tIdx = -1;
let read = 0;
console.error(`Auditing titles from ${INPUT}...`);
for await (const row of parseCsv(INPUT)) {
  if (!header) {
    header = row.map((h) => h.trim());
    tIdx = header.indexOf('title');
    continue;
  }
  if (read >= LIMIT) break;
  read++;
  if (read % 250000 === 0) console.error(`  ...${read} titles`);
  const raw = (row[tIdx] || '').replace(/\s+/g, ' ').trim();
  if (!raw) continue;
  const lower = raw.toLowerCase();
  for (const [, table] of tables) {
    for (const entry of table) {
      if (!entry.re.test(lower)) continue;
      // Positive rows honor the tag's exclusions; exclusion rows count their own hits.
      if (entry.negRe && entry.negRe.test(lower)) continue;
      entry.count++;
      bump(entry.titles, raw);
    }
  }
}
console.error(`Read ${read} titles.`);

let report = `# Tag-precision audit (${read} titles)\n\n`;
report += `Per keyword: total title matches, then the ${TOP} most frequent distinct titles.\n`;
report += `Scan each list for titles that do NOT belong under the tag.\n\n`;
for (const [groupName, table] of tables) {
  report += `\n## ${groupName}\n`;
  // Group rows by tag, keywords in vocab order.
  const byTag = new Map();
  for (const e of table) {
    if (!byTag.has(e.tag)) byTag.set(e.tag, []);
    byTag.get(e.tag).push(e);
  }
  for (const [tag, entries] of byTag) {
    report += `\n### ${tag}\n`;
    for (const e of entries) {
      const top = [...e.titles.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP);
      report += `\n- **"${e.kw}"** — ${e.count} matches\n`;
      for (const [t, c] of top) report += `    - ${c}× ${t}\n`;
    }
  }
}
const outPath = path.join(__dirname, 'output', 'tag-precision-report.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, report);
console.error(`Wrote ${outPath}`);
