import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomInt } from 'node:crypto';

export const REVIEW_POLICY = { languages: ['all'], review_type: 0, purchase_type: 1, filter: 0, day_range: 0, cursor: '*', num_per_page: 1, filter_offtopic_activity: true };
// "More than 500" means a game needs at least 501 matching reviews.
export const MIN_REVIEWS = 501;

export function scoreFromSummary(summary) {
  const positive = summary?.total_positive, negative = summary?.total_negative, total = summary?.total_reviews;
  if (![positive, negative, total].every(Number.isSafeInteger) || positive < 0 || negative < 0 || total < MIN_REVIEWS || positive + negative !== total) throw new Error('invalid_reviews');
  return { score: Math.round(positive / total * 1000) / 10, positiveCount: positive, negativeCount: negative, totalReviews: total };
}
function decode(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#39|#\d+|#x[0-9a-f]+);/gi, entity => {
    const named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const code = /^&#x/i.test(entity) ? parseInt(entity.slice(3), 16) : parseInt(entity.slice(2), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}
export function parseSearchPage(html) {
  if (typeof html !== 'string') throw new Error('invalid_catalog');
  const games = new Map();
  for (const match of html.matchAll(/<a\b([^>]*\bdata-ds-appid="(\d+)"[^>]*)>([\s\S]*?)<\/a>/gi)) {
    const descriptors = match[1].match(/data-ds-descids="([^"]*)"/i)?.[1] || '[]';
    try { if (JSON.parse(decode(descriptors)).some(id => id === 3 || id === 4)) continue; } catch { continue; }
    const id = Number(match[2]);
    const name = match[3].match(/<span\b[^>]*class="title"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
    if (!Number.isSafeInteger(id) || !name) continue;
    const header = match[3].match(/<img\b[^>]*src="(https:[^"]+)"/i)?.[1];
    const tooltip = decode(match[3].match(/data-tooltip-html="([^"]*)"/i)?.[1] || '');
    const countText = tooltip.match(/([\d,]+) user reviews/i)?.[1];
    const reviewEstimate = countText ? Number(countText.replaceAll(',', '')) : null;
    games.set(id, { id, name: decode(name.replace(/<[^>]+>/g, '')).trim(), platform: 'STEAM', year: match[3].match(/class="search_released[^\"]*"[^>]*>[^<]*(\d{4})/i)?.[1] || '', reviewEstimate, cover: `https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`, header: header ? decode(header) : null, source: `https://store.steampowered.com/app/${id}/#app_reviews_hash` });
  }
  return [...games.values()];
}
export function createSteamClient({ fetchImpl = fetch, cachePath, snapshotPath, now = Date.now, pick = randomInt, intervalMs = 300 } = {}) {
  let lastRequest = 0, gate = Promise.resolve(), catalog, active;
  const summaries = new Map();
  async function request(url, deadline = Infinity) {
    const slot = gate.then(async () => {
      const delay = Math.max(0, intervalMs - (now() - lastRequest));
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      lastRequest = now();
    });
    gate = slot.catch(() => {});
    await slot;
    const remaining = deadline - now();
    if (remaining < 100) throw new Error('unavailable');
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(Math.min(8000, remaining)) });
    if (!response.ok) throw new Error(response.status === 429 ? 'rate_limit' : 'unavailable');
    return response.json();
  }
  async function search(start, deadline) {
    const params = new URLSearchParams({ start: String(start), count: '25', sort_by: 'Reviews_DESC', category1: '998', infinite: '1', json: '1', l: 'english', cc: 'us', ignore_preferences: '1' });
    const data = await request(`https://store.steampowered.com/search/results/?${params}`, deadline);
    if (data.success !== 1 || !Number.isSafeInteger(data.total_count) || data.total_count < 1) throw new Error('invalid_catalog');
    return { count: data.total_count, games: parseSearchPage(data.results_html) };
  }
  async function reviews(id, deadline) {
    const existing = summaries.get(id);
    if (existing && now() - Date.parse(existing.fetchedAt) < 600000) return existing;
    const params = { ...REVIEW_POLICY, appid: id };
    const data = await request(`https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=${encodeURIComponent(JSON.stringify(params))}`, deadline);
    const result = { ...scoreFromSummary(data.response?.query_summary), fetchedAt: new Date(now()).toISOString() };
    summaries.set(id, result);
    return result;
  }
  async function readSnapshot(filename, mode) {
    if (!filename) return null;
    try {
      const data = JSON.parse(await readFile(filename, 'utf8'));
      if (data.provider !== 'STEAM' || data.policy !== 'steam-purchases-all-languages-v1' || !Array.isArray(data.games)) return null;
      const games = data.games.filter(game => {
        try { return Number.isSafeInteger(game.id) && typeof game.name === 'string' && game.name.trim() && scoreFromSummary({ total_positive: game.positiveCount, total_negative: game.negativeCount, total_reviews: game.totalReviews }).score === game.score && game.source === `https://store.steampowered.com/app/${game.id}/#app_reviews_hash`; }
        catch { return false; }
      });
      return games.length >= 2 ? { ...data, mode, games } : null;
    } catch { return null; }
  }
  async function liveBatch() {
    const deadline = now() + 24000;
    if (!catalog || now() - catalog.fetchedAt > 3600000) {
      const first = await search(0, deadline);
      catalog = { count: first.count, fetchedAt: now() };
    }
    const games = new Map();
    for (let page = 0; page < 5 && games.size < 6 && now() < deadline; page++) {
      const start = pick(Math.max(1, Math.ceil(catalog.count / 25))) * 25;
      const data = await search(start, deadline);
      const candidates = data.games.filter(item => item.reviewEstimate === null || item.reviewEstimate >= MIN_REVIEWS);
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = pick(i + 1);
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      let fromPage = 0;
      for (const candidate of candidates.slice(0, 6)) {
        if (games.size >= 6 || now() >= deadline) break;
        if (fromPage >= 2) break;
        try { games.set(candidate.id, { ...candidate, ...await reviews(candidate.id, deadline) }); fromPage++; }
        catch (error) { if (error.message === 'rate_limit') throw error; }
      }
    }
    if (games.size < 2) throw new Error('no_games');
    const data = { provider: 'STEAM', policy: 'steam-purchases-all-languages-v1', mode: 'live', catalogCount: catalog.count, updatedAt: new Date(now()).toISOString(), games: [...games.values()] };
    if (cachePath) {
      try {
        const previous = await readSnapshot(cachePath, 'cached');
        const stored = new Map((previous?.games ?? []).map(game => [game.id, game]));
        data.games.forEach(game => stored.set(game.id, game));
        await mkdir(path.dirname(cachePath), { recursive: true });
        await writeFile(`${cachePath}.tmp`, JSON.stringify({ ...data, games: [...stored.values()].slice(-500) }));
        await rename(`${cachePath}.tmp`, cachePath);
      } catch { /* Read-only disk must not break live gameplay. */ }
    }
    return data;
  }
  return {
    reviews,
    async batch() {
      try {
        if (!active) active = liveBatch().finally(() => { active = null; });
        return await active;
      } catch {
        const backup = await readSnapshot(cachePath, 'cached') || await readSnapshot(snapshotPath, 'snapshot');
        if (!backup) throw new Error('unavailable');
        return backup;
      }
    },
  };
}
