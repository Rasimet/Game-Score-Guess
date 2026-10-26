import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGame, validateGames } from '../dist/engine.js';

const games = [{ id: 1, name: 'A', score: 90 }, { id: 2, name: 'B', score: 70 }, { id: 3, name: 'C', score: 80 }];
test('reveals once, ignores repeated input, and carries right game into the next round', () => {
  const game = createGame(games, () => 0);
  const before = game.snapshot();
  assert.notEqual(before.left.id, before.right.id);
  const side = before.left.score > before.right.score ? 'left' : 'right';
  const after = game.guess(side);
  assert.equal(after.correct, 1);
  assert.equal(after.phase, 'revealed');
  assert.deepEqual(game.guess(side), after);
  const next = game.next();
  assert.equal(next.left.id, before.right.id);
  assert.notEqual(next.right.id, next.left.id);
  assert.equal(next.round, 2);
  assert.equal(next.phase, 'guessing');
});
test('ties count as correct on either side', () => {
  for (const side of ['left', 'right']) {
    const game = createGame(games.map(item => ({ ...item, score: 80 })));
    const state = game.guess(side);
    assert.equal(state.correct, 1);
    assert.equal(state.mistakes, 0);
    assert.equal(state.result.tie, true);
  }
});
test('fifth mistake ends the game, preserving correct answers, and restart resets all counts', () => {
  const game = createGame(games, () => 0);
  let state = game.snapshot();
  game.guess(state.left.score > state.right.score ? 'left' : 'right');
  game.next();
  for (let i = 1; i <= 5; i++) {
    state = game.snapshot();
    state = game.guess(state.left.score < state.right.score ? 'left' : 'right');
    assert.equal(state.mistakes, i);
    assert.equal(state.correct, 1);
    assert.equal(state.phase, i === 5 ? 'over' : 'revealed');
    if (i < 5) game.next();
  }
  assert.deepEqual(game.next(), state);
  assert.deepEqual(game.guess('left'), state);
  const restarted = game.restart();
  assert.equal(restarted.correct, 0);
  assert.equal(restarted.mistakes, 0);
  assert.equal(restarted.round, 1);
  assert.equal(restarted.phase, 'guessing');
});
test('deck refills safely, including a two-game pool and long games', () => {
  for (const pool of [games, games.slice(0, 2)]) {
    const game = createGame(pool);
    for (let i = 0; i < 200; i++) {
      const state = game.snapshot();
      assert.notEqual(state.left.id, state.right.id);
      const revealed = game.guess(state.left.score >= state.right.score ? 'left' : 'right');
      assert.equal(revealed.correct, i + 1);
      assert.equal(game.next().left.id, state.right.id);
    }
  }
});
test('empty, malformed, duplicate, and out-of-range data are rejected', () => {
  for (const pool of [[], null, [games[0]], [games[0], games[0]], [games[0], { id: 2, name: 'B', score: 101 }], [games[0], { id: 2, name: '', score: 70 }]]) assert.throws(() => createGame(pool));
});
test('shipped snapshot has authentic Steam review counts and matching percentages', async () => {
  const { games: snapshot } = JSON.parse(await readFile(new URL('../dist/data/games.json', import.meta.url), 'utf8'));
  assert.ok(validateGames(snapshot).length >= 15);
  for (const item of snapshot) {
    assert.equal(item.platform, 'STEAM');
    assert.equal(item.positiveCount + item.negativeCount, item.totalReviews);
    assert.ok(item.totalReviews >= 100);
    assert.equal(item.score, Math.round(item.positiveCount / item.totalReviews * 1000) / 10);
    assert.match(item.source, /^https:\/\/store\.steampowered\.com\/app\//);
    assert.match(item.cover, /^https:\/\//);
  }
});
test('decimal percentages and streamed challengers preserve the right-side game', () => {
  const game = createGame([{ id: 1, name: 'A', score: 88.1 }, { id: 2, name: 'B', score: 88.1 }]);
  assert.equal(game.guess('right').result.tie, true);
  const previous = game.snapshot().right;
  assert.throws(() => game.next(previous));
  const next = game.next({ id: 3, name: 'C', score: 90.2 });
  assert.equal(next.left.id, previous.id);
  assert.equal(next.right.id, 3);
});
