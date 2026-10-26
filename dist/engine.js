export const MAX_MISTAKES = 5;

export function validateGames(games) {
  if (!Array.isArray(games) || games.length < 2) throw new Error('题库至少需要两款游戏。');
  const ids = new Set();
  for (const game of games) {
    if (!game || !Number.isInteger(game.id) || ids.has(game.id) || typeof game.name !== 'string' || !game.name.trim() || !Number.isFinite(game.score) || game.score < 0 || game.score > 100) throw new Error('Invalid game data.');
    ids.add(game.id);
  }
  return games;
}

export function createGame(games, random = Math.random) {
  validateGames(games);
  let remaining = [];
  function draw(exclude) {
    if (!remaining.length) {
      remaining = games.map(game => game.id).filter(id => id !== exclude);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
    }
    const id = remaining.pop();
    return games.find(game => game.id === id);
  }
  let state;
  function restart() {
    remaining = [];
    const left = draw();
    state = { left, right: draw(left.id), correct: 0, mistakes: 0, round: 1, phase: 'guessing', result: null };
    return snapshot();
  }
  function snapshot() { return { ...state }; }
  function guess(side) {
    if (state.phase !== 'guessing' || !['left', 'right'].includes(side)) return snapshot();
    const tie = state.left.score === state.right.score;
    const correct = side === 'left' ? state.left.score >= state.right.score : state.right.score >= state.left.score;
    state.correct += Number(correct);
    state.mistakes += Number(!correct);
    state.result = { side, correct, tie };
    state.phase = state.mistakes === MAX_MISTAKES ? 'over' : 'revealed';
    return snapshot();
  }
  function next(challenger) {
    if (state.phase !== 'revealed') return snapshot();
    if (challenger) validateGames([state.right, challenger]);
    state = { ...state, left: state.right, right: challenger || draw(state.right.id), round: state.round + 1, phase: 'guessing', result: null };
    return snapshot();
  }
  restart();
  return { snapshot, guess, next, restart };
}
