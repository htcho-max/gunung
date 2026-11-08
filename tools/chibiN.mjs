import { chromium } from 'playwright';
const b = await chromium.launch(); const res = {};
for (let r = 0; r < 10; r++) {
  const p = await b.newPage(); await p.goto('file:///home/claude/gunung/dist/index.html');
  const out = await p.evaluate(async () => {
    window.__fast = true; Setup.scen = 208; Setup.open(); Setup.start(G.officers.find(x => x.name === '사섭').id);
    UI.modal = async o => (o.buttons && o.buttons.length ? (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k : 'ok');
    for (let i = 0; i < 3 && !G.ev.chibi; i++) await endMonth();
    const t = G.chron.filter(c => c.title.startsWith('적벽')).map(c => c.title).pop();
    return t;
  });
  res[out] = (res[out] || 0) + 1; await p.close();
}
console.log(res); await b.close();
