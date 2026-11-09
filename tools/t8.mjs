import { GAME, SHOTS } from './env.mjs';
import { chromium } from 'playwright';
const SH = SHOTS;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(GAME);
await p.click('#bNew'); await p.click('.modeCard >> nth=1'); await p.waitForTimeout(300);
await p.screenshot({ path: SH + 'bio_pick.png' });
await p.click('.ofCard:has(.nm:text-is("유비"))'); await p.waitForTimeout(400);
for (let i = 0; i < 6; i++) { await p.waitForTimeout(250); const m = await p.$('#modalLayer.on footer .btn.pri'); if (!m) break; await m.click(); }
await p.evaluate(() => UI.officerInfo(byName('관우'))); await p.waitForTimeout(300);
await p.screenshot({ path: SH + 'bio_info.png' });
console.log('ERR', errs); await b.close();
