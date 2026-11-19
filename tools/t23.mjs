// 3단계: 역사 비교·업적·관계·대사·엔딩
import { GAME, SHOTS } from './env.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(GAME);
const r = await p.evaluate(async () => {
  window.__fast = true; const out = [];
  Setup.scen = 190; Setup.open(); Setup.start(G.officers.find(x => x.name === '유비').id);
  const realModal = UI.modal; UI.modal = async o => { const ok = (o.buttons || []).find(b => b.cls === 'pri'); return ok ? ok.k : 'x'; };
  BattleUI.run = async B => { B.auto = true; runBattleHeadless(B); };
  for (let i = 0; i < 30; i++) await endMonth();
  const m = histMatch(); out.push(`192.7 일치율 ${m.pct}% (${m.ok}/${m.n})`);
  out.push('업적 ' + Object.keys(G.ach || {}).join(',') + ' ev:' + Object.keys(G.ev).slice(0, 6).join(','));
  out.push('로그 역사: ' + (G.log.find(l => (l.text || '').includes('실제 역사')) ? '있음' : JSON.stringify(G.log[G.log.length - 1])));
  // 관계
  const mc = G.officers.find(o => o.name === '마초'), cc = G.officers.find(o => o.name === '조조');
  out.push(`마초-조조 ${JSON.stringify(relOf(mc, cc))} 등용확률 ${cc.st === 'on' && isRuler(cc) ? hireChance(cc, mc, cc.f) : '-'}`);
  out.push('대사 ' + duelOpening(G.officers.find(o => o.name === '장비'), G.officers.find(o => o.name === '여포')).map(x => x[1]).join(' / '));
  // 엔딩
  const F = G.factions[me().f]; out.push('엔딩: ' + endingText(F, me()).slice(0, 80));
  UI.modal = realModal;
  return out;
});
console.log(r.join('\n'));
await p.evaluate(() => UI.chronicle('hist')); await p.waitForTimeout(400); await p.screenshot({ path: SHOTS + 'hist_compare.png' });
await p.evaluate(() => { document.querySelector('#modalLayer.on footer .btn')?.click(); }); await p.waitForTimeout(200);
await p.evaluate(() => UI.chronicle('ach')); await p.waitForTimeout(400); await p.screenshot({ path: SHOTS + 'achievements.png' });
console.log('ERR', errs.slice(0, 3)); await b.close();
