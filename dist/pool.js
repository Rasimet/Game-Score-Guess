import { validateGames } from './engine.js';

// This pool survives a score reset. A fetched batch must not make old games new again.
export function createDrawPool(random = Math.random) {
  const known = new Map();
  let remaining = [], seen = new Set(), cycles = 0;
  function shuffle() {
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
  }
  function add(games) {
    validateGames(games);
    for (const game of games) {
      if (!known.has(game.id) && !seen.has(game.id)) remaining.push(game.id);
      known.set(game.id, game);
    }
    shuffle();
  }
  function draw(exclude = []) {
    const blocked = new Set(exclude);
    const index = remaining.findIndex(id => !blocked.has(id));
    if (index < 0) return null;
    const [id] = remaining.splice(index, 1);
    seen.add(id);
    return known.get(id);
  }
  function recycle(exclude = []) {
    seen = new Set(exclude);
    remaining = [...known.keys()].filter(id => !seen.has(id));
    cycles++;
    shuffle();
  }
  return {
    add, draw, recycle,
    get size() { return known.size; },
    get available() { return remaining.length; },
    get cycles() { return cycles; },
    // Include queued games too, so the server can find genuinely new additions.
    exclusions: () => [...known.keys()].slice(-500),
  };
}
