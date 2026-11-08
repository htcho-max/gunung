// 1단계: 특기·보물·사전·연표
import { chromium } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.click('#bNew'); await p.click('.modeCard >> nth=0'); await p.click('.ofCard:has(.nm:text-is("유비"))'); await p.waitForTimeout(400);
for (let i = 0; i < 8; i++) { await p.waitForTimeout(250); const m = await p.$('#modalLayer.on footer .btn.pri'); if (!m) break; await m.click(); }
console.log(await p.evaluate(() => `관우 ${byName('관우').war} 보물 ${byName('관우').items} 특기 ${skillsOf(byName('관우'))} | 여포 이동 ${itemMove(byName('여포'))} | 순욱 ${skillsOf(byName('순욱'))} | 자동 ${skillsOf(byName('기령'))}`));
await p.evaluate(() => UI.officerInfo(byName('관우'))); await p.waitForTimeout(300);
await p.screenshot({ path: SH + 'p1_info.png' }); await p.click('#modalLayer footer .btn');
// 보물 하사
await p.click('.cmd:has-text("보물")'); await p.waitForTimeout(250); await p.screenshot({ path: SH + 'p1_tr.png' });
await p.click('#modalLayer .pickList .offRow >> nth=0'); await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(200);
await p.click('#modalLayer .pickList .offRow:has-text("장비")'); await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(300);
await p.click('#modalLayer footer .btn.pri');
console.log(await p.evaluate(() => `장비 보물 ${byName('장비').items} 무력 ${byName('장비').war}`));
// 숨은 보물 찾기
console.log(await p.evaluate(() => { const c = cityN('양양'); const o = byName('채모'); let r; for (let i = 0; i < 40 && !(r && r.item); i++) { o.acted = false; r = cmdSearch(o, c); } return `탐색 → ${r && r.item ? r.item.name + ' → ' + r.to.name : '못 찾음'}`; }));
// 연표·사전
await p.evaluate(() => UI.chronicle()); await p.waitForTimeout(250); await p.screenshot({ path: SH + 'p1_chron.png' }); await p.click('#modalLayer .pickList .offRow >> nth=0'); await p.waitForTimeout(300); await p.screenshot({ path: SH + 'p1_replay.png' });
await p.click('#modalLayer footer .btn.pri'); await p.waitForTimeout(200); await p.click('#modalLayer footer .btn');
await p.evaluate(() => UI.officerList()); await p.click('.tab:has-text("인물 사전")'); await p.waitForTimeout(200); await p.screenshot({ path: SH + 'p1_dict.png' });
console.log('ERR', errs); await b.close();
