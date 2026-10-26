// Records real Steam review summaries for offline demonstration; no API key.
import { readFile, writeFile } from 'node:fs/promises';
import { createSteamClient } from './steam.mjs';
const previous = JSON.parse(await readFile(new URL('../dist/data/games.json', import.meta.url), 'utf8'));
const client = createSteamClient();
const games = [];
for (const item of previous.games) {
  try {
    const { source: oldSource, score: oldScore, store, criticCount, ...metadata } = item;
    games.push({ ...metadata, platform: 'STEAM', source: `https://store.steampowered.com/app/${item.id}/#app_reviews_hash`, ...await client.reviews(item.id) });
  } catch { console.error(`Could not retrieve Steam summary for app ${item.id}.`); }
}
if (games.length < 15) throw new Error('Too few valid summaries. Existing snapshot was preserved.');
await writeFile(new URL('../dist/data/games.json', import.meta.url), JSON.stringify({ provider: 'STEAM', policy: 'steam-purchases-all-languages-v1', mode: 'snapshot', updatedAt: new Date().toISOString(), games }, null, 2) + '\n');
console.log(`Saved ${games.length} real Steam review summaries.`);
