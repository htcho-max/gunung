import { GAME, SHOTS } from './env.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(GAME);
const r = await p.evaluate(async () => {
  window.__fast = true; Setup.scen = 195; Setup.open(); Setup.start(G.officers.find(x => x.name === '사섭').id);
  UI.modal = async o => (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k;
  for (let i = 0; i < 24; i++) await endMonth();
  const tot = G.cities.reduce((a, c) => a + (c.f >= 0 ? c.troops : 0), 0);
  return `${G.year}.${G.month} battles ${G.stats.battles} flank ${G.stats.flank || 0} troops ${tot} negative ${G.cities.filter(c => c.troops < 0 || c.food < 0).map(c => c.name)}`;
});
console.log(r, 'ERR', errs.slice(0, 3)); await b.close();
