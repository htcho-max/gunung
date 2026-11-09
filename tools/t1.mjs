import { GAME, SHOTS } from './env.mjs';
import { chromium } from 'playwright';
const SH = SHOTS;
const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 800), tag = process.argv[4] || 'd';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.stack)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
await p.goto(GAME);
await p.waitForTimeout(300); await p.screenshot({ path: SH + tag + '_title.png' });
await p.click('#bNew'); await p.waitForTimeout(200);
await p.click('.modeCard >> nth=0'); await p.waitForTimeout(200); await p.screenshot({ path: SH + tag + '_pick.png' });
await p.click('.ofCard:has(.nm:text-is("조조"))'); await p.waitForTimeout(400);
await p.screenshot({ path: SH + tag + '_intro.png' });
await p.click('#modalLayer .btn.pri'); await p.waitForTimeout(300);
for (let i = 0; i < 6; i++) { await p.waitForTimeout(250); const m = await p.$('#modalLayer.on footer .btn.pri'); if (!m) break; await m.click(); }
await p.screenshot({ path: SH + tag + '_game.png' });
// 개간
await p.click('.cmd:has-text("개간")'); await p.waitForTimeout(200);
await p.screenshot({ path: SH + tag + '_pickoff.png' });
await p.click('.pickList .offRow >> nth=0'); await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(200);
// 허창(빈 땅) 차지
await p.click('.cmd:has-text("출진")'); await p.waitForTimeout(200);
await p.click('.pickList .offRow:has-text("허창")'); await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(200);
await p.screenshot({ path: SH + tag + '_attack.png' });
await p.click("#modalLayer footer .btn.red"); await p.waitForTimeout(1300);
console.log('허창', await p.evaluate(() => facName(G.cities[CITY_BY_NAME['허창']].f)));
// 소패 공격 → 전투 화면
await p.evaluate(() => { UI.sel = CITY_BY_NAME['진류']; for (const o of G.officers) o.acted = false; G.cities[CITY_BY_NAME['진류']].troops = 20000; UI.refresh(); });
await p.click('.cmd:has-text("출진")'); await p.waitForTimeout(200);
await p.click('.pickList .offRow:has-text("낙양")'); await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(200);
await p.click('#modalLayer footer .btn.red'); await p.waitForTimeout(1300);
await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(1200);
if (await p.$('#modalLayer:not([hidden]) footer .btn.pri')) { await p.screenshot({ path: SH + tag + '_form.png' }); await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(900); }
await p.screenshot({ path: SH + tag + '_battle.png' });
// 첫 부대 이동: 오른쪽으로 3칸
const mv = await p.evaluate(() => { const B = BattleUI.B, u = BattleUI.sel; const r = [...BattleUI.reach.keys()].sort((a, b) => tQ(b) - tQ(a))[0]; const c = BattleUI.center(r); const rc = $('#bcv').getBoundingClientRect(); return { x: rc.left + c.x, y: rc.top + c.y }; });
await p.mouse.click(mv.x, mv.y); await p.waitForTimeout(900);
await p.evaluate(() => { const B = BattleUI.B; const u = BattleUI.sel; const e = B.units.find(z => z.side === 1); BattleUI.vfx.push({ kind: 'slash', to: e.at, t0: performance.now() - 100 }); BattleUI.vfx.push({ kind: 'arrow', from: u.at, to: e.at, t0: performance.now() - 150 }); B.tiles[hexNb(e.at)[2]].fire = 2; BattleUI.showRibbon(0); });
await p.waitForTimeout(250); await p.screenshot({ path: SH + tag + '_battle3.png' });
await p.screenshot({ path: SH + tag + '_battle2.png' });
// 자동 전투로 끝내기
await p.click('#btop .topBtn:has-text("빠르게")');
await p.click('#btop .topBtn:has-text("자동 전투")');
for (let i = 0; i < 120; i++) { await p.waitForTimeout(500); const m = await p.evaluate(() => $('#modalLayer').classList.contains('on')); if (m) { const t = await p.textContent('#modalLayer'); if (/일기토/.test(t) && await p.$('#modalLayer footer .btn')) { await p.screenshot({ path: SH + tag + '_duel.png' }); } const btn = await p.$('#modalLayer footer .btn.pri') || await p.$('#modalLayer footer .btn'); if (btn) await btn.click(); } if (await p.evaluate(() => !$('#scrGame').hidden && !$('#modalLayer').classList.contains('on'))) break; }
await p.waitForTimeout(300);
await p.screenshot({ path: SH + tag + '_after.png' });
console.log('소패', await p.evaluate(() => facName(G.cities[CITY_BY_NAME["낙양"]].f)), await p.evaluate(() => G.log.slice(0, 4).map(l => l.text).join(' / ')));
// 다음 달
await p.click('#bEnd'); for (let i = 0; i < 60; i++) { await p.waitForTimeout(300); const m = await p.$('#modalLayer.on footer .btn'); if (m) await m.click(); if (await p.evaluate(() => !BUSY)) break; }
await p.screenshot({ path: SH + tag + '_next.png' });
console.log('date', await p.evaluate(() => G.year + '.' + G.month));
console.log('ERR', errs);
await b.close();
