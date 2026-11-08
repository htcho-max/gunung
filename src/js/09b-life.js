// ===== 장수의 삶: 술집 · 의형제 · 혼인 동맹 · 군주의 임무 =====

// ── 술집
const TAVERN_LINES = ['구석 자리에서 한 사내가 혼자 술잔을 기울이고 있다.', '거나하게 취한 장사꾼들이 떠들썩하다.', '주모가 따끈한 탁주를 내온다.', '비 내리는 밤, 술집에 낯선 손님이 들었다.'];
async function pTavern() {
  const P = me(), c = G.cities[P.city];
  UI.useAP();
  const paid = G.pgold >= 20; if (paid) G.pgold -= 20;
  P.bond = P.bond || {};
  const strangers = roninIn(c.id).filter(o => o.id !== P.id && !o.found);
  const rumorable = ITEMS.filter(it => { const st = G.items[it.id]; return st.holder < 0 && st.city >= 0 && !st.rumor; });
  const r = rand() + (paid ? .08 : 0);
  const head = pick(TAVERN_LINES);
  if (strangers.length && r < .5) {
    const o = pick(strangers); o.found = true; P.bond[o.id] = clamp((P.bond[o.id] || 0) + 8, 0, 100);
    SFX.play('ok');
    await UI.alert({ title: '술집', portrait: o, text: `${head}\n이야기를 나눠 보니 ${o.name}${bioOf(o)?.ja ? `(자 ${bioOf(o).ja})` : ''}${josa(o.name, '이라는', '라는').slice(o.name.length)} 인물이었다.\n${bioOf(o) ? bioOf(o).text : ''}\n\n친밀 +8` });
  } else if (rumorable.length && r < .8) {
    const it = pick(rumorable), st = G.items[it.id]; st.rumor = true;
    SFX.play('tick');
    await UI.alert({ title: '술집의 소문', text: `${head}\n"${G.cities[st.city].name} 어딘가에 ${it.kind} ${iga(it.name)} 숨어 있다더군."\n\n그 성에서 탐색하면 찾을 가능성이 커집니다. 들은 소문은 보물 창에서 다시 볼 수 있습니다.` });
  } else if (r < .95) {
    const pf = P.st === 'on' ? P.f : -1;
    const fx = (G.focus || []).filter(x => x.until > mIdx() && G.factions[x.f]?.alive && G.factions[x.t]?.alive);
    const aim = fx.find(x => x.t === pf) || pick(fx);
    const weak = ADJ[c.id].map(i => G.cities[i]).filter(x => x.f >= 0 && x.f !== pf).sort((a, b) => a.troops - b.troops)[0];
    const news = aim ? `"${G.factions[aim.f].name}군이 ${G.factions[aim.t].name}군을 노리고 군사를 모은다더군."` : weak ? `"${weak.name}에는 병사가 ${fmt(Math.round(weak.troops / 1000) * 1000)}명쯤밖에 없다던데."` : '"요즘은 조용하구먼."';
    await UI.alert({ title: '술집의 소문', text: `${head}\n${news}` });
  } else {
    const win = chance(.35 + P.war / 200);
    if (win) { P.fame += 2; SFX.play('clash'); }
    await UI.alert({ title: '술집', text: `${head}\n취한 무뢰배가 시비를 걸어왔다.${win ? '\n가볍게 제압하자 사람들이 박수를 쳤다. 명성 +2' : '\n엎치락뒤치락하다 술상만 엎었다.'}` });
  }
  checkMission();
  UI.refresh();
}

// ── 의형제
function canSwear(P, t) { return (P.bond?.[t.id] || 0) >= 80 && !isSworn(P, t) && (P.sworn || []).length < 3 && t.st !== 'dead' && !(t.st === 'on' && isRuler(t) && t.f !== P.f); }
async function offerSworn(P, t) {
  const p = clamp(.45 + ((P.bond[t.id] || 0) - 80) / 40 - affDist(P, t) / 90 + P.cha / 400, .1, .95);
  const k = await UI.choose({ title: '의형제', portrait: t, text: `${wa(t.name)} 마음이 깊이 통했습니다. 의형제를 맺자고 청해 볼까요?\n받아들일 가능성 약 ${Math.round(p * 100)}%\n\n의형제는 싸움터에서 가까이 있으면 서로 힘을 북돋우고(공격 +10%), 내가 떠나거나 일어설 때 함께합니다.`, options: [{ k: 'y', label: '향을 피우고 맹세한다' }, { k: 'n', label: '지금은 아니다' }] });
  if (k !== 'y') return;
  if (!chance(p)) { P.bond[t.id] -= 5; SFX.play('no'); UI.toast(`${eun(t.name)} "아직은 이르오" 하며 웃었습니다`); return; }
  P.sworn = [...(P.sworn || []), t.id]; t.sworn = [...(t.sworn || []), P.id];
  if (t.st === 'on' && t.f === P.f && !isRuler(t)) t.loy = 100;
  P.fame += 3; SFX.play('win');
  await UI.alert({ title: '의형제', portrait: t, text: `${P.name}${josa(P.name, '과', '와')} ${t.name}, 비록 성은 다르나 형제가 되기로 하늘에 맹세했다.\n"한날한시에 나지 못했으나, 한날한시에 죽기를 바라오."` });
}
// 내가 떠나거나 일어설 때 따라올 의형제
const swornOf = P => (P.sworn || []).map(id => G.officers[id]).filter(o => o && o.st !== 'dead' && o.st !== 'unborn' && !(o.st === 'on' && isRuler(o)));

// ── 혼인 동맹
function marryChance(env, fromF, toF) {
  const r = getRel(fromF, toF); if (r < 50) return 0;
  return clamp((r - 40) / 50 * (.5 + env.cha / 200) + .1, 0, .92);
}
function dipMarry(env, c, fromF, toF) {
  env.acted = true; c.gold -= 1000;
  if (chance(marryChance(env, fromF, toF))) {
    makeAllyFor(fromF, toF, 72); addRel(fromF, toF, 25); G.marry = G.marry || {}; G.marry[relKey(fromF, toF)] = true; env.merit += 100;
    logMsg(`${facName(fromF)}군과 ${facName(toF)}군이 혼인으로 맺어졌습니다 (6년 동맹)`, 'dip');
    return { ok: true, msg: `${facName(toF)}군이 혼담을 받아들였습니다!\n두 집안이 혼인으로 맺어져 6년 동안 동맹을 이룹니다. 혼인 동맹은 쉽게 깨지지 않습니다.` };
  }
  addRel(fromF, toF, -2);
  return { ok: false, msg: `${facName(toF)}군이 혼담을 정중히 거절했습니다. 예물로 보낸 금 1,000은 돌아오지 않았습니다.` };
}

// ── 군주의 임무 (장수 플레이)
const MISSIONS = {
  agri: { name: '개간', text: c => `${c.name}의 개간을 40 이상 올려라`, need: 40, val: c => c.agri },
  comm: { name: '상업', text: c => `${c.name}의 상업을 40 이상 올려라`, need: 40, val: c => c.comm },
  order: { name: '치안', text: c => `${c.name}의 치안을 10 이상 올려라`, need: 10, val: c => c.order },
  search: { name: '인재 탐색', text: c => `${c.name}에서 숨은 인재나 보물을 찾아내라`, need: 1 },
  bond: { name: '화합', text: (c, t) => `${t.name}${josa(t.name, '과', '와')} 친분을 20 이상 쌓아라`, need: 20 },
  train: { name: '수련', text: () => '능력 하나를 1 이상 갈고닦아라', need: 1, val: (c, P) => P.lead + P.war + P.int + P.pol + P.cha },
};
function newMission() {
  const P = me(); if (!P || role() !== 'officer') return null;
  const c = G.cities[P.city];
  const kinds = ['agri', 'comm', 'order', 'search', 'bond', 'train'].filter(k => k !== 'agri' || c.agri < c.agriMax - 50).filter(k => k !== 'comm' || c.comm < c.commMax - 50).filter(k => k !== 'order' || c.order < 85);
  const mates = factionOfficers(P.f).filter(o => o !== P && o.city === P.city);
  const k = pick(kinds.filter(x => x !== 'bond' || mates.length));
  const t = k === 'bond' ? pick(mates) : null;
  P.bond = P.bond || {};
  const M = { kind: k, cid: c.id, tid: t ? t.id : -1, until: mIdx() + 3, from: G.factions[P.f].ruler };
  M.base = k === 'bond' ? (P.bond[t.id] || 0) : k === 'search' ? 0 : MISSIONS[k].val(c, P);
  G.mission = M;
  return M;
}
function missionProgress(M) {
  const P = me(), c = G.cities[M.cid];
  if (M.kind === 'search') return M.got || 0;
  if (M.kind === 'bond') return ((P.bond || {})[M.tid] || 0) - M.base;
  return MISSIONS[M.kind].val(c, P) - M.base;
}
function missionText(M) { return MISSIONS[M.kind].text(G.cities[M.cid], G.officers[M.tid]); }
function checkMission(monthEnd) {
  const P = me(), M = G.mission;
  if (!M || !P) return;
  if (P.st !== 'on' || role() !== 'officer' || G.factions[P.f].ruler !== M.from) { G.mission = null; return; }
  const ruler = G.officers[M.from];
  if (missionProgress(M) >= MISSIONS[M.kind].need) {
    G.mission = null; G.missionNext = mIdx() + 1;
    P.merit += 150; P.fame += 2; G.pgold += 120; P.bond = P.bond || {}; P.bond[ruler.id] = clamp((P.bond[ruler.id] || 0) + 10, 0, 100);
    SFX.play('win');
    UI.queue({ title: '임무 완수', portrait: ruler, text: `"${missionText(M)}" — 해냈구나! 과연 믿을 만하다.\n\n공적 +150 · 상금 120 · 명성 +2 · 군주와의 친분 +10` });
    if (!monthEnd) UI.flush();
  } else if (monthEnd && mIdx() >= M.until) {
    G.mission = null; G.missionNext = mIdx() + 1;
    P.merit = Math.max(0, P.merit - 40); P.bond = P.bond || {}; P.bond[ruler.id] = Math.max(0, (P.bond[ruler.id] || 0) - 5);
    UI.queue({ title: '임무 실패', portrait: ruler, text: `"${missionText(M)}" — 기한이 지났다. 다음에는 실망시키지 마라.\n\n공적 −40` });
  }
}
function monthlyMission() {
  checkMission(true);
  const P = me();
  if (!G.mission && P && role() === 'officer' && mIdx() >= (G.missionNext || 0) && chance(.6)) {
    const M = newMission();
    if (M) UI.queue({ title: '군주의 명', portrait: G.officers[M.from], text: `${P.name}, 그대에게 일을 맡기겠다.\n"${missionText(M)}"\n기한은 석 달이다.` });
  }
}
function missionCard() {
  const M = G.mission; if (!M) return null;
  const prog = clamp(missionProgress(M), 0, MISSIONS[M.kind].need), need = MISSIONS[M.kind].need, left = M.until - mIdx();
  return el('div', { class: 'mission' }, icon('order'), el('div', { style: 'flex:1;min-width:0' },
    el('div', {}, el('b', {}, '임무 '), missionText(M)),
    el('div', { class: 'bar', style: 'margin-top:4px' }, el('i', { style: `width:${prog / need * 100}%` })),
    el('div', { class: 'muted', style: 'font-size:12px' }, `${prog} / ${need} · 남은 기한 ${Math.max(0, left)}달`)));
}
