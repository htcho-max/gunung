// 튜토리얼을 실제 클릭으로 끝까지
import { chromium, devices } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/tut/';
import fs from 'fs'; fs.mkdirSync(SH, { recursive: true });
const phone = process.argv[2] === 'phone';
const b = await chromium.launch(); const ctx = await b.newContext(phone ? devices['iPhone 13'] : { viewport: { width: 1366, height: 768 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html'); await p.evaluate(() => { window.__fast = true; BattleUI.fast = true; });
await p.click('#bTut'); await p.waitForTimeout(600);
const step = () => p.evaluate(() => G.tut ? G.tut.step : -1);
const modalPri = async () => { const bt = await p.$('#modalLayer.on footer .btn.pri:not([disabled]), #modalLayer.on footer .btn.red:not([disabled])'); if (bt) { await bt.click(); await p.waitForTimeout(350); return true; } return false; };
const tap = (x, y) => phone ? p.touchscreen.tap(x, y) : p.mouse.click(x, y);
let last = -2, guard = 0;
while (guard++ < 300) {
  const s = await step(); if (s < 0) break;
  if (s !== last) { await p.waitForTimeout(350); await p.screenshot({ path: `${SH}${phone ? 'p' : 'd'}_${String(s).padStart(2, '0')}.png` }); last = s; }
  const nextBtn = await p.$('.tutBox .tutFoot .btn');
  if (nextBtn && !(await p.$('#modalLayer.on'))) { await nextBtn.click(); await p.waitForTimeout(250); continue; }
  const title = await p.evaluate(() => TUT_STEPS[G.tut.step].title);
  if (await p.$('#modalLayer.on')) {
    // 고르는 창: 첫 줄 고르고 확인
    const row = await p.$('#modalLayer.on .pickList .offRow');
    if (row && !(await p.$('#modalLayer.on .pickList .offRow.on'))) {
      if (title === '출진') { const rows = await p.$$('#modalLayer.on .pickList .offRow'); for (const r of rows) if ((await r.textContent()).includes('복양')) { await r.click(); break; } } else await row.click();
      await p.waitForTimeout(150);
    }
    if (!(await modalPri())) { const any = await p.$('#modalLayer.on footer .btn:not([disabled])'); if (any) await any.click(); }
    await p.waitForTimeout(200); continue;
  }
  if (title === '내정: 개간') { await p.click('.cmd[title="개간"]'); continue; }
  if (title === '군사: 징병') { await p.click('.cmd[title="징병"]'); continue; }
  if (title === '다음 달로') { if (await p.isEnabled('#bEnd')) await p.click('#bEnd'); await p.waitForTimeout(800); continue; }
  if (title === '적을 살펴보기') { const pt = await p.evaluate(() => { const r = MapView.cv.getBoundingClientRect(), c = tutTarget(); return { x: r.left + MapView.ox + c.x * MapView.s, y: r.top + MapView.oy + c.y * MapView.s }; }); await tap(pt.x, pt.y); await p.waitForTimeout(300); continue; }
  if (title === '출진') { await p.click('.cmd[title="출진"]'); await p.waitForTimeout(400); continue; }
  if (title === '부대 움직이기') {
    const pt = await p.evaluate(() => { const U = BattleUI; if (!U.sel || !U.reach) return null; const tiles = [...U.reach.keys ? U.reach.keys() : Object.keys(U.reach)].map(Number).filter(i => i !== U.sel.at); const i = tiles.sort((a, b) => tQ(b) - tQ(a))[0]; const c = U.center(i), r = U.cv.getBoundingClientRect(); return { x: r.left + c.x, y: r.top + c.y }; });
    if (pt) await tap(pt.x, pt.y); await p.waitForTimeout(500); continue;
  }
  if (title === '공격과 대기') { const e = await p.$('#bpanel .btn.red'); if (e) await e.click(); await p.waitForTimeout(800); continue; }
  if (title === '끝까지 싸우기') { const a = await p.$('#btop [title="자동 전투"], #btop button:has-text("자동")'); if (a) await a.click().catch(() => {}); await p.waitForTimeout(1500); continue; }
  await p.waitForTimeout(400);
}
console.log('done step', await step(), 'tut', await p.evaluate(() => JSON.stringify(G.tut)), '복양', await p.evaluate(() => facName(cityN('복양').f)), 'ev after', await p.evaluate(() => Object.keys(G.ev).join(',')));
console.log('ERR', errs.slice(0, 3)); await b.close();
