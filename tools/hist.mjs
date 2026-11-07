// 역사 흐름 측정: 여러 판을 돌려 해마다 세력별 성 수를 봄
import { chromium } from 'playwright';
const runs = +(process.argv[2] || 3), months = +(process.argv[3] || 72), who = process.argv[4] || '공융', hist = process.argv[5] ?? '1';
const b = await chromium.launch();
const errs = [];
for (let r = 0; r < runs; r++) {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/gunung/dist/index.html'); await p.evaluate(() => window.__fast = true);
  await p.evaluate(([who, hist]) => {
    Setup.diff = 1; Setup.hist = hist === '1'; Setup.open(); Setup.start(G.officers.find(x => x.name === who).id);
    UI.modal = async o => (o.buttons && o.buttons.length ? (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k : 'ok');
    BattleUI.run = async B => { B.auto = true; runBattleHeadless(B); };
  }, [who, hist]);
  const line = [];
  for (let i = 0; i < months; i++) {
    await p.evaluate(() => endMonth());
    if (i % 12 === 11) line.push(await p.evaluate(() => {
      const fs = G.factions.filter(f => f.alive).map(f => [f.name + '(' + (FACTION_DEFS.find(d => d[0] === f.key)?.[1] || f.key.slice(0, 2)) + ')', citiesOf(f.id).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
      return `${G.year}: ${fs.slice(0, 7).map(x => x[0] + x[1]).join(' ')} [${fs.length}세력]`;
    }));
  }
  console.log(`== 판 ${r + 1}`); line.forEach(l => console.log(l));
  console.log('사건', await p.evaluate(() => Object.keys(G.ev).join(' ')));
  await p.close();
}
console.log('ERR', errs.slice(0, 5));
await b.close();
