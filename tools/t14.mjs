import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html'); await p.evaluate(() => window.__fast = true);
const r = await p.evaluate(async () => {
  Setup.scen = 200; Setup.open(); Setup.start(G.officers.find(x => x.name === '조조').id);
  const c = G.cities[me().city]; c.gold = 5000;
  for (const o of factionOfficers(me().f)) if (!isRuler(o)) o.loy = 60;
  const seq = ['low', 'x']; const seen = [];
  UI.modal = async o => { seen.push(o.body.querySelectorAll('.offRow').length); return seq.shift() || 'x'; };
  await UI.cmdReward(c);
  const others = factionOfficers(me().f).filter(o => !isRuler(o) && o.city !== c.id);
  return { rows: seen, rewardedFar: others.filter(o => o.loy > 60).length + '/' + others.length, gold: c.gold };
});
console.log(JSON.stringify(r), 'ERR', errs); await b.close();
