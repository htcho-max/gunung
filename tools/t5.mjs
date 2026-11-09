import { GAME, SHOTS } from './env.mjs';
// 사건 하나씩 따로 시험: 새 게임 → 다른 사건은 끝난 것으로 → 대상 사건만
import { chromium } from 'playwright';
const SH = SHOTS;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
await p.goto(GAME);
async function only(id, who, setup, picks, shot) {
  await p.evaluate(([id, who, setup]) => {
    newGame({ diff: 1 }); G.player = byName(who).id; G.pgold = 100;
    for (const e of EVENTS) if (e.id !== id) G.ev[e.id] = true;
    new Function(setup)();
    startPlaying(false); window.__done = false; runEvents().then(() => window.__done = true);
  }, [id, who, setup]);
  let i = 0;
  while (true) {
    await p.waitForTimeout(250);
    if (await p.evaluate(() => window.__done)) break;
    if (!await p.$('#modalLayer.on footer .btn')) continue;
    if (shot && i < 6) await p.screenshot({ path: SH + shot + i + '.png' });
    const k = picks[i] ?? 0; i++;
    await p.click(`#modalLayer footer .btn >> nth=${k}`);
  }
  // 남은 알림 닫기
  for (let j = 0; j < 4; j++) { await p.waitForTimeout(200); if (await p.$('#modalLayer.on footer .btn')) await p.click('#modalLayer footer .btn >> nth=0'); }
}
// 1) 삼고초려: 유비가 세 번 찾아감
await only('three_visits', '유비', "G.year=201; const z=byName('제갈량'); z.st='ronin'; z.city=me().city;", [0, 0, 0, 0], 'tv');
console.log('삼고초려 →', await p.evaluate(() => `${byName('제갈량').st} ${facName(byName('제갈량').f)} 충성${byName('제갈량').loy}`));
// 2) 삼고초려 도중 그만둠
await only('three_visits', '유비', "G.year=201; const z=byName('제갈량'); z.st='ronin';", [0, 1], null);
console.log('그만둠 →', await p.evaluate(() => `${byName('제갈량').st}`));
// 3) 연환계: 동탁 플레이, 초선을 곁에 둠 → 죽고 뒤를 이은 사람으로 계속
await only('chain', '동탁', "G.year=192; G.month=5;", [0, 0, 0, 0], 'ch');
console.log('연환계(동탁) →', await p.evaluate(() => `나=${me().name} ${role()} | 여포 ${facName(byName('여포').f)} ${rankName(byName('여포'))} 성 ${citiesOf(byName('여포').f).map(c=>c.name)} | 장료 ${facName(byName('장료').f)}`));
// 4) 연환계: 동탁 플레이, 초선을 여포에게
await only('chain', '동탁', "G.year=192; G.month=5;", [1], null);
console.log('연환계(피함) →', await p.evaluate(() => `동탁 ${byName('동탁').st} 여포충성 ${byName('여포').loy} 왕윤 ${byName('왕윤').st}`));
// 5) 연환계: 여포 플레이
await only('chain', '여포', "G.year=192; G.month=5;", [0, 0, 0], null);
console.log('연환계(여포) →', await p.evaluate(() => `나=${me().name} ${role()} ${facName(me().f)} 성 ${citiesOf(me().f).map(c=>c.name)}`));
// 6) 서주 양도: 유비 플레이
await only('xuzhou', '유비', "G.year=194;", [0, 0], 'xz');
console.log('서주 →', await p.evaluate(() => `유비 성 ${citiesOf(me().f).map(c=>c.name)} 장수 ${factionOfficers(me().f).length} 도겸 ${byName('도겸').st} 도겸군 ${G.factions.find(f=>f.key==='tq').alive}`));
// 7) 관도: 원소 플레이, 허유 물리침
await only('guandu', '원소', "G.year=199; const c=cityN('업'); c.f=byName('조조').f;", [0, 0, 0], 'gd');
console.log('관도 →', await p.evaluate(() => `허유 ${facName(byName('허유').f)} | ${G.log.slice(0,2).map(l=>l.text).join(' / ')}`));
// 8) 손견 현산: 손견 플레이, 추격 멈춤
await only('sunjian_death', '손견', "G.year=191; G.month=6; Math.random=(()=>{const r=Math.random;return ()=>0.01;})();", [1], 'sj');
console.log('현산 →', await p.evaluate(() => `손견 ${byName('손견').st}`));
// 9) 도원결의
await only('peach', '관우', "", [0], 'pc');
// 10) 휴대폰 장면
await p.setViewportSize({ width: 390, height: 844 });
await only('emperor', '조조', "G.year=196; cityN('허창').f=byName('조조').f;", [0, 0], 'ph');
console.log('ERR', errs);
await b.close();
