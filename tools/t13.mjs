// 먼 길 이동·수송
import { chromium } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html'); await p.evaluate(() => window.__fast = true);
const out = await p.evaluate(async () => {
  Setup.scen = 200; Setup.open(); Setup.start(G.officers.find(x => x.name === '조조').id);
  UI.modal = async o => (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k;
  const log = []; const F = me().f;
  const from = G.cities[CITY_BY_NAME['허창']], R = routesFrom(from.id, F);
  log.push('routes ' + R.map(r => r.c.name + r.months).join(' '));
  const far = R.sort((a, b) => b.months - a.months)[0];
  const o = officersIn(from.id, F).find(x => !isRuler(x));
  const m = cmdMove(o, far.c.id, far.path); log.push(`move ${o.name} → ${far.c.name} ${m}달, in city? ${officersIn(from.id, F).includes(o)}`);
  const e = officersIn(from.id, F).find(x => !isRuler(x) && !x.acted);
  const t0 = far.c.troops, g0 = far.c.gold;
  const r = cmdTransport(e, from, far.c, 300, 1000, 2000, far.path); log.push(r.msg);
  // 나도 먼 길
  const P = me(); const near = R.find(r => r.months === 1);
  P.travel = { to: near.c.id, path: near.path, start: mIdx(), eta: mIdx() + 1 }; G.ap = 0; UI.refresh();
  return { log, far: far.c.id, oid: o.id, t0, g0, months: m };
});
console.log(out.log.join('\n'));
for (let i = 0; i < 4; i++) { const bt = await p.$('#modalLayer .btn.pri'); if (!bt) break; await bt.click().catch(() => {}); await p.waitForTimeout(300); }
await p.waitForTimeout(500); await p.screenshot({ path: SH + 'travel.png' });
for (let i = 0; i <= out.months; i++) {
  const s = await p.evaluate(async ({ far, oid }) => { await endMonth(); const o = G.officers[oid]; return `${G.year}.${G.month} ${o.name}@${G.cities[o.city].name} travel=${!!o.travel} 나@${G.cities[me().city].name} ap=${G.ap} 수송대 ${G.convoys.length} 목적지 병 ${G.cities[far].troops} 금 ${G.cities[far].gold}`; }, out);
  console.log(s);
}
console.log('ERR', errs.slice(0, 3)); await b.close();
