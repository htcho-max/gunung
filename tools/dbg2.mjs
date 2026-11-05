import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERR', e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.evaluate(() => { Setup.open(); Setup.start(G.officers.find(x => x.name === '유비').id); UI.modal = async o => (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k; BattleUI.run = async B => runBattleHeadless(B); });
for (let i = 0; i < 96; i++) await p.evaluate(() => endMonth());
console.log(await p.evaluate(() => { const out=[]; for (const F of G.factions.filter(f=>f.alive)) { const ruler=G.officers[F.ruler]; const aggr=.85+(ruler.war-60)/160-(ruler.int-60)/400; for (const c of citiesOf(F.id)) { const offs=officersIn(c.id,F.id); const pool=offs.filter(o=>o.id!==c.gov); const ts=ADJ[c.id].map(i=>G.cities[i]).filter(t=>t.f!==F.id&&!isAlly(F.id,t.f)); let s=`${F.name}/${c.name} 병${c.troops} 훈${c.train} 쌀${c.food} 장${offs.length} 풀${pool.length} idle${F.idle} ->`; for (const t of ts){ const tOffs=t.f>=0?officersIn(t.id,t.f):[]; if(!tOffs.length){s+=` ${t.name}(빈)`;continue;} if(!pool.length) {s+=` ${t.name}(-)`;continue;} const top=[...pool].sort((a,b)=>(b.lead+b.war)-(a.lead+a.war)).slice(0,5); const myQ=top.reduce((a,o)=>a+o.lead*.55+o.war*.45,0)/top.length; const thQ=tOffs.slice(0,5).reduce((a,o)=>a+o.lead*.6+o.int*.2+o.war*.2,0)/Math.min(5,tOffs.length); const r=(c.troops*.75*myQ*(.6+c.train/250))/(t.troops*thQ*(.6+t.train/250)*(1.15+Math.min(.5,t.wall/2000))); s+=` ${t.name}${r.toFixed(2)}`;} out.push(s);} } return out.join('\n'); }));
console.log(await p.evaluate(()=>Object.keys(G.ally).length));
await b.close();
