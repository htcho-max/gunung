// 휴대폰 화면 + 신무장 재야 플레이
import { chromium } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.stack)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.click('#bNew'); await p.click('.modeCard >> nth=2'); await p.waitForTimeout(200);
await p.fill('#newName', '한결'); await p.selectOption('#newCity', String(await p.evaluate(() => CITY_BY_NAME['허창'])));
await p.screenshot({ path: SH + 'm_create.png' });
await p.click('button:has-text("이 인물로 시작")'); await p.waitForTimeout(400);
await p.click('#modalLayer .btn.pri'); await p.waitForTimeout(300);
for (let i = 0; i < 6; i++) { await p.waitForTimeout(250); const m = await p.$('#modalLayer.on footer .btn.pri'); if (!m) break; await m.click(); }
await p.screenshot({ path: SH + 'm_game.png' });
// 탐색 → 친교 → 이동
await p.click('.cmd:has-text("탐색")'); await p.waitForTimeout(300);
if (await p.$('#modalLayer.on')) await p.click('#modalLayer .btn.pri');
await p.click('.cmd:has-text("친교")'); await p.waitForTimeout(300);
if (await p.$('#modalLayer.on .pickList .offRow')) { await p.click('#modalLayer .pickList .offRow >> nth=0'); await p.click('#modalLayer footer .btn.pri'); }
await p.waitForTimeout(200);
await p.screenshot({ path: SH + 'm_after.png' });
console.log(await p.evaluate(() => `${me().name} ${role()} ap=${G.ap} bond=${JSON.stringify(me().bond)} pgold=${G.pgold}`));
// 거병 (허창은 빈 땅)
await p.evaluate(() => { G.ap = 3; UI.refresh(); });
await p.click('.cmd:has-text("거병")'); await p.waitForTimeout(200);
await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(300);
await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(300);
console.log(await p.evaluate(() => `${me().name} ${role()} ${facName(me().f)} 병사 ${G.cities[me().city].troops}`));
await p.screenshot({ path: SH + 'm_ruler.png' });
// 전투 화면 (휴대폰)
await p.evaluate(() => { const c = G.cities[CITY_BY_NAME['허창']]; c.troops = 9000; const t = G.cities[CITY_BY_NAME['진류']]; const o = me(); runWar(c, t, [{ oid: o.id, troops: 6000, type: 'cav' }], 3000); });
await p.waitForTimeout(400); await p.click('#modalLayer .btn.pri'); await p.waitForTimeout(800);
await p.screenshot({ path: SH + 'm_battle.png' });
console.log('ERR', errs);
await b.close();
