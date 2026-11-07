import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file:///home/claude/gunung/dist/index.html'); await p.evaluate(() => window.__fast = true);
await p.evaluate(() => { Setup.diff = 1; Setup.hist = true; Setup.open(); Setup.start(G.officers.find(x => x.name === '공융').id); UI.modal = async o => (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k; BattleUI.run = async B => runBattleHeadless(B); UI._close && UI._close('ok'); });
for (let i = 0; i < 24; i++) { await p.evaluate(() => endMonth()); }
console.log(await p.evaluate(() => G.log.filter(l => /동탁군이|이각군이|가후군이/.test(l.text) && /차지|함락/.test(l.text)).reverse().map(l => l.t + ' ' + l.text).join('\n')));
console.log(await p.evaluate(() => Object.keys(G.ev).join(' ')));
await b.close();
