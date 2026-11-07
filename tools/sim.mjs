// AI 끼리 몇 년 돌려 보기 (전투는 보이지 않게)
import { chromium } from 'playwright';
const months = +(process.argv[2] || 60), who = process.argv[3] || '조조';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.evaluate(() => window.__fast = true);
await p.evaluate(who => {
  Setup.open(); const o = G.officers.find(x => x.name === who); Setup.start(o.id);
  UI.modal = async (opt) => (opt.buttons && opt.buttons.length ? (opt.buttons.find(b => b.cls === 'pri') || opt.buttons[0]).k : 'ok');
  BattleUI.run = async B => { B.auto = true; runBattleHeadless(B); };
}, who);
const t0 = Date.now();
for (let i = 0; i < months; i++) {
  await p.evaluate(() => endMonth());
  if (i % 12 === 11) console.log(await p.evaluate(() => `${G.year}.${G.month} ` + G.factions.filter(f => f.alive).map(f => `${f.name}${citiesOf(f.id).length}`).filter(s => !s.endsWith('0')).join(' ') + ` | 빈땅 ${G.cities.filter(c => c.f < 0).length} 전투 ${G.stats.battles} 장수 ${G.officers.filter(o=>o.st==='on').length} 재야 ${G.officers.filter(o=>o.st==='ronin').length} 사망 ${G.officers.filter(o=>o.st==='dead').length}`));
}
console.log('EVENTS', await p.evaluate(() => Object.keys(G.ev).join(' ')));
console.log(await p.evaluate(() => G.log.filter(l => l.kind === 'big').reverse().map(l => l.t + ' ' + l.text).filter(t => /동탁|옥새|여포|서주|손책|천자|관도|오소|서서|삼고|현산|손견/.test(t)).join('\n')));
console.log('ms/month', Math.round((Date.now() - t0) / months));
console.log('player', await p.evaluate(() => `${me().name} ${me().st} ${role()}`));
console.log(await p.evaluate(() => { const L=G.log; return "함락 "+L.filter(l=>/함락/.test(l.text)).length+" 수비 "+L.filter(l=>/지켜 냈/.test(l.text)).length; }));
console.log(await p.evaluate(() => G.log.slice(0, 8).map(l => l.t + ' ' + l.text).join('\n')));
console.log('ERR', errs.slice(0, 10));
await b.close();
