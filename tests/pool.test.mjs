import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrawPool } from '../dist/pool.js';
import { createGame } from '../dist/engine.js';

const game = id => ({id, name:`Game ${id}`, score:80});

test('overlapping batches never reintroduce a drawn game; updated scores still reach queued games', () => {
  const pool = createDrawPool(() => 0);
  pool.add([game(1), game(2), game(3)]);
  const first = pool.draw();
  pool.add([game(1), {...game(2), score:90}, game(3), game(4)]);
  const drawn = [first];
  while (pool.available) drawn.push(pool.draw());
  assert.equal(new Set(drawn.map(item => item.id)).size, 4);
  const second=drawn.find(item=>item.id===2);
  assert.equal(second.score,first.id===2?80:90);
  pool.add([game(1), game(2), game(3), game(4)]);
  assert.equal(pool.draw(), null);
  assert.equal(pool.size, 4);
  assert.deepEqual(new Set(pool.exclusions()), new Set([1,2,3,4]));
});

test('new runs share draw history and new batches extend a long run without repeats', () => {
  const pool = createDrawPool(() => 0.3);
  const seen = new Set();
  for (let run = 0; run < 3; run++) {
    pool.add(Array.from({length:12}, (_,i) => game(i + run * 10 + 1)));
    const left = pool.draw(), right = pool.draw();
    const match = createGame([left,right]);
    for (const item of [match.snapshot().left,match.snapshot().right]) {
      assert.ok(!seen.has(item.id));seen.add(item.id);
    }
    for(let round=0;round<8;round++) {
      const state=match.snapshot();
      match.guess('right');
      const challenger=pool.draw([state.left.id,state.right.id]);
      assert.ok(challenger);
      assert.ok(!seen.has(challenger.id));seen.add(challenger.id);
      assert.equal(match.next(challenger).left.id,state.right.id);
    }
  }
  assert.equal(seen.size,30);
});

test('finite offline pools only repeat after explicit recycling and keep current game excluded', () => {
  const pool = createDrawPool(() => 0);
  pool.add([game(1), game(2), game(3)]);
  const drawn=[pool.draw(),pool.draw(),pool.draw()];
  assert.equal(pool.draw(),null);
  assert.equal(pool.cycles,0);
  const current=drawn.at(-1).id;
  pool.recycle([current]);
  assert.equal(pool.cycles,1);
  const next=pool.draw([current]);
  assert.notEqual(next.id,current);
  assert.notEqual(pool.draw([current]).id,next.id);
  assert.equal(pool.draw(),null);
});

test('a two-game fallback can recycle without placing the same game on both sides', () => {
  const pool = createDrawPool();
  pool.add([game(1),game(2)]);
  const left=pool.draw(), right=pool.draw();
  pool.recycle([right.id]);
  assert.equal(pool.draw().id,left.id);
});
