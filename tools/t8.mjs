import { chromium } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.click('#bNew'); await p.click('.modeCard >> nth=1'); await p.waitForTimeout(300);
await p.screenshot({ path: SH + 'bio_pick.png' });
await p.click('.ofCard:has-text("유비")'); await p.waitForTimeout(400);
for (let i = 0; i < 6; i++) { await p.waitForTimeout(250); const m = await p.$('#modalLayer.on footer .btn.pri'); if (!m) break; await m.click(); }
await p.evaluate(() => UI.officerInfo(byName('관우'))); await p.waitForTimeout(300);
await p.screenshot({ path: SH + 'bio_info.png' });
console.log('ERR', errs); await b.close();
