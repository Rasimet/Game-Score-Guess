import { createGame, MAX_MISTAKES } from './engine.js';

const $ = id => document.getElementById(id);
let game;
let loading = false;

function sourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== 'www.metacritic.com' && url.hostname !== 'metacritic.com') return null;
    url.protocol = 'https:';
    return url.href;
  } catch { return null; }
}

function setCover(side, item) {
  const image = $(`${side}-cover`);
  if (image.dataset.game === String(item.id)) return;
  image.dataset.game = String(item.id);
  image.classList.remove('failed');
  let fallbackAttempted = false;
  image.onerror = () => {
    if (!fallbackAttempted && item.header) {
      fallbackAttempted = true;
      image.src = item.header;
    } else {
      image.classList.add('failed');
      image.removeAttribute('src');
      image.onerror = null;
    }
  };
  image.src = item.cover || item.header || './missing-cover.jpg';
}

function render() {
  const state = game.snapshot();
  const revealed = state.phase !== 'guessing';
  $('round').textContent = String(state.round).padStart(2, '0');
  $('correct').textContent = state.correct;
  $('round-instruction').textContent = revealed ? '结果已揭晓。' : '凭直觉，选一边。';
  $('lives').replaceChildren(...Array.from({ length: MAX_MISTAKES }, (_, i) => {
    const heart = document.createElement('span');
    heart.className = `heart${i >= MAX_MISTAKES - state.mistakes ? ' lost' : ''}`;
    heart.textContent = i >= MAX_MISTAKES - state.mistakes ? '♡' : '♥';
    heart.setAttribute('aria-hidden', 'true');
    return heart;
  }));
  $('lives').setAttribute('aria-label', `剩余 ${MAX_MISTAKES - state.mistakes} 次机会，已失误 ${state.mistakes} 次`);

  for (const side of ['left', 'right']) {
    const item = state[side];
    const visible = side === 'left' || revealed;
    const card = $(`${side}-card`);
    card.disabled = revealed;
    card.className = 'game-card';
    if (state.result?.side === side) card.classList.add('selected', state.result.correct ? 'correct-card' : 'wrong-card');
    card.setAttribute('aria-label', `${item.name}，PC 平台，${visible ? `Metacritic 评分 ${item.score}` : '评分隐藏'}。${revealed ? '本轮已揭晓' : '选择这款游戏评分更高'}`);
    $(`${side}-name`).textContent = item.name;
    $(`${side}-meta`).textContent = `PC ${item.year ? ` / ${item.year}` : ''}`;
    $(`${side}-score`).textContent = visible ? item.score : '?';
    $(`${side}-score`).className = `score${!visible ? ' hidden-score' : item.score < 50 ? ' low' : item.score < 75 ? ' mixed' : ''}`;
    const link = $(`${side}-source`);
    const source = sourceUrl(item.source);
    link.hidden = !visible || !source;
    if (source) link.href = source;
    setCover(side, item);
    card.querySelector('.card-choice span').textContent = revealed ? state.result.side === side ? '你的选择' : '本轮已揭晓' : '这款评分更高';
  }
  $('right-score-caption').textContent = revealed ? '媒体综合评分 / 100' : '猜猜它有多少分';
  $('next-button').hidden = !revealed;
  $('next-button').firstChild.textContent = state.phase === 'over' ? '查看成绩 ' : '下一轮 ';
  $('feedback-box').className = `feedback${revealed ? state.result.correct ? ' success' : ' error' : ''}`;
  if (!revealed) {
    $('feedback-icon').textContent = '↖';
    $('feedback-title').textContent = state.round === 1 ? '你的游戏直觉，值多少分？' : '新的对手，新的判断。';
    $('feedback-detail').textContent = '左边分数已公开。选出评分更高的一款，同分选哪边都算对。';
  } else {
    $('feedback-icon').textContent = state.result.correct ? '✓' : '×';
    const title = state.result.tie ? '同分！这一题也算你答对。' : state.result.correct ? '猜对了，你很懂游戏！' : '差一点！记住这次的分数。';
    $('feedback-title').textContent = `${title} ${state.left.score} : ${state.right.score}`;
    $('feedback-detail').textContent = `${state.left.name} ${state.left.score} 分 · ${state.right.name} ${state.right.score} 分。${state.phase === 'over' ? '五次机会已用完。' : '点击下一轮，右边游戏将移到左边。'}`;
  }
  $('restart-button').disabled = false;
}

function showResults() {
  const state = game.snapshot();
  $('final-score').textContent = state.correct;
  $('final-detail').textContent = `共完成 ${state.correct + state.mistakes} 轮 · 正确率 ${Math.round(state.correct / (state.correct + state.mistakes) * 100)}%`;
  if (!$('over-dialog').open) $('over-dialog').showModal();
}

function guess(side) {
  if (!game || game.snapshot().phase !== 'guessing') return;
  game.guess(side);
  render();
  if (game.snapshot().phase === 'over') showResults();
  else $('next-button').focus({ preventScroll: true });
}

function advance() {
  if (!game) return;
  if (game.snapshot().phase === 'over') return showResults();
  game.next();
  render();
  $('left-card').focus({ preventScroll: true });
}

function restart() {
  if (!game) return;
  if ($('over-dialog').open) $('over-dialog').close();
  game.restart();
  render();
  $('left-card').focus({ preventScroll: true });
}

async function load() {
  if (loading) return;
  loading = true;
  $('retry-button').hidden = true;
  $('play-area').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('./data/games.json', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    game = createGame(data.games);
    $('data-description').textContent = `当前题库 ${data.games.length} 款游戏。评分获取日期：${new Date(data.updatedAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Hong_Kong' })}。一轮内不重复；题库用完后重新洗牌。`;
    render();
  } catch (error) {
    $('feedback-box').className = 'feedback error';
    $('feedback-icon').textContent = '!';
    $('feedback-title').textContent = '题库暂时没有加载成功。';
    $('feedback-detail').textContent = location.protocol === 'file:' ? '请按照 README 启动本地服务器，再打开 http://127.0.0.1:4173。' : '请检查网络或 data/games.json 文件，然后点击重新加载。';
    $('retry-button').hidden = false;
    console.error('Game data unavailable:', error.message);
  } finally {
    loading = false;
    $('play-area').setAttribute('aria-busy', 'false');
  }
}

$('left-card').addEventListener('click', () => guess('left'));
$('right-card').addEventListener('click', () => guess('right'));
$('next-button').addEventListener('click', advance);
$('restart-button').addEventListener('click', restart);
$('play-again').addEventListener('click', restart);
$('retry-button').addEventListener('click', load);
$('rules-button').addEventListener('click', () => $('rules-dialog').showModal());
$('data-button').addEventListener('click', () => $('data-dialog').showModal());
$('review-button').addEventListener('click', () => $('over-dialog').close());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || !game || document.querySelector('dialog[open]')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    guess(event.key === 'ArrowLeft' ? 'left' : 'right');
  } else if (event.key === 'Enter' && game.snapshot().phase !== 'guessing') {
    event.preventDefault();
    advance();
  }
});
load();
