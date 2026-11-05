import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERR', e.stack));
await p.goto('file:///home/claude/gunung/dist/index.html');
await p.evaluate(() => { Setup.open(); Setup.start(G.officers.find(x => x.name === '조조').id); UI.modal = async o => (o.buttons.find(b => b.cls === 'pri') || o.buttons[0]).k; BattleUI.run = async B => runBattleHeadless(B); });
for (let i = 0; i < 24; i++) await p.evaluate(() => endMonth());
console.log(await p.evaluate(() => G.cities.filter(c=>c.f>=0).map(c => `${c.name}:${facName(c.f)} 병${c.troops} 훈${c.train} 금${c.gold} 쌀${c.food} 장${officersIn(c.id,c.f).length}`).join('\n')));
console.log(await p.evaluate(() => { const out=[]; for (const F of G.factions.filter(f=>f.alive)) { for (const c of citiesOf(F.id)) for (const t of ADJ[c.id].map(i=>G.cities[i]).filter(t=>t.f!==F.id&&t.f>=0)) { const offs=officersIn(c.id,F.id); const tOffs=officersIn(t.id,t.f); if(!offs.length||!tOffs.length) continue; const top=[...offs].sort((a,b)=>(b.lead+b.war)-(a.lead+a.war)).slice(0,5); const myQ=top.reduce((a,o)=>a+o.lead*.55+o.war*.45,0)/top.length; const thQ=tOffs.slice(0,5).reduce((a,o)=>a+o.lead*.6+o.int*.2+o.war*.2,0)/Math.min(5,tOffs.length); const r=(c.troops*.75*myQ*(.6+c.train/250))/(t.troops*thQ*(.6+t.train/250)*(1.35+Math.min(.7,t.wall/1400))); out.push(`${c.name}→${t.name} ${r.toFixed(2)}`);} } return out.join(' '); }));
await b.close();
