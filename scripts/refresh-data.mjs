// Uses the public Steam store endpoint to retrieve its attributed Metacritic PC scores.
// The game itself reads a local snapshot and needs no API key or external service.
import { mkdir, writeFile } from 'node:fs/promises';

const ids = [1145360,504230,620,400,292030,1245620,570940,374320,367520,105600,413150,632360,646570,588650,753640,1091500,1057090,387290,391540,268910,435150,1086940,782330,379720,1151640,1593500,1817070,1174180,1222140,220,70,397540,582010,548430,264710,249130,203160,391220,814380,239140,203770,8930,289070,255710,960090,1072420,236430,480490];
const games = [];
for (let i = 0; i < ids.length; i += 4) {
  const batch = await Promise.all(ids.slice(i, i + 4).map(async id => {
    try {
      const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&l=english`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const data = payload[id]?.data;
      if (!payload[id]?.success || !Number.isInteger(data?.metacritic?.score)) return null;
      return { id, name: data.name, score: data.metacritic.score, platform: 'PC', year: data.release_date?.date?.match(/\d{4}/)?.[0] ?? '', cover: `https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`, header: data.header_image, source: data.metacritic.url, store: `https://store.steampowered.com/app/${id}/` };
    } catch (error) {
      console.error(`Skipping ${id}: ${error.message}`);
      return null;
    }
  }));
  games.push(...batch.filter(Boolean));
}
if (games.length < 15) throw new Error(`Only ${games.length} games retrieved. Keeping existing snapshot.`);
await mkdir(new URL('../dist/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/data/games.json', import.meta.url), JSON.stringify({ updatedAt: new Date().toISOString(), description: 'PC Metacritic scores attributed by the Steam store API. A curated snapshot, not a live or complete Metacritic catalogue.', games }, null, 2) + '\n');
console.log(`Saved ${games.length} games.`);
