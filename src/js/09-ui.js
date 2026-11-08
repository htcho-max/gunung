// ===== 화면: 모달·패널·명령 =====
const STAT_NAMES = { lead: '통솔', war: '무력', int: '지력', pol: '정치', cha: '매력' };
const SEASON = m => m <= 2 || m === 12 ? '겨울' : m <= 5 ? '봄' : m <= 8 ? '여름' : '가을';

const monthsLabel = m => m <= 0 ? '이번 달' : `${m}달`;
const incomingTroops = cid => (G.convoys || []).filter(v => v.to === cid).reduce((a, v) => a + v.troops, 0);
const UI = {
  sel: -1, q: [], modalOpen: false,
  toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(this._tt); this._tt = setTimeout(() => e.classList.remove('on'), 2200); },
  busy(on) { $('#busy').classList.toggle('on', on); },
  // 모달: 버튼 키를 돌려줌
  modal({ title, portrait, text, body, buttons = [{ k: 'ok', label: '확인', cls: 'pri' }], wide, col, cancel }) {
    return new Promise(res => {
      const layer = $('#modalLayer');
      const done = k => { layer.classList.remove('on'); layer.innerHTML = ''; this.modalOpen = false; document.removeEventListener('keydown', onKey); res(k); };
      const onKey = e => { if (e.key === 'Escape' && cancel) done(cancel); if (e.key === 'Enter' && buttons.length === 1 && !e.target.matches('input')) done(buttons[0].k); };
      const box = el('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' },
        el('header', {}, el('h4', {}, title || ''), cancel ? el('button', { class: 'btn sm ghost', onclick: () => done(cancel), 'aria-label': '닫기' }, icon('close')) : null),
        el('div', { class: 'body' },
          (text || portrait) ? el('div', { class: 'msg' }, portrait ? portraitImg(portrait) : null, text ? el('div', {}, text) : null) : null,
          body || null),
        buttons.length ? el('footer', { class: col ? 'col' : '' }, buttons.map(b => el('button', { class: 'btn ' + (b.cls || (b.danger ? 'red' : '')), disabled: b.disabled, onclick: () => { if (b.check && !b.check()) return; done(typeof b.k === 'function' ? b.k() : b.k); } }, b.label))) : null);
      layer.innerHTML = ''; layer.append(box); layer.classList.add('on'); this.modalOpen = true;
      document.addEventListener('keydown', onKey);
      setTimeout(() => { const f = box.querySelector('footer .btn.pri, footer .btn'); f && f.focus(); }, 30);
      this._close = done;
    });
  },
  alert(o) { return this.modal({ ...o, buttons: [{ k: 'ok', label: '확인', cls: 'pri' }] }); },
  choose({ title, portrait, text, options, body }) {
    return this.modal({ title, portrait, text, body, col: options.length > 2, buttons: options.map((o, i) => ({ k: o.k, label: o.label, cls: o.danger ? 'red' : i === 0 ? 'pri' : '', disabled: o.disabled })) });
  },
  confirm(title, text) { return this.modal({ title, text, buttons: [{ k: false, label: '취소' }, { k: true, label: '확인', cls: 'pri' }] }); },
  queue(m) { this.q.push(m); },
  async flush() { while (this.q.length && !this.modalOpen) { const m = this.q.shift(); await this.alert(m); if (m.after) await m.after(); } },

  // ===== 다시 그리기 =====
  refresh() {
    if (!G || $('#scrGame').hidden) return;
    const P = me();
    if (this.sel < 0 || !G.cities[this.sel]) this.sel = P ? P.city : 0;
    this.renderTop(); this.renderSide(); MapView.draw();
    this.flush();
  },
  renderTop() {
    const P = me(), r = role();
    const top = $('#top'); top.innerHTML = '';
    const sIdx = G.month <= 2 || G.month === 12 ? 4 : G.month <= 5 ? 1 : G.month <= 8 ? 2 : 3;
    top.append(el('div', { class: 'datePlaque', title: SEASON(G.month) }, el('b', {}, `${G.year}년 ${G.month}월`), el('small', {}, eraName(G.year))),
      el('span', { class: 'season s' + sIdx, title: SEASON(G.month) }, SEASON(G.month)[0]));
    if (P) top.append(el('button', { class: 'who', onclick: () => this.officerInfo(P), 'aria-label': `${P.name} 정보` }, portraitImg(P, ''), el('span', { class: 'disp nmTxt', style: 'font-size:18px' }, P.name), el('span', { class: 'rank' }, rankName(P))));
    const chip = (cls, ic, label, val) => el('span', { class: 'chip ' + cls, title: label }, icon(ic), val);
    const chips = el('div', { class: 'chips' });
    if (P && P.st === 'on') {
      const F = G.factions[P.f], cs = citiesOf(P.f);
      chips.append(el('span', { class: 'chip', title: '세력' }, el('span', { class: 'dot', style: `background:${F.color}` }), `${F.name}군`),
        chip('c', 'wall', '성', cs.length), chip('p', 'people', '장수', factionOfficers(P.f).length),
        chip('t', 'troops', '병력', fmt(cs.reduce((a, c) => a + c.troops, 0))), chip('g', 'gold', '금', fmt(cs.reduce((a, c) => a + c.gold, 0))), chip('f', 'food', '쌀', fmt(cs.reduce((a, c) => a + c.food, 0))));
      if (r !== 'ruler') chips.append(chip('s', 'merit', '공적', P.merit));
    } else if (P) chips.append(chip('s', 'fame', '명성', P.fame), chip('g', 'gold', '소지금', fmt(G.pgold)));
    top.append(chips, el('span', { class: 'sp' }));
    const tb = (ic, label, fn) => el('button', { class: 'topBtn', onclick: fn, 'aria-label': label }, icon(ic), el('span', {}, label));
    top.append(tb('flag', '세력', () => this.factionList()), tb('people', '인물', () => this.officerList()), tb('menu', '메뉴', () => this.menu()));
  },
  renderSide() {
    const side = $('#side'), c = G.cities[this.sel], P = me(), r = role();
    const scroll = side.scrollTop;
    side.innerHTML = '';
    // 도시 정보
    const gov = c.gov >= 0 ? G.officers[c.gov] : null;
    const known = c.f >= 0 && P && P.st === 'on' && (c.f === P.f || isAlly(c.f, P.f) || ADJ[c.id].some(i => G.cities[i].f === P.f));
    const vis = known || (P && P.city === c.id) || (P && P.st === 'on' && c.f === P.f);
    const v = (x) => vis ? fmt(x) : '?';
    const fc = facColor(c.f);
    const isCap = c.f >= 0 && G.officers[G.factions[c.f].ruler]?.city === c.id;
    const head = el('div', { class: 'cityHead', style: `--fc:${fc}` },
      el('div', { class: 'cityName' },
        el('div', { class: 'banner' }, c.f >= 0 ? G.factions[c.f].name[0] : '空'),
        el('div', { style: 'min-width:0' },
          el('h3', {}, c.name, el('span', { class: 'han' }, c.han)),
          el('div', { class: 'sub' }, el('span', { class: 'stars', title: `규모 ${c.size}` }, '★'.repeat(c.size) + '☆'.repeat(5 - c.size)),
            el('span', {}, c.f >= 0 ? `${facName(c.f)}군${isCap ? ' 본거지' : ''}` : '주인 없는 땅'),
            gov ? el('span', {}, `· 태수 ${gov.name}${c.deleg ? ' (위임)' : ''}`) : null))));
    const big = (ic, col, label, val) => el('div', { class: 'bigStat', title: label }, el('span', { style: `color:${col}` }, icon(ic)), el('b', {}, val), el('span', {}, label));
    head.append(el('div', { class: 'bigStats' },
      big('pop', 'var(--sky)', '인구', vis ? (c.pop >= 10000 ? (c.pop / 10000).toFixed(1) + '만' : fmt(c.pop)) : '?'),
      big('gold', 'var(--brass3)', '금', v(c.gold)), big('food', '#e6c88a', '쌀', v(c.food)), big('troops', '#ef8a6c', '병사', v(c.troops))));
    const gauge = (ic, label, val, max, cls) => el('div', { class: 'gauge' }, icon(ic), el('span', {}, label), el('b', {}, vis ? (max === 100 ? val : `${val}/${max}`) : '?'), el('div', { class: 'bar ' + (cls || '') }, el('i', { style: `width:${vis ? clamp(val / max * 100, 0, 100) : 0}%` })));
    head.append(el('div', { class: 'gauges' },
      gauge('agri', '농업', c.agri, c.agriMax, 'jade'), gauge('comm', '상업', c.comm, c.commMax),
      gauge('wall', '성벽', c.wall, c.wallMax, 'sky'), gauge('order', '치안', c.order, 100, 'jade'),
      gauge('train', '훈련', c.train, 100, 'red'), gauge('troops', '병사 한도', c.troops, troopMax(c), 'red')));
    side.append(head);
    // 명령
    if (playerControls(c)) side.append(this.cmdPane(c));
    else if (r === 'ruler' && c.f === P.f && c.deleg) side.append(el('div', { class: 'pane' }, el('div', { class: 'secTitle' }, '위임'), el('div', { class: 'hint' }, '이 성은 태수에게 맡겨 두었습니다. 태수가 알아서 내정과 출진을 합니다.'), el('button', { class: 'btn', onclick: () => { c.deleg = false; this.refresh(); } }, icon('deleg'), '위임 거두기')));
    // 개인 행동
    if (P && (r === 'officer' || r === 'ronin' || r === 'gov')) side.append(this.personalPane(c));
    // 장수 목록
    const offs = c.f >= 0 ? officersIn(c.id, c.f) : [];
    const ron = roninIn(c.id).filter(o => o.found || (P && P.city === c.id) || o.id === G.player);
    if (offs.length || ron.length) {
      const list = el('div', { class: 'offList' });
      for (const o of offs.sort((a, b) => (b.id === c.gov) - (a.id === c.gov) || b.merit - a.merit)) list.append(this.offRow(o, vis));
      for (const o of ron) list.append(this.offRow(o, true));
      side.append(el('div', { class: 'pane' }, el('div', { class: 'secTitle' }, '장수', el('span', { class: 'r' }, `${offs.length}명${ron.length ? ` · 재야 ${ron.length}명` : ''}`)), list));
    }
    // 소식
    const lg = el('div', { class: 'log' }, G.log.slice(0, 40).map(l => el('div', {}, el('span', { class: 't' }, l.t), el('span', { class: l.kind }, l.text))));
    side.append(el('div', { class: 'pane' }, el('div', { class: 'secTitle' }, '천하 소식'), lg));
    side.append(el('div', { class: 'endTurn' }, el('button', { class: 'btn pri', id: 'bEnd', onclick: () => endMonth() }, icon('next'), '다음 달로')));
    side.scrollTop = scroll;
  },
  offRow(o, vis) {
    const P = me();
    const tags = [];
    if (o.st === 'ronin') tags.push(el('span', { class: 'tag' }, '재야'));
    else if (isRuler(o)) tags.push(el('span', { class: 'tag g' }, '군주'));
    else if (G.cities[o.city].gov === o.id) tags.push(el('span', { class: 'tag g' }, '태수'));
    if (o.id === G.player) tags.push(el('span', { class: 'tag g' }, '나'));
    const st = (k, lab) => el('span', { class: 'st ' + (o[k] >= 88 ? 'hi' : o[k] >= 70 ? 'mid' : 'lo') }, el('em', {}, lab), o[k]);
    return el('button', { class: 'offRow' + (o.acted && P && o.f === P.f && o.st === 'on' ? ' acted' : ''), onclick: () => this.officerInfo(o) },
      portraitImg(o, ''), el('span', { class: 'n disp' }, o.name), tags,
      el('span', { class: 's' }, vis ? [st('lead', '통'), st('war', '무'), st('int', '지')] : '…'));
  },

  // ===== 성 명령 (군주·태수) =====
  cmdPane(c) {
    const r = role();
    const free = officersIn(c.id, c.f).filter(o => !o.acted);
    const B = (ic, label, fn, sub, dis) => el('button', { class: 'cmd', disabled: dis || !free.length, onclick: fn, title: label }, icon(ic), el('span', {}, label), sub ? el('small', {}, sub) : null);
    const row = (g, lab, ...btns) => el('div', { class: 'cmdRow ' + g }, el('div', { class: 'lab' }, lab), ...btns.map(b => b || el('span')));
    const g = el('div', { class: 'cmdGroups' },
      row('g-nae', '내정', B('agri', '개간', () => this.cmdDev(c, 'agri'), `금 ${COST.agri}`), B('comm', '상업', () => this.cmdDev(c, 'comm'), `금 ${COST.comm}`), B('order', '치안', () => this.cmdDev(c, 'order'), `금 ${COST.order}`), B('wall', '성벽', () => this.cmdDev(c, 'wall'), `금 ${COST.wall}`)),
      row('g-mil', '군사', B('draft', '징병', () => this.cmdDraft(c)), B('train', '훈련', () => this.cmdSimple(c, 'train')), B('transport', '수송', () => this.cmdTransport(c)), B('attack', '출진', () => this.cmdAttack(c))),
      row('g-in', '인사', B('search', '탐색', () => this.cmdSimple(c, 'search')), B('hire', '등용', () => this.cmdHire(c)), B('reward', '포상', () => this.cmdReward(c), '금 100'), B('move', '이동', () => this.cmdMove(c))),
      row('g-ce', '책략', r === 'ruler' ? B('diplo', '외교', () => this.cmdDiplo(c)) : null, B('plot', '계략', () => this.cmdPlot(c)),
        r === 'ruler' && c.gov !== me().id ? el('button', { class: 'cmd', onclick: () => { c.deleg = true; this.toast(`${c.name}을 태수에게 맡겼습니다`); this.refresh(); }, title: '위임' }, icon('deleg'), el('span', {}, '위임')) : null,
        r === 'ruler' ? el('button', { class: 'cmd', onclick: () => this.cmdTreasure(c), title: '보물' }, icon('reward'), el('span', {}, '보물'), el('small', {}, `${itemsOfFaction(c.f).length}점`)) : null));
    return el('div', { class: 'pane' }, el('div', { class: 'secTitle' }, '명령', el('span', { class: 'r' }, `쓸 수 있는 장수 ${free.length}명`)), g);
  },
  async pickOfficer(c, { title, stat, filter, note }) {
    const offs = officersIn(c.id, c.f).filter(o => !o.acted && (!filter || filter(o)));
    if (!offs.length) { this.toast('쓸 수 있는 장수가 없습니다'); return null; }
    if (stat) offs.sort((a, b) => b[stat] - a[stat]);
    let sel = null;
    const list = el('div', { class: 'pickList' }, offs.map(o => {
      const row = el('button', { class: 'offRow', onclick: () => { $$('.pickList .offRow').forEach(x => x.classList.remove('on')); row.classList.add('on'); sel = o; if (this._dbl === o) this._close('ok'); this._dbl = o; } },
        portraitImg(o, ''), el('span', { class: 'n disp' }, o.name),
        el('span', { class: 's' }, stat ? el('b', { style: 'color:var(--brass)' }, `${STAT_NAMES[stat]} ${o[stat]}`) : null, el('span', {}, `통${o.lead} 무${o.war} 지${o.int} 정${o.pol} 매${o.cha}`)));
      return row;
    }));
    this._dbl = null;
    const k = await this.modal({ title, body: el('div', {}, note ? el('div', { class: 'muted', style: 'margin-bottom:8px;font-size:13px' }, note) : null, list), cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '맡긴다', cls: 'pri', check: () => !!sel }] });
    if (k !== 'ok') return null;
    if (!sel) sel = offs[0];
    return sel;
  },
  async cmdDev(c, kind) {
    const stat = kind === 'order' ? 'war' : 'pol';
    const o = await this.pickOfficer(c, { title: DEV_NAME[kind], stat, note: `금 ${COST[kind]} 필요 · 지금 금 ${fmt(c.gold)}` });
    if (!o) return;
    const r = cmdDevelop(o, c, kind); this.toast(r.ok ? `${o.name}: ${r.msg}` : r.msg); SFX.play(r.ok ? 'ok' : 'no'); this.refresh();
  },
  async cmdSimple(c, kind) {
    const o = await this.pickOfficer(c, { title: kind === 'train' ? '훈련' : '탐색', stat: kind === 'train' ? 'lead' : 'int' });
    if (!o) return;
    const r = kind === 'train' ? cmdTrain(o, c) : cmdSearch(o, c);
    SFX.play(r.ok ? 'ok' : 'no');
    if (r.item) await this.alert({ title: '보물 발견', portrait: r.to, text: `${c.name}에서 ${eul(r.item.name)} 찾아냈습니다!\n${r.item.desc}\n${r.to.name}에게 바쳤습니다.` });
    else if (r.found) await this.alert({ title: '인재 발견', portrait: r.found, text: `${iga(o.name)} 재야의 ${eul(r.found.name)} 찾아냈습니다.\n통솔 ${r.found.lead} · 무력 ${r.found.war} · 지력 ${r.found.int} · 정치 ${r.found.pol} · 매력 ${r.found.cha}` });
    else this.toast(r.ok ? `${o.name}: ${r.msg}` : r.msg);
    this.refresh();
  },
  async cmdDraft(c) {
    const o = await this.pickOfficer(c, { title: '징병', stat: 'cha', note: `병사 100명당 금 10 · 지금 금 ${fmt(c.gold)} · 인구 ${fmt(c.pop)}` });
    if (!o) return;
    const max = draftMax(o, c);
    if (max < 100) { this.toast('금이나 인구가 모자랍니다'); return; }
    let n = Math.min(max, Math.max(100, Math.floor(max * .7 / 100) * 100));
    const lab = el('b', { class: 'num' }), cost = el('span', { class: 'muted num' });
    const upd = () => { lab.textContent = fmt(n) + '명'; cost.textContent = `금 −${Math.ceil(n / 10)} · 치안 −${Math.ceil(n / 600)}`; };
    const sl = el('input', { type: 'range', id: 'draftN', min: 100, max, step: 100, value: n, oninput: e => { n = +e.target.value; upd(); } });
    upd();
    const k = await this.modal({ title: `징병 — ${o.name}`, body: el('div', { class: 'slider' }, sl, lab), cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '징병', cls: 'pri' }] });
    if (k !== 'ok') return;
    const r = cmdDraft(o, c, n); this.toast(r.msg); SFX.play('drum'); this.refresh();
  },
  async cmdHire(c) {
    const ron = roninIn(c.id).filter(r => r.found && r.id !== G.player);
    const enemy = ADJ[c.id].concat(c.id).flatMap(i => G.cities[i].f >= 0 && G.cities[i].f !== c.f ? officersIn(i, G.cities[i].f) : []).filter(o => !isRuler(o) && o.id !== G.player);
    const cands = [...ron, ...enemy];
    if (!cands.length) { this.toast('등용할 만한 인물이 없습니다. 먼저 탐색해 보세요'); return; }
    const rec = officersIn(c.id, c.f).filter(o => !o.acted).sort((a, b) => b.cha - a.cha)[0];
    if (!rec) { this.toast('쓸 수 있는 장수가 없습니다'); return; }
    let sel = null;
    const list = el('div', { class: 'pickList' }, cands.map(t => {
      const p = hireChance(rec, t, c.f);
      const row = el('button', { class: 'offRow', onclick: () => { $$('.pickList .offRow').forEach(x => x.classList.remove('on')); row.classList.add('on'); sel = t; } },
        portraitImg(t, ''), el('span', { class: 'n disp' }, t.name), el('span', { class: 'tag' }, t.st === 'ronin' ? '재야' : `${facName(t.f)} · 충성 ${t.loy}`),
        el('span', { class: 's' }, el('span', {}, `통${t.lead} 무${t.war} 지${t.int} 정${t.pol}`), el('b', { style: 'color:var(--brass)' }, `${Math.round(p * 100)}%`)));
      return row;
    }));
    const k = await this.modal({ title: '등용', body: el('div', {}, el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:8px' }, `설득은 매력이 가장 높은 ${iga(rec.name)} 맡습니다(매력 ${rec.cha}). 숫자는 가능성입니다. 다른 세력 장수는 이웃 성까지.`), list), cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '설득하러 간다', cls: 'pri', check: () => !!sel }] });
    if (k !== 'ok' || !sel) return;
    const r = cmdHire(rec, c, sel);
    SFX.play(r.joined ? 'win' : 'no');
    await this.alert({ title: r.joined ? '등용 성공' : '등용 실패', portrait: sel, text: r.msg });
    this.refresh();
  },
  async cmdReward(c) {
    const all = role() === 'ruler' && c.f === me().f; // 군주는 세력 안 모두에게
    let last = null;
    for (;;) {
      const offs = (all ? factionOfficers(c.f) : officersIn(c.id, c.f)).filter(o => !isRuler(o) && o.id !== G.player).sort((a, b) => a.loy - b.loy);
      if (!offs.length) { this.toast('포상할 장수가 없습니다'); return; }
      let sel = null;
      const low = offs.filter(o => o.loy < 80);
      const list = el('div', { class: 'pickList' }, offs.map(t => {
        const where = t.travel ? `${ro(G.cities[t.travel.to].name)} 가는 길` : G.cities[t.city].name;
        const row = el('button', { class: 'offRow', onclick: () => { $$('.pickList .offRow').forEach(x => x.classList.remove('on')); row.classList.add('on'); sel = t; } }, portraitImg(t, ''), el('span', { class: 'n disp' }, t.name), all ? el('span', { class: 'tag' }, where) : null, el('span', { class: 's' }, el('b', { style: `color:${t.loy < 70 ? 'var(--cinnabar)' : 'var(--paper)'}` }, `충성 ${t.loy}`)));
        return row;
      }));
      const head = el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:8px' }, `${c.name}의 금 ${fmt(c.gold)}에서 한 사람에 100씩 내립니다.${all ? ' 군주이므로 어느 성에 있는 장수든 포상할 수 있습니다.' : ''}${last ? ` 방금: ${last}` : ''}`);
      const k = await this.modal({ title: '포상 (금 100)', body: el('div', {}, head, list), cancel: 'x', buttons: [{ k: 'x', label: '닫기' }, { k: 'low', label: `충성 80 미만 모두 (${low.length}명 · 금 ${fmt(low.length * 100)})`, check: () => low.length > 0 }, { k: 'ok', label: '금 100을 내린다', cls: 'pri', check: () => !!sel }] });
      if (k === 'ok') { const r = cmdReward(null, c, sel); last = r.msg; if (r.ok) SFX.play('ok'); else { this.toast(r.msg); } }
      else if (k === 'low') {
        let n = 0; for (const t of low) { if (c.gold < 100) break; if (cmdReward(null, c, t).ok) n++; }
        last = `${n}명에게 포상했습니다${n < low.length ? ' (금이 모자라 일부만)' : ''}`; SFX.play('ok');
      } else break;
      this.refresh();
    }
    this.refresh();
  },
  async pickCity(title, cities, note, extra) {
    if (!cities.length) { this.toast('갈 수 있는 곳이 없습니다'); return null; }
    let sel = null;
    const list = el('div', { class: 'pickList' }, cities.map(t => {
      const row = el('button', { class: 'offRow', onclick: () => { $$('.pickList .offRow').forEach(x => x.classList.remove('on')); row.classList.add('on'); sel = t; } },
        el('span', { class: 'dot', style: `background:${facColor(t.f)}` }), el('span', { class: 'n disp' }, t.name), el('span', { class: 'tag' }, t.f >= 0 ? facName(t.f) : '빈 땅'),
        el('span', { class: 's' }, (extra ? extra(t) + ' · ' : '') + `병사 ${fmt(t.troops)}`));
      return row;
    }));
    const k = await this.modal({ title, body: el('div', {}, note ? el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:8px' }, note) : null, list), cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '고른다', cls: 'pri', check: () => !!sel }] });
    return k === 'ok' ? sel : null;
  },
  async cmdMove(c) {
    const R = routesFrom(c.id, c.f), dests = R.map(r => r.c), rt = t => R.find(r => r.c === t);
    const to = await this.pickCity('이동할 성', dests, '우리 성을 따라 길이 이어진 곳이면 어디든 갑니다. 바로 옆 성은 이번 달, 그보다 멀면 한 칸에 한 달씩 걸립니다.', t => monthsLabel(rt(t).months)); if (!to) return;
    const o = await this.pickOfficer(c, { title: `${ro(to.name)} 보낼 장수`, stat: 'lead', filter: o => !isRuler(o) || role() === 'ruler' }); if (!o) return;
    const m = cmdMove(o, to.id, rt(to).path); assignGovs(); this.toast(m ? `${eun(o.name)} ${ro(to.name)} 떠났습니다 · ${m}달 뒤 도착` : `${eun(o.name)} ${ro(to.name)} 옮겼습니다`); this.refresh();
  },
  async cmdTransport(c) {
    const R = routesFrom(c.id, c.f), dests = R.map(r => r.c), rt = t => R.find(r => r.c === t);
    const to = await this.pickCity('물자를 보낼 성', dests, '먼 성으로 보내면 수송대가 한 칸에 한 달씩 걸려 갑니다. 그 사이 목적지를 빼앗기면 가장 가까운 우리 성으로 갑니다.', t => monthsLabel(rt(t).months)); if (!to) return;
    const o = await this.pickOfficer(c, { title: '수송을 맡을 장수', stat: 'lead' }); if (!o) return;
    const vals = { gold: 0, food: 0, troops: 0 };
    const row = (key, label, max, step) => { const lab = el('b', { class: 'num', style: 'min-width:70px;text-align:right' }, '0'); return el('label', { class: 'fld' }, label, el('div', { class: 'slider' }, el('input', { type: 'range', id: 'tr_' + key, min: 0, max, step, value: 0, oninput: e => { vals[key] = +e.target.value; lab.textContent = fmt(vals[key]); } }), lab)); };
    const k = await this.modal({ title: `수송 — ${c.name} → ${to.name}`, body: el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, row('gold', '금', c.gold, 10), row('food', '쌀', c.food, 100), row('troops', '병사', Math.min(c.troops, Math.max(0, troopMax(to) - to.troops - incomingTroops(to.id))), 100)), cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '보낸다', cls: 'pri' }] });
    if (k !== 'ok') return;
    const r = cmdTransport(o, c, to, vals.gold, vals.food, vals.troops, rt(to).path); this.toast(r.msg); this.refresh();
  },
  async cmdAttack(c) {
    const targets = ADJ[c.id].map(i => G.cities[i]).filter(x => x.f !== c.f && !isAlly(c.f, x.f));
    const to = await this.pickCity('공격할 성', targets, '빈 땅이나 장수가 없는 성은 싸우지 않고 차지합니다'); if (!to) return;
    // 목표 성에 붙어 있는 우리 성(내가 다스리는 곳)에서 함께 출진할 수 있음
    const srcs = attackSources(c, to).filter(x => x === c || playerControls(x));
    const srcOf = {}; const offs = [];
    for (const sc of srcs) for (const o of officersIn(sc.id, c.f).filter(o => !o.acted).sort((a, b) => (b.lead + b.war) - (a.lead + a.war))) { srcOf[o.id] = sc; offs.push(o); }
    if (!offs.length) { this.toast('출진할 장수가 없습니다'); return; }
    // 기본 편성: 이 성의 장수들
    const picked = new Map(); // oid → {troops,type}
    const emptyT = to.f < 0 || !officersIn(to.id, to.f).length;
    const usedIn = sc => { let u = 0; picked.forEach((v, id) => { if (srcOf[id] === sc) u += v.troops; }); return u; };
    const autoFill = () => {
      picked.clear(); const mine = offs.filter(o => srcOf[o.id] === c), pool = mine.length ? mine : offs;
      const top = emptyT ? [pool[pool.length - 1]] : pool.slice(0, Math.min(5, pool.length));
      const base = srcOf[top[0].id];
      const tr = splitTroops(top, Math.floor(base.troops * (emptyT ? .3 : .8))); top.forEach((o, i) => picked.set(o.id, { troops: Math.max(0, tr[i]), type: autoType(o) }));
    };
    autoFill();
    const wrap = el('div', { style: 'display:flex;flex-direction:column;gap:6px' });
    const sum = el('div', { class: 'muted num', style: 'font-size:13px' });
    const foodNeed = () => srcs.reduce((a, sc) => a + Math.min(sc.food, Math.ceil(usedIn(sc) * 32 / 80)), 0);
    const sumText = () => { let u = 0; picked.forEach(v => u += v.troops); const per = srcs.filter(sc => usedIn(sc) > 0).map(sc => `${sc.name} ${fmt(usedIn(sc))}/${fmt(sc.troops)}`).join(' · '); return `출진 병력 ${fmt(u)} (${per || '없음'}) · 군량 ${fmt(foodNeed())} · 첫 번째가 총대장`; };
    const draw = () => {
      wrap.innerHTML = '';
      let lastSrc = null;
      for (const o of offs) {
        const sc = srcOf[o.id];
        if (srcs.length > 1 && sc !== lastSrc) { lastSrc = sc; wrap.append(el('div', { class: 'secTitle', style: 'margin:4px 0 0' }, sc === c ? `${sc.name} (출발 성)` : `${sc.name}에서 협공`, el('span', { class: 'r' }, `병사 ${fmt(sc.troops)}`))); }
        const p = picked.get(o.id);
        const chk = el('input', { type: 'checkbox', id: 'at_' + o.id, checked: !!p, onchange: e => { if (e.target.checked) { if (picked.size >= 5) { e.target.checked = false; this.toast('한 번에 다섯 부대까지'); return; } picked.set(o.id, { troops: Math.min(troopCap(o), Math.max(0, Math.floor((sc.troops - usedIn(sc)) / 100) * 100)), type: autoType(o) }); } else picked.delete(o.id); draw(); } });
        const line = el('div', { style: 'display:flex;flex-direction:column;gap:4px;padding:6px;border:1px solid var(--line);border-radius:6px' },
          el('label', { style: 'display:flex;align-items:center;gap:8px;cursor:pointer' }, chk, portraitImg(o, ''), el('span', { class: 'disp', style: 'font-size:17px' }, o.name), el('span', { class: 'muted', style: 'font-size:12px;margin-left:auto' }, `통${o.lead} 무${o.war} 지${o.int} · 최대 ${fmt(troopCap(o))}`)));
        line.querySelector('img').style.cssText = 'width:26px;height:30px;border-radius:3px';
        if (p) {
          const lab = el('b', { class: 'num', style: 'min-width:60px;text-align:right' }, fmt(p.troops));
          const maxT = Math.min(troopCap(o), p.troops + Math.max(0, sc.troops - usedIn(sc)));
          line.append(el('div', { class: 'slider' },
            el('select', { id: 'ty_' + o.id, onchange: e => p.type = e.target.value }, Object.entries(TYPES).map(([k, t]) => el('option', { value: k, selected: k === p.type }, t.name))),
            el('input', { type: 'range', id: 'tn_' + o.id, min: 0, max: maxT, step: 100, value: p.troops, oninput: e => { p.troops = +e.target.value; lab.textContent = fmt(p.troops); sum.textContent = sumText(); }, onchange: () => draw() }), lab));
        }
        wrap.append(line);
      }
      sum.textContent = sumText();
    };
    draw();
    const note = srcs.length > 1 ? `${to.name}에 붙어 있는 ${srcs.slice(1).map(x => x.name).join('·')}의 장수도 함께 출진할 수 있습니다. 다른 성에서 온 부대는 그쪽 가장자리에서 협공합니다. ` : '';
    const k = await this.modal({ title: `출진 — ${to.name} 공격`, wide: true, body: el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, el('div', { class: 'muted', style: 'font-size:13px' }, note + '보병은 기병에 강하고, 기병은 빠르고 세며, 궁병은 1~2칸, 노병은 2~3칸 밖에서 쏩니다. 충차는 성곽 위의 적과 성벽을 부숩니다.'), wrap, sum), cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '출진!', cls: 'red' }] });
    if (k !== 'ok') return;
    const army = offs.filter(o => picked.has(o.id) && picked.get(o.id).troops >= 100).map(o => ({ oid: o.id, troops: picked.get(o.id).troops, type: picked.get(o.id).type, src: srcOf[o.id].id }));
    if (!army.length) { this.toast('병사를 실은 부대가 없습니다'); return; }
    for (const sc of srcs) { const t = army.filter(u => u.src === sc.id).reduce((a, u) => a + u.troops, 0); if (t > sc.troops) { this.toast(`${sc.name}의 병사가 모자랍니다`); return; } }
    const food = foodNeed();
    // 총대장이 있는 성이 출발 성
    const start = G.cities[army[0].src];
    BUSY = true;
    try { await runWar(start, to, army, food); } finally { BUSY = false; }
    this.sel = (G.cities[to.id].f === c.f) ? to.id : c.id;
    if (G.over) return;
    this.refresh();
  },
  async cmdTreasure(c) {
    const its = itemsOfFaction(c.f);
    const rumors = ITEMS.filter(it => G.items[it.id].rumor && G.items[it.id].holder < 0 && G.items[it.id].city >= 0);
    const rumorBox = rumors.length ? el('div', { class: 'hint', style: 'margin-top:8px' }, '술집에서 들은 소문: ', rumors.map(it => `${G.cities[G.items[it.id].city].name}의 ${it.name}`).join(', ')) : null;
    if (!its.length) { if (rumorBox) { await this.modal({ title: '보물', body: el('div', {}, el('div', { class: 'hint' }, '가진 보물이 없습니다. 소문난 성에서 탐색해 보세요.'), rumorBox), cancel: 'x', buttons: [{ k: 'x', label: '닫기', cls: 'pri' }] }); return; } this.toast('가진 보물이 없습니다. 탐색으로 숨은 보물을 찾을 수 있습니다'); return; }
    let sel = null;
    const list = el('div', { class: 'pickList' }, its.map(it => {
      const h = G.officers[G.items[it.id].holder];
      const row = el('button', { class: 'offRow', onclick: () => { $$('.pickList .offRow').forEach(x => x.classList.remove('on')); row.classList.add('on'); sel = it; } }, el('span', { class: 'item', style: 'flex:none' }, it.kind), el('span', { class: 'n disp' }, it.name), el('span', { class: 's', style: 'flex:1;text-align:right' }, `${Object.entries(it.bonus || {}).map(([k, v]) => `${STAT_NAMES[k]}+${v}`).concat(it.move ? [`이동+${it.move}`] : [], it.life ? ['수명+'] : []).join(' ')} · ${h.name}`));
      return row;
    }));
    const k = await this.modal({ title: '보물', body: el('div', {}, el('div', { class: 'hint', style: 'margin-bottom:8px' }, '보물을 고르면 다른 장수에게 내릴 수 있습니다. 받은 장수는 충성이 크게 오르고, 빼앗긴 장수는 조금 섭섭해합니다.'), list, rumorBox), cancel: 'x', buttons: [{ k: 'x', label: '닫기' }, { k: 'give', label: '내린다', cls: 'pri', check: () => !!sel }] });
    if (k !== 'give' || !sel) return;
    const from = G.officers[G.items[sel.id].holder];
    const offs = factionOfficers(c.f).filter(o => o !== from).sort((a, b) => b.war - a.war);
    let to = null;
    const l2 = el('div', { class: 'pickList' }, offs.map(o => { const row = el('button', { class: 'offRow', onclick: () => { $$('.pickList .offRow').forEach(x => x.classList.remove('on')); row.classList.add('on'); to = o; } }, portraitImg(o, ''), el('span', { class: 'n disp' }, o.name), el('span', { class: 'tag' }, G.cities[o.city].name), el('span', { class: 's' }, `통${o.lead} 무${o.war} 지${o.int} · 충${isRuler(o) ? '-' : o.loy}`)); return row; }));
    const k2 = await this.modal({ title: `${sel.name} 내리기`, body: l2, cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '내린다', cls: 'pri', check: () => !!to }] });
    if (k2 !== 'ok' || !to) return;
    giveItem(sel.id, to);
    if (!isRuler(to)) to.loy = Math.min(100, to.loy + 15);
    if (!isRuler(from)) from.loy = Math.max(0, from.loy - 5);
    SFX.play('win'); await this.alert({ title: '보물 하사', portrait: to, text: `${to.name}에게 ${eul(sel.name)} 내렸습니다.\n"이 은혜는 목숨으로 갚겠습니다!"` });
    this.refresh();
  },
  async cmdDiplo(c) {
    const P = me();
    const fs = G.factions.filter(f => f.alive && f.id !== P.f);
    let sel = null;
    const list = el('div', { class: 'pickList' }, fs.map(f => {
      const row = el('button', { class: 'offRow', onclick: () => { $$('.pickList .offRow').forEach(x => x.classList.remove('on')); row.classList.add('on'); sel = f; } },
        el('span', { class: 'dot', style: `background:${f.color}` }), el('span', { class: 'n disp' }, f.name), isAlly(f.id, P.f) ? el('span', { class: 'tag g' }, `동맹 ${allyLeft(f.id, P.f)}개월`) : null,
        el('span', { class: 's' }, `우호 ${getRel(f.id, P.f)} · 성 ${citiesOf(f.id).length}`));
      return row;
    }));
    const k = await this.modal({ title: '외교', body: list, cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'gift', label: '친선(선물)', check: () => !!sel }, { k: 'ally', label: '동맹 제의', cls: 'pri', check: () => !!sel }, { k: 'marry', label: '혼인 동맹 (금 1,000)', check: () => !!sel }, { k: 'break', label: '동맹 끊기', check: () => !!sel }] });
    if (k === 'x' || !sel) return;
    if (k === 'break') { if (!isAlly(sel.id, P.f)) return this.toast('동맹이 아닙니다'); breakAlly(P.f, sel.id); return this.refresh(); }
    if (k === 'ally' && isAlly(sel.id, P.f)) return this.toast('이미 동맹입니다');
    if (k === 'marry') {
      if (G.marry && G.marry[relKey(P.f, sel.id)] && isAlly(P.f, sel.id)) return this.toast('이미 혼인으로 맺어진 사이입니다');
      if (c.gold < 1000) return this.toast('예물로 보낼 금 1,000이 모자랍니다');
      if (getRel(sel.id, P.f) < 50) return this.toast(`우호가 50 이상이어야 혼담을 넣을 수 있습니다 (지금 ${getRel(sel.id, P.f)})`);
      const env = await this.pickOfficer(c, { title: '중매를 설 장수', stat: 'cha', note: `받아들일 가능성은 우호와 사신의 매력에 달렸습니다` });
      if (!env) return;
      const r = dipMarry(env, c, P.f, sel.id); SFX.play(r.ok ? 'win' : 'no');
      await this.alert({ title: '혼인 동맹', portrait: G.officers[sel.ruler], text: r.msg }); return this.refresh();
    }
    const env = await this.pickOfficer(c, { title: '사신으로 보낼 장수', stat: 'cha', note: k === 'ally' ? `우호가 55 이상이어야 합니다 (지금 ${getRel(sel.id, P.f)})` : '선물한 금에 비례해 우호가 오릅니다' });
    if (!env) return;
    if (k === 'gift') {
      let g = Math.min(c.gold, 300);
      const lab = el('b', { class: 'num' }, fmt(g));
      const kk = await this.modal({ title: `${sel.name}군에 선물`, body: el('div', { class: 'slider' }, el('input', { type: 'range', id: 'giftN', min: 0, max: Math.min(c.gold, 3000), step: 50, value: g, oninput: e => { g = +e.target.value; lab.textContent = fmt(g); } }), lab), cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '보낸다', cls: 'pri' }] });
      if (kk !== 'ok' || g <= 0) return;
      const r = dipGift(env, P.f, sel.id, g); this.toast(r.msg);
    } else {
      const p = allyChance(env, P.f, sel.id);
      if (p <= 0) { this.toast(`우호가 낮아 받아 주지 않을 것 같습니다 (${getRel(sel.id, P.f)})`); return; }
      const r = dipAlly(env, P.f, sel.id); SFX.play(isAlly(P.f, sel.id) ? 'win' : 'no'); await this.alert({ title: '동맹 제의', portrait: G.officers[sel.ruler], text: r.msg });
    }
    this.refresh();
  },
  async cmdPlot(c) {
    const targets = ADJ[c.id].flatMap(i => G.cities[i].f >= 0 && G.cities[i].f !== c.f ? officersIn(i, G.cities[i].f) : []).filter(o => !isRuler(o) && o.id !== G.player);
    if (!targets.length) { this.toast('이웃 성에 이간할 적장이 없습니다'); return; }
    const env = officersIn(c.id, c.f).filter(o => !o.acted).sort((a, b) => b.int - a.int)[0];
    if (!env) { this.toast('쓸 수 있는 장수가 없습니다'); return; }
    let sel = null;
    const list = el('div', { class: 'pickList' }, targets.map(t => {
      const p = plotChance(env, t);
      const row = el('button', { class: 'offRow', onclick: () => { $$('.pickList .offRow').forEach(x => x.classList.remove('on')); row.classList.add('on'); sel = t; } }, portraitImg(t, ''), el('span', { class: 'n disp' }, t.name), el('span', { class: 'tag' }, `${facName(t.f)} · 충성 ${t.loy}`), el('span', { class: 's' }, `지${t.int}`, el('b', { style: 'color:var(--brass)' }, `${Math.round(p * 100)}%`)));
      return row;
    }));
    const k = await this.modal({ title: '이간 계략', body: el('div', {}, el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:8px' }, `지력이 가장 높은 ${iga(env.name)} 꾸밉니다(지력 ${env.int}). 충성을 떨어뜨리면 등용하기 쉬워집니다.`), list), cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '꾸민다', cls: 'pri', check: () => !!sel }] });
    if (k !== 'ok') return;
    const r = plotSow(env, sel); this.toast(r.msg); this.refresh();
  },

  // ===== 개인 행동 (장수·재야) =====
  personalPane(c) {
    const P = me(), r = role();
    const ap = G.ap;
    const dots = el('span', { class: 'apDots', 'aria-label': `행동력 ${ap}` }, [0, 1, 2].map(i => el('i', { class: i < ap ? '' : 'off' })));
    const here = P.city === c.id;
    const B = (ic, label, fn, dis) => el('button', { class: 'cmd', disabled: dis || ap <= 0 || !here, onclick: fn, title: label }, icon(ic), el('span', {}, label));
    const g = el('div', { class: 'cmdGrid g-in' });
    if (r !== 'gov') g.append(B('train2', '단련', () => this.pTrain()));
    if (r === 'officer') g.append(B('work', '근무', () => this.pWork()));
    if (r !== 'gov') g.append(B('search', '탐색', () => this.pSearch()));
    g.append(B('bond', '친교', () => this.pBond()));
    if (r !== 'gov') g.append(B('move', '이동', () => this.pMove()));
    if (r === 'ronin') {
      g.append(B('serve', '사관', () => this.pServe(), G.cities[P.city].f < 0));
      g.append(B('rise', '거병', () => this.pRise(), G.cities[P.city].f >= 0));
    }
    g.append(B('wine', '술집', () => pTavern()));
    if (r === 'officer' || r === 'gov') g.append(el('button', { class: 'cmd', disabled: !here, onclick: () => this.pResign(), title: '하야' }, icon('resign'), el('span', {}, '하야')));
    if (r === 'gov') g.append(el('button', { class: 'cmd', disabled: !here, onclick: () => this.pRebel(), title: '독립' }, icon('rebel'), el('span', {}, '독립')));
    const pane = el('div', { class: 'pane' },
      el('div', { class: 'secTitle' }, r === 'gov' ? '나의 일' : '나의 행동', r !== 'gov' ? dots : null, el('span', { class: 'r' }, `소지금 ${fmt(G.pgold)} · 명성 ${P.fame}${P.st === 'on' ? ` · 공적 ${P.merit}` : ''}`)),
      P.travel ? el('div', { class: 'hint' }, `${G.cities[P.travel.to].name}(으)로 가는 길입니다 · ${travelLeft(P) ? travelLeft(P) + '달 뒤' : '다음 달'} 도착 (${P.travel.path.map(i => G.cities[i].name).join(' → ')})`) : here ? g : el('div', { class: 'hint' }, `지금 ${G.cities[P.city].name}에 있습니다. 그 성을 눌러 행동하세요.`));
    if (r === 'officer' && G.mission) pane.append(missionCard());
    if ((P.sworn || []).length) pane.append(el('div', { class: 'hint' }, '의형제: ' + P.sworn.map(id => G.officers[id].name + (G.officers[id].st === 'dead' ? '(고인)' : '')).join(', ')));
    if (r === 'officer') pane.append(el('div', { class: 'hint' }, '공을 쌓으면 태수로 임명될 수 있습니다. 출진은 태수가 정하고, 뽑히면 직접 부대를 이끕니다.'));
    if (r === 'ronin') pane.append(el('div', { class: 'hint' }, '빈 땅에서는 거병해 군주가 될 수 있고, 남의 성에서는 사관을 청할 수 있습니다. 친교로 사귄 재야 인물은 거병할 때 함께합니다.'));
    return pane;
  },
  useAP() { G.ap = Math.max(0, G.ap - 1); },
  async pTrain() {
    const P = me();
    const k = await this.choose({ title: '단련', text: '무엇을 갈고닦을까요? 성공하면 능력이 1 오릅니다.', options: [...['lead', 'war', 'int', 'pol', 'cha'].map(s => ({ k: s, label: `${STAT_NAMES[s]} (${P[s]})`, disabled: P[s] >= 100 })), { k: 'x', label: '그만둔다' }] });
    if (!k || k === 'x') return;
    this.useAP();
    const p = clamp(.55 - (P[k] - 50) / 120, .12, .8);
    if (chance(p)) { P[k]++; P.fame += 1; SFX.play('ok'); this.toast(`${STAT_NAMES[k]}이(가) ${P[k]}로 올랐습니다!`); }
    else this.toast('땀은 흘렸지만 아직 깨달음이 없습니다');
    checkMission();
    this.refresh();
  },
  async pWork() {
    const P = me(), c = G.cities[P.city];
    const k = await this.choose({ title: '근무', text: `성의 금을 들여 일합니다. 지금 금 ${fmt(c.gold)}`, options: [{ k: 'agri', label: `개간 (금 ${COST.agri})` }, { k: 'comm', label: `상업 (금 ${COST.comm})` }, { k: 'order', label: `순찰 (금 ${COST.order})` }, { k: 'x', label: '그만둔다' }] });
    if (!k || k === 'x') return;
    const r = cmdDevelop(P, c, k);
    if (r.ok) { this.useAP(); P.merit += 15; SFX.play('ok'); }
    this.toast(r.ok ? `${r.msg} · 공적이 올랐습니다` : r.msg); checkMission(); this.refresh();
  },
  async pSearch() {
    const P = me(), c = G.cities[P.city];
    this.useAP();
    const r = cmdSearch(P, c, 'self');
    if (P.st === 'ronin') for (const x of roninIn(c.id)) x.found = true;
    if ((r.item || r.found) && G.mission && G.mission.kind === 'search' && G.mission.cid === c.id) G.mission.got = 1;
    if (r.item) await this.alert({ title: '보물을 얻다', portrait: P, text: `${eul(r.item.name)} 손에 넣었습니다!\n${r.item.desc}` });
    else if (r.found) await this.alert({ title: '인재를 만나다', portrait: r.found, text: `${eul(r.found.name)} 만났습니다. 친교를 쌓아 두면 나중에 힘이 됩니다.` });
    else this.toast(r.msg);
    checkMission();
    this.refresh();
  },
  async pBond() {
    const P = me(), c = G.cities[P.city];
    const ppl = G.officers.filter(o => o.id !== P.id && o.city === c.id && !o.travel && (o.st === 'on' || (o.st === 'ronin' && (o.found || P.st === 'ronin'))));
    if (!ppl.length) { this.toast('여기에는 만날 사람이 없습니다'); return; }
    P.bond = P.bond || {};
    let sel = null;
    const list = el('div', { class: 'pickList' }, ppl.map(t => {
      const row = el('button', { class: 'offRow', onclick: () => { $$('.pickList .offRow').forEach(x => x.classList.remove('on')); row.classList.add('on'); sel = t; } }, portraitImg(t, ''), el('span', { class: 'n disp' }, t.name), el('span', { class: 'tag' }, t.st === 'ronin' ? '재야' : facName(t.f)), el('span', { class: 's' }, `${isSworn(P, t) ? '의형제 · ' : ''}친밀 ${P.bond[t.id] || 0}`));
      return row;
    }));
    const k = await this.modal({ title: '친교', body: el('div', {}, el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:8px' }, '술 한잔 나누며 사귑니다. 소지금 50이 있으면 선물로 더 가까워집니다.'), list), cancel: 'x', buttons: [{ k: 'x', label: '취소' }, { k: 'ok', label: '찾아간다', cls: 'pri', check: () => !!sel }] });
    if (k !== 'ok') return;
    this.useAP();
    let d = Math.round(6 + P.cha / 10 - affDist(P, sel) / 6 + ri(0, 5));
    if (G.pgold >= 50) { G.pgold -= 50; d += 5; }
    d = Math.max(2, d);
    P.bond[sel.id] = clamp((P.bond[sel.id] || 0) + d, 0, 100);
    if (sel.st === 'on' && sel.f === P.f && !isRuler(sel)) sel.loy = Math.min(100, sel.loy + 1);
    SFX.play('ok');
    this.toast(`${wa(sel.name)} 가까워졌습니다 (친밀 ${P.bond[sel.id]})`);
    checkMission();
    if (canSwear(P, sel)) await offerSworn(P, sel);
    this.refresh();
  },
  async pMove() {
    const P = me();
    const R = routesFrom(P.city, P.st === 'ronin' ? null : P.f), rt = t => R.find(r => r.c === t);
    const dests = R.map(r => r.c).sort((a, b) => rt(a).months - rt(b).months);
    const to = await this.pickCity('어디로 갈까요?', dests, (P.st === 'ronin' ? '재야는 어디든 갈 수 있습니다.' : '우리 세력의 성을 따라서만 갈 수 있습니다.') + ' 바로 옆 성은 지금 바로, 멀면 한 칸에 한 달씩 걸리고 가는 동안에는 다른 일을 할 수 없습니다.', t => monthsLabel(rt(t).months));
    if (!to) return;
    const r = rt(to);
    if (r.months > 0) {
      if (role() === 'gov') G.cities[P.city].gov = -1;
      P.travel = { to: to.id, path: r.path, start: mIdx(), eta: mIdx() + r.months }; G.ap = 0;
      this.toast(`${ro(to.name)} 길을 떠났습니다 · ${r.months}달 뒤 도착`); MapView.focus(to.id); assignGovs(); this.refresh(); return;
    }
    this.useAP(); P.city = to.id; if (P.st === 'ronin') for (const x of roninIn(to.id)) x.found = x.found || chance(.5);
    this.sel = to.id; this.toast(`${ro(to.name)} 왔습니다`); MapView.focus(to.id); this.refresh();
  },
  async pServe() {
    const P = me(), c = G.cities[P.city], F = G.factions[c.f], ruler = G.officers[F.ruler];
    const gov = c.gov >= 0 ? G.officers[c.gov] : ruler;
    P.bond = P.bond || {};
    const p = clamp(.3 + P.fame / 300 + P.cha / 300 + ((P.bond[ruler.id] || 0) + (P.bond[gov.id] || 0)) / 250 - affDist(P, ruler) / 120, .05, .95);
    const k = await this.choose({ title: '사관', portrait: gov, text: `${gov.name}에게 ${F.name}군에서 일하고 싶다고 청합니다.\n받아 줄 가능성 약 ${Math.round(p * 100)}%`, options: [{ k: 'y', label: '청한다' }, { k: 'x', label: '그만둔다' }] });
    if (k !== 'y') return;
    this.useAP();
    if (chance(p)) { joinFaction(P, c.f, c.id); P.acted = false; P.merit = 100 + P.fame * 2; for (const o of swornOf(P).filter(o => o.st === 'ronin' && o.city === c.id)) joinFaction(o, c.f, c.id); assignGovs(); SFX.play('win'); await this.alert({ title: '사관', portrait: ruler, text: `${F.name}군의 장수가 되었습니다. ${iga(ruler.name)} 기뻐합니다.` }); }
    else { SFX.play('no'); this.toast(`${eun(gov.name)} 아직 때가 아니라며 돌려보냈습니다`); }
    this.refresh();
  },
  async pRise() {
    const P = me(), c = G.cities[P.city];
    P.bond = P.bond || {};
    const friends = roninIn(c.id).filter(o => o.id !== P.id && ((P.bond[o.id] || 0) >= 45 || isSworn(P, o)));
    const troops = 1500 + P.fame * 25 + friends.length * 800;
    const k = await this.choose({ title: '거병', text: `${c.name}에서 군사를 일으켜 군주가 됩니다.\n모일 병사 약 ${fmt(troops)}명${friends.length ? `\n함께할 동료: ${friends.map(f => f.name).join(', ')}` : '\n함께할 동료는 아직 없습니다 (재야 인물과 친교를 45 넘게 쌓으면 따라옵니다)'}`, options: [{ k: 'y', label: '거병한다', danger: false }, { k: 'x', label: '아직은 때가 아니다' }] });
    if (k !== 'y') return;
    this.useAP();
    const F = createFaction(P, c, troops);
    for (const f of friends) { joinFaction(f, F.id, c.id); f.loy = Math.min(100, 70 + (P.bond[f.id] || 0) / 3); }
    SFX.play('drum');
    await this.alert({ title: '거병', portrait: P, text: `${G.year}년 ${G.month}월, ${iga(P.name)} ${c.name}에서 깃발을 올렸습니다!` });
    this.refresh();
  },
  async pResign() {
    const P = me();
    const ok = await this.confirm('하야', `${facName(P.f)}군을 떠나 재야가 됩니다. 공적과 지위를 잃습니다.`);
    if (!ok) return;
    logMsg(`${eun(P.name)} ${facName(P.f)}군을 떠났습니다`, 'big');
    const fol = swornOf(P).filter(o => o.st === 'on' && o.f === P.f);
    leaveToRonin(P); P.merit = 0;
    for (const o of fol) { leaveToRonin(o); o.city = P.city; o.found = true; }
    if (fol.length) logMsg(`의형제 ${fol.map(o => o.name).join(', ')}도 함께 떠났습니다`, 'big');
    assignGovs(); this.refresh();
  },
  async pRebel() {
    const P = me(), c = G.cities[P.city];
    const old = P.f, ruler = G.officers[G.factions[old].ruler];
    P.bond = P.bond || {};
    const followers = officersIn(c.id, old).filter(o => o.id !== P.id && (o.loy < 75 || (P.bond[o.id] || 0) >= 50) && !(o.tag && o.tag === ruler.tag));
    const ok = await this.confirm('독립', `${ruler.name}에게서 떠나 ${c.name}을(를) 차지하고 군주가 됩니다.\n따라올 장수: ${followers.map(f => f.name).join(', ') || '없음'}\n${facName(old)}군과는 원수가 됩니다.`);
    if (!ok) return;
    const stay = officersIn(c.id, old).filter(o => o.id !== P.id && !followers.includes(o));
    const home = G.cities.filter(x => x.f === old && x.id !== c.id);
    for (const o of stay) { if (home.length) o.city = (home.find(h => ADJ[h.id].includes(c.id)) || home[0]).id; else leaveToRonin(o); }
    leaveToRonin(P);
    const F = createFaction(P, c, c.troops, true);
    for (const f of followers) { f.f = F.id; f.loy = clamp(70 + (P.bond[f.id] || 0) / 3, 60, 100); }
    G.rel[relKey(F.id, old)] = 0;
    logMsg(`${eun(P.name)} ${facName(old)}군에서 독립했습니다!`, 'big');
    checkFactions(); assignGovs(); SFX.play('drum'); this.refresh();
  },

  // ===== 정보 창 =====
  officerInfo(o) {
    const P = me();
    const st = ['lead', 'war', 'int', 'pol', 'cha'].map((s, i) => el('div', { class: 'statLine' }, el('span', { class: 'muted' }, STAT_NAMES[s]), el('b', { class: 'num', style: o[s] >= 88 ? 'color:var(--brass3)' : '' }, o[s]), el('div', { class: 'bar ' + ['red', 'red', 'sky', 'jade', ''][i] }, el('i', { style: `width:${o[s]}%` }))));
    const info = [
      o.st === 'unborn' ? `${o.born}년생 · ${o.born + 16}년 무렵 등장` : `${age(o)}세 · ${o.st === 'ronin' ? '재야' : o.st === 'on' ? `${facName(o.f)}군 ${rankName(o)}` : o.st === 'dead' ? '세상을 떠남' : ''}`,
      o.st === 'on' && !isRuler(o) ? `충성 ${o.loy}` : '',
      o.st === 'on' ? `공적 ${o.merit}` : '', `명성 ${o.fame}`, `있는 곳 ${G.cities[o.city].name}`,
      P && P.bond && P.bond[o.id] ? `나와의 친밀 ${P.bond[o.id]}` : '',
    ].filter(Boolean).join(' · ');
    const sks = skillsOf(o);
    const traits = el('div', { class: 'traits' },
      sks.length ? el('div', { class: 'trRow' }, el('span', { class: 'trLab' }, '특기'), sks.map(k => el('span', { class: 'skill', title: SKILL_DEF[k], tabindex: '0' }, k))) : null,
      (o.sworn || []).length ? el('div', { class: 'trRow' }, el('span', { class: 'trLab' }, '의형제'), o.sworn.map(id => el('span', { class: 'skill' }, G.officers[id].name))) : null,
      (o.items || []).length ? el('div', { class: 'trRow' }, el('span', { class: 'trLab' }, '보물'), o.items.map(id => el('span', { class: 'item', title: `${ITEM[id].kind} · ${ITEM[id].desc}`, tabindex: '0' }, ITEM[id].name))) : null,
      sks.length ? el('div', { class: 'trDesc' }, sks.map(k => el('div', {}, el('b', {}, k), ' ', SKILL_DEF[k]))) : null);
    const b = bioOf(o);
    const bio = b ? el('div', { class: 'bio' },
      el('div', { class: 'bioHead' }, el('span', { class: 'eyebrow' }, '열전'), b.ja ? el('span', {}, `자 ${b.ja}`) : null, b.from ? el('span', {}, b.from) : null, el('span', {}, `${o.born}년생`)),
      el('p', {}, b.text)) : null;
    this.modal({ title: o.name, body: el('div', { style: 'display:flex;flex-direction:column;gap:12px' }, el('div', { class: 'msg' }, portraitImg(o), el('div', { style: 'flex:1;display:flex;flex-direction:column;gap:6px;min-width:0' }, el('div', { class: 'muted', style: 'font-size:13px' }, info), st)), traits, bio), cancel: 'x', buttons: [{ k: 'x', label: '닫기' }] });
  },
  factionList() {
    const P = me();
    const rows = G.factions.filter(f => f.alive).map(f => {
      const cs = citiesOf(f.id), offs = factionOfficers(f.id);
      return { f, n: cs.length, o: offs.length, t: cs.reduce((a, c) => a + c.troops, 0) };
    }).sort((a, b) => b.n - a.n || b.t - a.t);
    const tbl = el('div', { style: 'overflow-x:auto' }, el('table', { style: 'width:100%;border-collapse:collapse;font-size:14px' },
      el('thead', {}, el('tr', { class: 'muted', style: 'text-align:left' }, ['세력', '군주', '성', '장수', '병력', '나와의 관계'].map(h => el('th', { style: 'padding:4px 6px;font-weight:400' }, h)))),
      el('tbody', {}, rows.map(r => el('tr', { style: 'border-top:1px solid var(--line)' },
        el('td', { style: 'padding:5px 6px;white-space:nowrap' }, el('span', { class: 'dot', style: `background:${r.f.color};margin-right:6px` }), el('span', { class: 'disp' }, r.f.name)),
        el('td', { style: 'padding:5px 6px' }, G.officers[r.f.ruler].name),
        el('td', { class: 'num', style: 'padding:5px 6px' }, r.n), el('td', { class: 'num', style: 'padding:5px 6px' }, r.o), el('td', { class: 'num', style: 'padding:5px 6px' }, fmt(r.t)),
        el('td', { style: 'padding:5px 6px' }, P && P.st === 'on' ? (r.f.id === P.f ? '아군' : isAlly(r.f.id, P.f) ? '동맹' : `우호 ${getRel(r.f.id, P.f)}`) : '—'))))));
    this.modal({ title: '천하의 세력', wide: true, body: tbl, cancel: 'x', buttons: [{ k: 'x', label: '닫기' }] });
  },
  officerList() {
    const P = me();
    const fId = P && P.st === 'on' ? P.f : null;
    let mode = fId != null ? 'mine' : 'ronin';
    const box = el('div', {});
    const draw = () => {
      box.innerHTML = '';
      const tabs = el('div', { class: 'tabs', style: 'margin-bottom:8px' },
        fId != null ? el('button', { class: 'tab' + (mode === 'mine' ? ' on' : ''), onclick: () => { mode = 'mine'; draw(); } }, '우리 세력') : null,
        el('button', { class: 'tab' + (mode === 'ronin' ? ' on' : ''), onclick: () => { mode = 'ronin'; draw(); } }, '알려진 재야'),
        el('button', { class: 'tab' + (mode === 'all' ? ' on' : ''), onclick: () => { mode = 'all'; draw(); } }, '모든 장수'),
        el('button', { class: 'tab' + (mode === 'dict' ? ' on' : ''), onclick: () => { mode = 'dict'; draw(); } }, '인물 사전'));
      const list = mode === 'mine' ? factionOfficers(fId) : mode === 'ronin' ? G.officers.filter(o => o.st === 'ronin' && o.found) : mode === 'dict' ? [...G.officers] : G.officers.filter(o => o.st === 'on');
      if (mode === 'dict') list.sort((a, b) => a.name.localeCompare(b.name, 'ko')); else list.sort((a, b) => (b.lead + b.war + b.int + b.pol) - (a.lead + a.war + a.int + a.pol));
      box.append(tabs, el('div', { class: 'pickList', style: 'max-height:56vh' }, list.map(o => el('button', { class: 'offRow', onclick: () => this.officerInfo(o) }, portraitImg(o, ''), el('span', { class: 'n disp' }, o.name), el('span', { class: 'tag' }, o.st === 'dead' ? '세상을 떠남' : o.st === 'unborn' ? `${o.born + 16}년 무렵 등장` : o.st === 'ronin' ? `재야 · ${G.cities[o.city].name}` : `${facName(o.f)} · ${G.cities[o.city].name}`), el('span', { class: 's' }, `통${o.lead} 무${o.war} 지${o.int} 정${o.pol} 매${o.cha}${o.st === 'on' && !isRuler(o) && o.f === fId ? ` · 충${o.loy}` : ''}`)))));
    };
    draw();
    this.modal({ title: '인물', wide: true, body: box, cancel: 'x', buttons: [{ k: 'x', label: '닫기' }] });
  },
  chronicle() {
    const ch = G.chron || [];
    const body = ch.length ? el('div', { class: 'pickList', style: 'max-height:60vh' }, [...ch].reverse().map(r => el('button', { class: 'offRow', onclick: async () => { await replayChron(r); this.chronicle(); } }, el('span', { class: 'muted num', style: 'width:64px;flex:none;font-size:12px' }, r.d.replace('.', '년 ') + '월'), el('span', { class: 'n disp' }, r.title), el('span', { class: 's' }, (r.lines.find(l => l[0]) || [])[0] || '')))) : el('div', { class: 'hint' }, '아직 일어난 역사 사건이 없습니다.');
    this.modal({ title: '연표', wide: true, body, cancel: 'x', buttons: [{ k: 'x', label: '닫기' }] });
  },
  async menu() {
    const k = await this.choose({ title: `메뉴 · 난이도 ${DIFF().name}`, options: [{ k: 'save', label: '저장하기' }, { k: 'load', label: '불러오기' }, { k: 'snd', label: SFX.on ? '소리 끄기' : '소리 켜기' }, { k: 'bgm', label: BGM.on ? '배경 음악 끄기' : '배경 음악 켜기' }, { k: 'scn', label: scenesOn() ? '남의 역사 사건 장면 끄기' : '남의 역사 사건 장면 켜기' }, { k: 'chron', label: `연표 (${(G.chron || []).length}개 사건)` }, { k: 'anim', label: `지도 연출: ${({ 1: '보통', 0.5: '빠르게', 0: '끔' })[+(store('gunung.anim') ?? 1)]} → 바꾸기` }, { k: 'help', label: '하는 법' }, { k: 'title', label: '처음 화면으로' }, { k: 'x', label: '닫기' }] });
    if (k === 'save') this.saveDialog();
    if (k === 'load') this.loadDialog();
    if (k === 'scn') { store('gunung.scenes', scenesOn() ? '0' : '1'); this.toast(scenesOn() ? '모든 역사 사건을 장면으로 봅니다' : '내가 얽힌 사건만 장면으로 봅니다'); }
    if (k === 'snd') { SFX.toggle(); this.toast(SFX.on ? '소리를 켰습니다' : '소리를 껐습니다'); }
    if (k === 'bgm') { SFX.ensure(); BGM.toggle(); this.toast(BGM.on ? '배경 음악을 켰습니다' : '배경 음악을 껐습니다'); }
    if (k === 'help') showHelp();
    if (k === 'anim') { const cur = +(store('gunung.anim') ?? 1), nx = cur === 1 ? .5 : cur === .5 ? 0 : 1; store('gunung.anim', String(nx)); this.toast(`지도 연출: ${({ 1: '보통', 0.5: '빠르게', 0: '끔' })[nx]}`); }
    if (k === 'chron') this.chronicle();
    if (k === 'title') { if (await this.confirm('처음 화면으로', '저장하지 않은 진행은 자동 저장(매달 초)까지만 남습니다.')) showScreen('scrTitle'); }
  },
  async saveDialog() {
    const k = await this.choose({ title: '저장', options: [1, 2, 3].map(s => { const m = saveMeta(s); return { k: s, label: `칸 ${s} — ${m ? `${m.d} · ${m.who} (${m.role})` : '비어 있음'}` }; }).concat([{ k: 'x', label: '취소' }]) });
    if (k === 'x' || !k) return;
    saveGame(k); this.toast(`칸 ${k}에 저장했습니다`);
  },
  async loadDialog() {
    const slots = ['auto', 1, 2, 3];
    const k = await this.choose({ title: '불러오기', options: slots.map(s => { const m = saveMeta(s); return { k: s, label: `${s === 'auto' ? '자동 저장' : '칸 ' + s} — ${m ? `${m.d} · ${m.who} (${m.role})` : '비어 있음'}`, disabled: !m }; }).concat([{ k: 'x', label: '취소' }]) });
    if (k === 'x' || !k) return false;
    if (loadGame(k)) { startPlaying(); this.toast('불러왔습니다'); return true; }
    this.toast('불러오지 못했습니다'); return false;
  },
  async gameOver(won) {
    const k = await this.choose({ title: won ? '대업을 이루다' : '이야기의 끝', text: `${G.year}년 ${G.month}월\n전투 ${G.stats.battles}번`, options: [{ k: 'cont', label: '다른 인물로 계속' }, { k: 'title', label: '처음 화면으로' }] });
    if (k === 'title') showScreen('scrTitle'); else { G.over = false; this.pickSuccessor(); }
  },
  pickSuccessor() { Setup.openPick(true); },
};
function kvi(k, v) { return el('div', {}, el('span', {}, k), el('b', {}, v)); }

// 새 세력 만들기 (거병·독립)
function createFaction(P, c, troops, keepCity) {
  const used = new Set(G.factions.filter(f => f.alive).map(f => f.color));
  const palette = ['#d2b04c', '#4fb3a3', '#b2577a', '#7f8fd6', '#d58a5b', '#8fbf5a', '#b98ad6', '#e0e0e0'];
  const color = palette.find(p => !used.has(p)) || '#e0d070';
  const F = { id: G.factions.length, key: 'p' + P.id + '_' + G.year, name: P.name, color, ruler: P.id, alive: true, capital: c.id };
  G.factions.push(F);
  P.st = 'on'; P.f = F.id; P.city = c.id; P.loy = 100; P.merit = Math.max(P.merit, 1000);
  c.f = F.id; c.gov = P.id; c.deleg = false;
  if (!keepCity) { c.troops = Math.max(c.troops, troops); c.train = Math.max(c.train, 40); c.gold += 400; c.food += 3000; c.order = Math.max(c.order, 50); }
  G.factions.forEach(o => { if (o.id !== F.id) G.rel[relKey(o.id, F.id)] = 45; });
  logMsg(`${eun(P.name)} ${c.name}에서 일어나 군주가 되었습니다`, 'big');
  assignGovs();
  return F;
}
