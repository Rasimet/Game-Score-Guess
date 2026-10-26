import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSteamClient, parseSearchPage, scoreFromSummary, REVIEW_POLICY } from '../scripts/steam.mjs';
import { messages, translate } from '../dist/i18n.js';

test('approval is a rounded percentage of counts, never the Steam sentiment category', () => {
  assert.equal(scoreFromSummary({total_positive:877,total_negative:123,total_reviews:1000,review_score:9}).score,87.7);
  for(const summary of [{total_positive:90,total_negative:9,total_reviews:99},{total_positive:101,total_negative:0,total_reviews:100},{total_positive:null,total_negative:0,total_reviews:100}])assert.throws(()=>scoreFromSummary(summary));
  assert.equal(REVIEW_POLICY.purchase_type,1);
  assert.deepEqual(REVIEW_POLICY.languages,['all']);
});
test('review threshold rejects exactly 500 and accepts 501 matching reviews',()=>{
  assert.throws(()=>scoreFromSummary({total_positive:450,total_negative:50,total_reviews:500}));
  assert.equal(scoreFromSummary({total_positive:451,total_negative:50,total_reviews:501}).totalReviews,501);
});
const html='<a data-ds-appid="620"><img src="https://example.com/cover.jpg"><span class="title">Portal &amp; Friends</span><div class="search_released">18 Apr, 2011</div></a><a data-ds-appid="620"><span class="title">Portal &amp; Friends</span></a>';
test('catalogue parser handles HTML entities, duplicate apps, and rejects non-app rows',()=>{
  const items=parseSearchPage(html+'<a data-ds-packageid="20"><span class="title">Package</span></a><a data-ds-appid="999" data-ds-descids="[3]"><span class="title">Excluded descriptor</span></a>');
  assert.equal(items.length,1);assert.equal(items[0].name,'Portal & Friends');assert.equal(items[0].id,620);
  assert.equal(parseSearchPage('<p>Different layout</p>').length,0);
});
test('live requests share work and use official review summary endpoint and policy',async()=>{
  let count=0, reviewCalls=0, searches=0;
  const rows=Array.from({length:8},(_,i)=>`<a data-ds-appid="${i+1}"><span class="title">Game ${i+1}</span></a>`).join('');
  const client=createSteamClient({intervalMs:0,pick:()=>0,fetchImpl:async url=>{
    count++;
    if(url.includes('/search/results/')){
      searches++;
      const shift=Math.max(0,searches-2)*10;
      return Response.json({success:1,total_count:100,results_html:rows.replace(/data-ds-appid="(\d+)"/g,(_,id)=>`data-ds-appid="${Number(id)+shift}"`)});
    }
    assert.ok(url.startsWith('https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/'));
    const input=JSON.parse(new URL(url).searchParams.get('input_json'));
    assert.equal(input.purchase_type,1);assert.equal(input.review_type,0);assert.deepEqual(input.languages,['all']);
    reviewCalls++;
    return Response.json({response:{query_summary:{total_positive:900,total_negative:100,total_reviews:1000},reviews:[{author:{steamid:'private-test-value'}}]}});
  }});
  const [a,b]=await Promise.all([client.batch(),client.batch()]);
  assert.equal(a.mode,'live');assert.equal(a.games.length,6);assert.deepEqual(a,b);assert.equal(reviewCalls,6);assert.equal(count,10);
  assert.equal(JSON.stringify(a).includes('private-test-value'),false);
});
test('outage falls back to saved real Steam snapshot, never old Metacritic data',async()=>{
  const client=createSteamClient({snapshotPath:new URL('../dist/data/games.json',import.meta.url),intervalMs:0,fetchImpl:async()=>{throw new Error('offline');}});
  const result=await client.batch();assert.equal(result.mode,'snapshot');assert.equal(result.provider,'STEAM');assert.ok(result.games.length>=15);
  const dir=await mkdtemp(path.join(os.tmpdir(),'score-duel-test-'));
  try{
    const invalid=path.join(dir,'invalid.json');await writeFile(invalid,JSON.stringify({provider:'METACRITIC',games:result.games}));
    const noFallback=createSteamClient({snapshotPath:invalid,intervalMs:0,fetchImpl:async()=>new Response('',{status:429})});
    await assert.rejects(()=>noFallback.batch());
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('online sampling excludes collected games before review requests and samples distinct pages',async()=>{
  const reviewed=[], starts=[];
  const client=createSteamClient({intervalMs:0,pick:()=>0,fetchImpl:async url=>{
    if(url.includes('/search/results/')){
      const start=Number(new URL(url).searchParams.get('start'));
      starts.push(start);
      const ids=[1,2,3+start,4+start,5+start,6+start];
      return Response.json({success:1,total_count:250,results_html:ids.map(id=>`<a data-ds-appid="${id}"><span class="title">Game ${id}</span></a>`).join('')});
    }
    const input=JSON.parse(new URL(url).searchParams.get('input_json'));
    reviewed.push(input.appid);
    return Response.json({response:{query_summary:{total_positive:900,total_negative:100,total_reviews:1000}}});
  }});
  const batch=await client.batch({exclude:[1,2]});
  assert.equal(batch.mode,'live');
  assert.equal(batch.games.length,6);
  assert.ok(reviewed.every(id=>id!==1&&id!==2));
  assert.equal(new Set(starts.slice(1)).size,starts.length-1);
});

test('small caches merge with the offline library and prefer games outside the exclusion list',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'score-duel-pool-'));
  try {
    const snapshotClient=createSteamClient({snapshotPath:new URL('../dist/data/games.json',import.meta.url),fetchImpl:async()=>{throw new Error('offline');}});
    const snapshot=await snapshotClient.batch();
    const cachePath=path.join(dir,'cache.json');
    const cached=snapshot.games.slice(0,2);
    await writeFile(cachePath,JSON.stringify({...snapshot,games:cached}));
    const client=createSteamClient({cachePath,snapshotPath:new URL('../dist/data/games.json',import.meta.url),intervalMs:0,fetchImpl:async()=>{throw new Error('offline');}});
    const data=await client.batch({exclude:cached.map(game=>game.id)});
    assert.equal(data.games.length,snapshot.games.length-2);
    assert.ok(data.games.every(game=>!cached.some(old=>old.id===game.id)));
    assert.ok(data.games.every(game=>game.dataMode==='snapshot'));
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('both languages cover all messages and interpolate result feedback',()=>{
  assert.deepEqual(Object.keys(messages.zh).sort(),Object.keys(messages.en).sort());
  for(const lang of ['zh','en'])for(const [key,value]of Object.entries(messages[lang]))assert.ok(value.trim(),`${lang}.${key}`);
  assert.equal(translate('en','lives',{remaining:4,mistakes:1}),'Chances left: 4 · Mistakes: 1');
  assert.match(translate('en','finalDetail',{rounds:8,accuracy:75}),/8.*75%/);
});
