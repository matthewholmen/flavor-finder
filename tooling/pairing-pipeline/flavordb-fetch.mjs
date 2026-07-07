#!/usr/bin/env node
// tooling/pairing-pipeline/flavordb-fetch.mjs
//
// One-time snapshot of the FlavorDB2 entity dataset (IIIT-Delhi; Garg et al.). Each entity
// is a food with a set of flavor molecules; the pipeline (flavordb.mjs) uses the shared
// molecules between two mapped foods as the "shared aroma compounds" signal.
//
// Downloads every entity JSON into flavordb-data/ (gitignored, like the recipe corpus).
// Idempotent: skips entities already on disk, so re-runs only fill gaps. Run once, then
// point flavordb.mjs at the snapshot.
//
// Usage:
//   node flavordb-fetch.mjs [--max 1000] [--concurrency 8] [--force]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'flavordb-data');

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const MAX_ID = Number(getArg('max', '1000'));
const CONCURRENCY = Number(getArg('concurrency', '8'));
const FORCE = args.includes('--force');

const ENDPOINT = (id) => `https://cosylab.iiitd.edu.in/flavordb2/entities_json?id=${id}`;

fs.mkdirSync(DATA_DIR, { recursive: true });

const fetchEntity = async (id) => {
  const dest = path.join(DATA_DIR, `${id}.json`);
  if (!FORCE && fs.existsSync(dest)) return 'skip';
  try {
    const res = await fetch(ENDPOINT(id), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    if (res.status === 404) return '404';
    if (!res.ok) return `err ${res.status}`;
    const text = await res.text();
    // FlavorDB occasionally serves an HTML error page with a 200; guard against it.
    if (!text.trimStart().startsWith('{')) return 'nonjson';
    const json = JSON.parse(text);
    if (!json.entity_id || !Array.isArray(json.molecules)) return 'malformed';
    fs.writeFileSync(dest, JSON.stringify(json));
    return 'ok';
  } catch (e) {
    return `fail ${e.name}`;
  }
};

const run = async () => {
  const ids = Array.from({ length: MAX_ID }, (_, i) => i + 1);
  const stats = { ok: 0, skip: 0, missing: 0, fail: 0 };
  let cursor = 0;
  const worker = async () => {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      const r = await fetchEntity(id);
      if (r === 'ok') stats.ok++;
      else if (r === 'skip') stats.skip++;
      else if (r === '404') stats.missing++;
      else {
        stats.fail++;
        console.warn(`  id ${id}: ${r}`);
      }
      if ((stats.ok + stats.skip) % 100 === 0 && r !== '404') {
        process.stdout.write(`\r  fetched ${stats.ok} new, ${stats.skip} cached, ${stats.missing} absent…`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n');
  console.log(`Done. ${stats.ok} new, ${stats.skip} cached, ${stats.missing} absent, ${stats.fail} failed.`);
  console.log(`Snapshot in ${path.relative(process.cwd(), DATA_DIR)}/`);
};

run();
