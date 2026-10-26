import { createGame, MAX_MISTAKES, validateGames } from './engine.js';
import { translate } from './i18n.js';
import { createDrawPool } from './pool.js';
const $ = id => document.getElementById(id);
let language = 'zh';
try { language = localStorage.getItem('score-duel-language') === 'en' ? 'en' : 'zh'; } catch {}
const t = (key, values) => translate(language, key, values);
let game, data, loading = false, advancing = false, loadError = false, nextError = false, refillPromise;
const pool = createDrawPool();
const formatScore = score => score.toFixed(1);
const number = value => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'zh-CN').format(value);

function applyLanguage(nextLanguage) {
  language = nextLanguage;
  try { localStorage.setItem('score-duel-language', language); } catch {}
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.title = t('title');
  document.querySelector('meta[name="description"]').content = t('description');
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  $('brand').setAttribute('aria-label', t('home'));
  $('play-area').setAttribute('aria-label', t('arena'));
  $('language-switch').setAttribute('aria-label', t('language'));
  document.querySelector('#over-dialog .language-switch').setAttribute('aria-label', t('language'));
  $('language-zh').setAttribute('aria-pressed', String(language === 'zh'));
  $('language-en').setAttribute('aria-pressed', String(language === 'en'));
  document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
  document.querySelectorAll('[data-close]').forEach(button => button.setAttribute('aria-label', t('close')));
  render();
}
function sourceUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'store.steampowered.com' && /^\/app\/\d+\//.test(url.pathname) ? url.href : null; } catch { return null; }
}
function setCover(side, item) {
  const image = $(`${side}-cover`);
  if (image.dataset.game === String(item.id)) return;
  image.dataset.game = String(item.id);
  image.className = 'cover loading';
  image.onload = () => image.classList.remove('loading');
  let triedFallback = false;
  image.onerror = () => {
    if (!triedFallback && item.header) { triedFallback = true; image.src = item.header; }
    else { image.onerror = null; image.className = 'cover failed'; image.removeAttribute('src'); }
  };
  image.src = item.cover || item.header || './missing-cover.jpg';
}
function render() {
  $('play-area').setAttribute('aria-busy', String(loading || advancing));
  $('refresh-button').disabled = loading || advancing;
  $('restart-button').disabled = !game || loading || advancing;
  $('retry-button').hidden = !loadError;
  const state = game?.snapshot();
  const currentItems = state ? [state.left, state.right] : [];
  const modes = currentItems.map(item => item.dataMode);
  const mode = modes.includes('snapshot') ? 'snapshot' : modes.includes('cached') ? 'cached' : currentItems.length ? 'live' : data?.mode;
  $('data-status').textContent = data ? t(mode === 'live' ? 'live' : mode === 'cached' ? 'cached' : 'snapshot') : '';
  $('data-status').className = `data-status ${mode || ''}`;
  if (data) {
    const timestamps = currentItems.map(item => Date.parse(item.fetchedAt)).filter(Number.isFinite);
    const date = new Date(timestamps.length ? Math.min(...timestamps) : data.updatedAt).toLocaleString(language === 'en' ? 'en-GB' : 'zh-CN', {timeZone:'Asia/Hong_Kong'});
    $('data-description').textContent = `${t('fetched',{date})} (UTC+8). ${t('poolInfo',{count:pool.size})}${pool.cycles ? ' ' + t('poolRecycled') : ''}`;
  } else $('data-description').textContent = t('loadInfo');
  const revealed = state && state.phase !== 'guessing';
  $('next-button').hidden = !revealed || loading;
  $('next-button').disabled = advancing;
  $('next-button').textContent = t(advancing ? 'drawLoading' : state?.phase === 'over' ? 'results' : 'next');
  if (state) {
    $('round').textContent = String(state.round).padStart(2, '0');
    $('correct').textContent = state.correct;
    $('round-instruction').textContent = t(revealed ? 'revealed' : 'instruction');
    $('lives').replaceChildren(...Array.from({length:MAX_MISTAKES},(_,i)=>{
      const heart = document.createElement('span');
      const lost = i >= MAX_MISTAKES - state.mistakes;
      heart.className = `heart${lost?' lost':''}`; heart.textContent = lost?'♡':'♥'; heart.setAttribute('aria-hidden','true'); return heart;
    }));
    $('lives').setAttribute('aria-label',t('lives',{remaining:MAX_MISTAKES-state.mistakes,mistakes:state.mistakes}));
    for (const side of ['left','right']) {
      const item = state[side], visible = side === 'left' || revealed, card = $(`${side}-card`);
      card.disabled = Boolean(revealed || loading || advancing);
      card.className = 'game-card';
      if (state.result?.side === side) card.classList.add('selected',state.result.correct?'correct-card':'wrong-card');
      card.setAttribute('aria-label',`${item.name}. ${visible?t('scoreAria',{score:formatScore(item.score)}):t('hiddenAria')}. ${t(revealed?'revealed':'chooseAria')}`);
      $(`${side}-name`).textContent = item.name;
      $(`${side}-meta`).textContent = `STEAM${item.year?` / ${item.year}`:''}`;
      $(`${side}-score`).textContent = visible ? `${formatScore(item.score)}%` : '?';
      $(`${side}-score`).className = `score${!visible?' hidden-score':item.score<50?' low':item.score<75?' mixed':''}`;
      $(`${side}-reviews`).textContent = visible ? t('reviews',{count:number(item.totalReviews)}) : '';
      $(`${side}-score-caption`).textContent = t(visible?'positiveLabel':'hiddenHint');
      const link=$(`${side}-source`), source=sourceUrl(item.source);
      link.hidden=!visible || !source;
      if(source) link.href=source;
      card.querySelector('.card-choice span').textContent=t(revealed?state.result.side===side?'selected':'revealed':'choose');
      setCover(side,item);
    }
    $('final-score').textContent=state.correct;
    const rounds=state.correct+state.mistakes;
    $('final-detail').textContent=t('finalDetail',{rounds,accuracy:rounds?Math.round(state.correct/rounds*100):0});
  } else {
    $('left-name').textContent=t('leftLoading'); $('right-name').textContent=t('rightLoading');
    $('left-card').disabled=true; $('right-card').disabled=true;
  }
  $('feedback-box').className=`feedback${loadError||nextError?' error':revealed?state.result.correct?' success':' error':''}`;
  if (loadError) {
    $('feedback-title').textContent=t('unavailable');
    $('feedback-detail').textContent=t(location.protocol==='file:'?'fileError':'unavailableDetail');
    $('feedback-icon').textContent='!';
  } else if (loading || advancing) {
    $('feedback-title').textContent=t(advancing?'drawLoading':'loading');
    $('feedback-detail').textContent=t(advancing?'drawDetail':'loadingDetail'); $('feedback-icon').textContent='↻';
  } else if (nextError) {
    $('feedback-title').textContent=t('nextError');$('feedback-detail').textContent=t('nextErrorDetail');$('feedback-icon').textContent='!';
  } else if(revealed) {
    $('feedback-title').textContent=`${t(state.result.tie?'tie':state.result.correct?'win':'wrong')} ${formatScore(state.left.score)}% : ${formatScore(state.right.score)}%`;
    $('feedback-detail').textContent=t('pair',{left:state.left.name,a:formatScore(state.left.score),right:state.right.name,b:formatScore(state.right.score)})+' '+t(state.phase==='over'?'over':'carry');
    $('feedback-icon').textContent=state.result.correct?'✓':'×';
  } else {
    $('feedback-title').textContent=t(state?.round>1?'nextTitle':'startTitle');$('feedback-detail').textContent=t('feedbackHint');$('feedback-icon').textContent='↖';
  }
}
async function fetchGames() {
  try {
    const query=new URLSearchParams({exclude:pool.exclusions().join(',')});
    const response=await fetch(`./api/games?${query}`,{signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw new Error('api');
    const result=await response.json();
    result.games=result.games.filter(item=>Number.isSafeInteger(item.totalReviews)&&item.totalReviews>500);
    validateGames(result.games);
    if(result.provider!=='STEAM'||result.policy!=='steam-purchases-all-languages-v1')throw new Error('provider');
    return {...result,games:result.games.map(item=>({...item,dataMode:item.dataMode||result.mode}))};
  } catch {
    const response=await fetch('./data/games.json',{signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error('snapshot');
    const result=await response.json();
    result.games=result.games.filter(item=>Number.isSafeInteger(item.totalReviews)&&item.totalReviews>500);
    validateGames(result.games);
    if(result.provider!=='STEAM'||result.policy!=='steam-purchases-all-languages-v1')throw new Error('provider');
    return {...result,mode:'snapshot',games:result.games.map(item=>({...item,dataMode:'snapshot'}))};
  }
}
async function refill() {
  if(!refillPromise)refillPromise=fetchGames().then(result=>{
    pool.add(result.games);data=result;
  }).finally(()=>{refillPromise=null;});
  return refillPromise;
}
async function drawNew(exclude = [], recycleExclude = exclude) {
  let item=pool.draw(exclude);
  if(item)return item;
  // Try online additions before allowing any game to return.
  await refill().catch(error=>{if(pool.size<2)throw error;});
  item=pool.draw(exclude);
  if(item)return item;
  pool.recycle(recycleExclude);
  item=pool.draw(recycleExclude);
  if(!item)throw new Error('empty');
  return item;
}
function showResults(){render();if(!$('over-dialog').open)$('over-dialog').showModal();}
function guess(side){if(!game||loading||advancing||game.snapshot().phase!=='guessing')return;game.guess(side);nextError=false;render();if(game.snapshot().phase==='over')showResults();else{$('next-button').focus({preventScroll:true});if(pool.available<2)refill().catch(()=>{});}}
async function advance(){
  if(!game||advancing||loading)return;
  if(game.snapshot().phase==='over')return showResults();
  if(game.snapshot().phase!=='revealed')return;
  advancing=true;nextError=false;render();
  try{
    const state=game.snapshot();
    const challenger=await drawNew([state.left.id,state.right.id],[state.right.id]);
    game.next(challenger);
  }catch{nextError=true;}finally{advancing=false;render();if(!nextError)$('left-card').focus({preventScroll:true});}
}
function restart(){if(!game||loading||advancing)return;if($('over-dialog').open)$('over-dialog').close();load(false);}
async function load(refresh = true){
  if(loading||advancing)return;
  loading=true;loadError=false;nextError=false;render();
  if(refillPromise)await refillPromise.catch(()=>{});
  try{
    if(refresh||!data)await refill();
    const previous=game?.snapshot();
    const exclude=previous?[previous.left.id,previous.right.id]:[];
    const left=await drawNew(exclude,previous?[previous.right.id]:[]);
    const right=await drawNew([left.id]);
    game=createGame([left,right]);
  }
  catch{loadError=true;}finally{loading=false;render();}
}
$('language-zh').addEventListener('click',()=>applyLanguage('zh'));
$('language-en').addEventListener('click',()=>applyLanguage('en'));
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>applyLanguage(button.dataset.language)));
$('left-card').addEventListener('click',()=>guess('left'));$('right-card').addEventListener('click',()=>guess('right'));
$('next-button').addEventListener('click',advance);$('restart-button').addEventListener('click',restart);$('play-again').addEventListener('click',restart);
$('retry-button').addEventListener('click',()=>load());$('refresh-button').addEventListener('click',()=>load());
$('rules-button').addEventListener('click',()=>$('rules-dialog').showModal());$('data-button').addEventListener('click',()=>$('data-dialog').showModal());$('review-button').addEventListener('click',()=>$('over-dialog').close());
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.addEventListener('keydown',event=>{
  if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||!game||document.querySelector('dialog[open]'))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();guess(event.key==='ArrowLeft'?'left':'right');}
  else if(event.key==='Enter'&&game.snapshot().phase!=='guessing'&&!event.target.closest('button:not(#next-button):not(.game-card)')){event.preventDefault();advance();}
});
applyLanguage(language);load();
