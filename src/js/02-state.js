// ===== 게임 상태 =====
let G = null;          // 현재 게임
let ADJ = [];          // 도시 인접 목록
const CITY_BY_NAME = {};

function buildAdj() {
  ADJ = CITY_DEFS.map(() => []);
  CITY_DEFS.forEach((c, i) => CITY_BY_NAME[c[0]] = i);
  for (const pair of ROAD_DEFS.split(/\s+/).filter(Boolean)) {
    const [a, b] = pair.split('-').map(n => CITY_BY_NAME[n]);
    if (a == null || b == null) { console.warn('길 오류', pair); continue; }
    if (!ADJ[a].includes(b)) ADJ[a].push(b);
    if (!ADJ[b].includes(a)) ADJ[b].push(a);
  }
}
buildAdj();

const START_YEAR = 190;
const TROOP_MUL = { dz: 1.7, ys: 1.25, ysh: 1.2, cc: .9, lb: .7, kr: .8, gd: 1, md: 1.1, sj: 1, lbi: 1.05, ly: 1.05, tq: 1, gz: 1.15, hf: 1.15 };

function newGame(opts = {}) {
  const g = { ver: 1, year: START_YEAR, month: 1, factions: [], cities: [], officers: [], log: [], rel: {}, ally: {}, player: -1, ap: 3, seen: {}, over: false, pgold: 0, stats: { battles: 0, wins: 0 } };
  const fIdx = {};
  FACTION_DEFS.forEach(([key, name, ruler, color], i) => { fIdx[key] = i; g.factions.push({ id: i, key, name, color, ruler: -1, alive: true, capital: -1 }); });
  CITY_DEFS.forEach(([name, han, x, y, own, s], i) => {
    const f = own ? fIdx[own] : -1;
    const agriMax = 260 + s * 140, commMax = 220 + s * 140;
    const mul = own ? (TROOP_MUL[own] || 1) : 0;
    g.cities.push({
      id: i, name, han, x, y, size: s, f,
      pop: 60000 * s + ri(0, 40000), gold: own ? 300 + s * 120 : 100, food: own ? 4000 + s * 2500 : 1500,
      troops: own ? Math.round((2500 + s * 1700) * mul / 100) * 100 : 0, train: own ? ri(45, 70) : 0,
      agri: Math.round(agriMax * (.35 + rand() * .2)), agriMax, comm: Math.round(commMax * (.3 + rand() * .2)), commMax,
      order: own ? ri(50, 75) : ri(30, 55), wall: 150 + s * 110, wallMax: 250 + s * 150, gov: -1, deleg: false,
    });
  });
  OFFICER_DEFS.trim().split('\n').forEach((line, i) => {
    const [name, born, lead, war, int, pol, cha, fk, city, die, tag] = line.split(',');
    const b = +born;
    const hist = +die;
    const life = hist - b >= 55 ? hist : b + 58 + ri(0, 16);
    const o = {
      id: i, name, born: b, die: life, lead: +lead, war: +war, int: +int, pol: +pol, cha: +cha,
      f: fk ? fIdx[fk] : -1, city: CITY_BY_NAME[city], loy: 80, merit: 0, fame: Math.round((+lead + +war + +int + +pol + +cha) / 5),
      st: 'on', acted: false, ideal: hashStr(name) % 100, tag: tag || '', found: false, home: CITY_BY_NAME[city], fk: fk || '',
    };
    if (o.city == null) console.warn('도시 오류', line);
    if (START_YEAR - b < 16) { o.st = 'unborn'; o.f = -1; }
    else if (o.f < 0) o.st = 'ronin';
    g.officers.push(o);
  });
  // 군주 지정
  g.factions.forEach(f => {
    const r = g.officers.find(o => o.name === FACTION_DEFS[f.id][2]);
    f.ruler = r.id; f.capital = r.city; r.loy = 100; r.merit = 1000;
  });
  // 묶음끼리는 이상(궁합)이 가깝고 충성 100
  const tagIdeal = {};
  g.officers.forEach(o => {
    if (o.tag) { if (tagIdeal[o.tag] == null) tagIdeal[o.tag] = o.ideal; o.ideal = (tagIdeal[o.tag] + ri(0, 4)) % 100; }
    if (o.f >= 0 && o.st === 'on') {
      const ruler = g.officers[g.factions[o.f].ruler];
      o.loy = (o.tag && o.tag === ruler.tag) ? 100 : clamp(100 - affDist(o, ruler) - ri(0, 18), 62, 98);
      o.merit = ri(100, 400) + o.fame * 3;
    }
  });
  // 세력 사이 우호도
  g.factions.forEach(a => g.factions.forEach(b => { if (a.id < b.id) g.rel[a.id + ',' + b.id] = 40 + ri(0, 20); }));
  G = g;
  assignGovs();
  return g;
}

// 궁합 거리(0~50)
function affDist(a, b) { const d = Math.abs(a.ideal - b.ideal); return Math.min(d, 100 - d); }

const off = id => G.officers[id];
const city = id => G.cities[id];
const fac = id => G.factions[id];
const facName = id => id < 0 ? '재야' : G.factions[id].name;
const facColor = id => id < 0 ? '#8c8676' : G.factions[id].color;
const me = () => G.officers[G.player];
const officersIn = (cid, f) => G.officers.filter(o => o.st === 'on' && o.city === cid && (f === undefined || o.f === f));
const roninIn = cid => G.officers.filter(o => o.st === 'ronin' && o.city === cid);
const citiesOf = f => G.cities.filter(c => c.f === f);
const isRuler = o => o.f >= 0 && G.factions[o.f].ruler === o.id;
function relKey(a, b) { return a < b ? a + ',' + b : b + ',' + a; }
function getRel(a, b) { return G.rel[relKey(a, b)] ?? 50; }
function addRel(a, b, d) { G.rel[relKey(a, b)] = clamp(getRel(a, b) + d, 0, 100); }
const mIdx = () => (G.year - START_YEAR) * 12 + G.month;
function isAlly(a, b) { if (a < 0 || b < 0 || a === b) return false; const v = G.ally[relKey(a, b)]; return !!v && (v === true || v > mIdx()); }
function makeAlly(a, b) { G.ally[relKey(a, b)] = mIdx() + 36; }
function allyLeft(a, b) { const v = G.ally[relKey(a, b)]; return v === true ? 36 : Math.max(0, v - mIdx()); }
function hostile(a, b) { return a !== b && !isAlly(a, b); }

function role() {
  const m = me(); if (!m) return 'none';
  if (m.st === 'ronin') return 'ronin';
  if (m.st !== 'on') return 'none';
  if (isRuler(m)) return 'ruler';
  if (G.cities[m.city].gov === m.id) return 'gov';
  return 'officer';
}
const ROLE_NAME = { ruler: '군주', gov: '태수', officer: '장수', ronin: '재야', none: '' };
function rankName(o) {
  if (o.st === 'ronin') return '재야';
  if (o.st !== 'on') return '';
  if (isRuler(o)) return '군주';
  if (G.cities[o.city].gov === o.id) return '태수';
  const m = o.merit;
  return m >= 3000 ? '장군' : m >= 1800 ? '중랑장' : m >= 900 ? '교위' : m >= 400 ? '사마' : '종사';
}
// 플레이어가 직접 명령하는 도시인가
function playerControls(c) {
  const r = role(), m = me();
  if (r === 'ruler') return c.f === m.f && !c.deleg;
  if (r === 'gov') return c.id === m.city && c.gov === m.id;
  return false;
}

function assignGovs() {
  for (const c of G.cities) {
    if (c.f < 0) { c.gov = -1; continue; }
    const offs = officersIn(c.id, c.f);
    const ruler = G.factions[c.f].ruler;
    if (offs.some(o => o.id === ruler)) { c.gov = ruler; continue; }
    const cur = c.gov >= 0 ? G.officers[c.gov] : null;
    if (cur && cur.st === 'on' && cur.city === c.id && cur.f === c.f) continue;
    if (!offs.length) { c.gov = -1; continue; }
    offs.sort((a, b) => govScore(b) - govScore(a));
    c.gov = offs[0].id;
  }
}
const govScore = o => o.merit / 20 + o.lead + o.pol / 2 + o.cha / 2;

function age(o) { return G.year - o.born; }
function logMsg(text, kind = '') { G.log.unshift({ t: `${G.year}.${G.month}`, text, kind }); if (G.log.length > 120) G.log.length = 120; }

// ===== 저장 =====
const SAVE_KEY = 'gunung.v1.';
function saveGame(slot) {
  const data = JSON.stringify(G);
  store(SAVE_KEY + slot, data);
  store(SAVE_KEY + slot + '.meta', JSON.stringify({ t: Date.now(), d: `${G.year}년 ${G.month}월`, who: me() ? me().name : '', role: ROLE_NAME[role()] }));
}
function loadGame(slot) {
  const s = store(SAVE_KEY + slot); if (!s) return false;
  try { G = JSON.parse(s); return true; } catch (e) { return false; }
}
function saveMeta(slot) { try { return JSON.parse(store(SAVE_KEY + slot + '.meta') || 'null'); } catch (e) { return null; } }
