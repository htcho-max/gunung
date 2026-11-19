// ===== 아이콘 (24×24 선 그림, currentColor) =====
const ICONS = {
  gold: '<circle cx="12" cy="12" r="8.5"/><rect x="9.5" y="9.5" width="5" height="5"/>',
  food: '<path d="M7 9c0-3 2-5 5-5s5 2 5 5"/><path d="M5.5 10h13l-1.5 9.5a1.5 1.5 0 0 1-1.5 1.3H8.5A1.5 1.5 0 0 1 7 19.5z"/><path d="M10 4.5 12 7l2-2.5"/>',
  troops: '<path d="M12 2v16"/><path d="M9 5l3-3 3 3"/><path d="M7 21l5-3 5 3"/><path d="M8 11h8"/>',
  pop: '<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M2.5 20c.5-4 2.8-6 5.5-6s5 2 5.5 6"/><path d="M13.5 15.2c.9-.8 1.9-1.2 3-1.2 2.3 0 4 1.8 4.5 6"/>',
  train: '<ellipse cx="12" cy="7" rx="7" ry="2.5"/><path d="M5 7v8c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V7"/><path d="M3 21 9 13M21 21l-6-8"/>',
  order: '<path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  agri: '<path d="M12 21V10"/><path d="M12 13c-4 0-6-2.5-6-6 4 0 6 2.5 6 6z"/><path d="M12 10c0-3.5 2-6 6-6 0 3.5-2 6-6 6z"/><path d="M4 21h16"/>',
  comm: '<path d="M12 3v18M6 21h12"/><path d="M4 7h16"/><path d="m4 7-2.5 6a2.5 2.5 0 0 0 5 0z"/><path d="m20 7-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
  wall: '<path d="M3 21V9h3V6h3v3h2V6h2v3h2V6h3v3h3v12z"/><path d="M10 21v-5a2 2 0 0 1 4 0v5"/>',
  draft: '<path d="M6 21V3"/><path d="M6 4h12l-3 4 3 4H6"/><path d="M3 21h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
  hire: '<path d="M3 11.5 7 8l4 2 3-2 4 1.5 3 2"/><path d="M7 8 3 15l5 4 3-2 2 2 4-3 4-4.5"/><path d="m11 17-2-2M13 15l-2-2"/>',
  reward: '<rect x="3.5" y="9" width="17" height="11.5" rx="1"/><path d="M2.5 9h19M12 9v11.5"/><path d="M12 9C9.5 9 7 7.8 7 5.8 7 4 9 3.5 12 9zM12 9c2.5 0 5-1.2 5-3.2C17 4 15 3.5 12 9z"/>',
  move: '<path d="M8 18c-1.7 0-3-1-3-3s.7-5 3-5 3 3 3 5-1.3 3-3 3z"/><path d="M16 13c-1.7 0-3-1-3-3s.7-5 3-5 3 3 3 5-1.3 3-3 3z"/>',
  transport: '<path d="M2 15h13V7H2z"/><path d="M15 10h4l3 3v2h-7"/><circle cx="6" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>',
  attack: '<path d="M4 4l10 10M4 4h4M4 4v4"/><path d="M20 4 10 14M20 4h-4M20 4v4"/><path d="m7 15 2 2-3 3-2-2zM17 15l-2 2 3 3 2-2z"/>',
  diplo: '<path d="M6 3h11a2 2 0 0 1 2 2v13"/><path d="M6 3a2 2 0 0 0-2 2v1h4V5a2 2 0 0 0-2-2z"/><path d="M8 6v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1H10"/><path d="M11 9h5M11 12h5"/>',
  plot: '<path d="M3 9c3-3 6-4 9-4s6 1 9 4c-1 6-5 10-9 10S4 15 3 9z"/><path d="M7 11c1-.7 2-.7 3 0M14 11c1-.7 2-.7 3 0"/><path d="M10 15.5c1.3.7 2.7.7 4 0"/>',
  deleg: '<rect x="4" y="13" width="16" height="7" rx="1"/><path d="M8 13V9a4 4 0 0 1 8 0v4"/><path d="M12 16v1"/>',
  next: '<path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4c3-1.5 5 1.5 8 0s5-1 6 0v8c-1-1-3-1.5-6 0s-5-1.5-8 0"/>',
  people: '<circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20.5c.5-4.5 3.2-7 6.5-7s6 2.5 6.5 7"/><path d="M16 4.3a3.5 3.5 0 0 1 0 6.4M18 13.8c2 .9 3.2 3.2 3.5 6.7"/>',
  fame: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  merit: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-2.5 5 2.5-1.5-7"/>',
  train2: '<path d="M14.5 4.5 19.5 9.5M17 7l-9 9M5 19l2.5-2.5M4 15l5 5"/>',
  bond: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  work: '<path d="M4 20h16"/><path d="M6 20V10l6-5 6 5v10"/><path d="M10 20v-5h4v5"/>',
  serve: '<path d="M12 3v4M8 5l4 2 4-2"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/><circle cx="12" cy="10.5" r="3"/>',
  rise: '<path d="M5 21V3"/><path d="M5 3h13l-2.5 4.5L18 12H5"/><path d="M9 21h-6M12 7.5h0"/>',
  resign: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 8l-4 4 4 4M5 12h10"/>',
  rebel: '<path d="M12 2 9.5 9 3 12l6.5 3 2.5 7 2.5-7 6.5-3-6.5-3z"/>',
  zoomin: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8M10.5 7.5v6M7.5 10.5h6"/>',
  zoomout: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8M7.5 10.5h6"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
  fire: '<path d="M12 22c4.4 0 7-2.8 7-6.8 0-4.6-3.6-6.7-4.6-11.2-2 2-2.4 4.3-2.4 6-1.3-.8-2.4-2.3-2.4-4C6.9 8.3 5 11.6 5 15.2 5 19.2 7.6 22 12 22z"/><path d="M12 22c-1.8 0-3-1.3-3-3 0-2.2 2-3 2.6-5 1.6 1.4 3.4 2.6 3.4 5 0 1.7-1.2 3-3 3z"/>',
  confuse: '<path d="M12 12a2.5 2.5 0 1 1 2.5 2.5"/><path d="M14.5 14.5A5 5 0 1 1 17 9.5"/><path d="M17 9.5A7.5 7.5 0 1 1 9.5 4.5"/>',
  duel: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="m5 14 4 4M7 17l-3 3M3 19l2 2"/>',
  wait: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  end: '<path d="M5 4v16M19 12 8 4v16z"/>',
  auto: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  fast: '<path d="m4 6 7 6-7 6zM13 6l7 6-7 6z"/>',
  retreat: '<path d="M20 12H5M11 5l-7 7 7 7"/>',
  sword: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/>',
  horse: '<path d="M5 21c0-3 1-5 3-7-1-3 0-6 3-8l1-3 2 3c3 1 5 3 5 6l-2 1-2-1-2 2v7"/><circle cx="14.5" cy="7.5" r=".5"/>',
  xbow: '<path d="M4 9c5-3 11-3 16 0"/><path d="M4 9l8 4 8-4"/><path d="M12 4v17"/><path d="M10 18h4"/><path d="m10 6 2-2 2 2"/>',
  ram: '<path d="M3 15h14l3-3"/><path d="M4 15V9h11v6"/><path d="M6 9 9 5h3l3 4"/><path d="M5 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M12 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M17 12h4"/>',
  crown: '<path d="M3 8l4 4 5-6 5 6 4-4-2 11H5z"/><path d="M5 19h14"/>',
  rank: '<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8l5.5-.8z"/>',
  edict: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>',
  wine: '<path d="M7 3h10l-1 7a4 4 0 0 1-8 0z"/><path d="M12 14v6M8 21h8"/><path d="M7.5 7h9"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  form: '<circle cx="12" cy="5" r="2"/><circle cx="7" cy="11" r="2"/><circle cx="17" cy="11" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="12" cy="13" r="2"/><circle cx="20" cy="18" r="2"/>',
  bow: '<path d="M5 3c8 3 13 8 16 16"/><path d="M5 3 21 19"/><path d="m3 13 8-8M3 13l3 0M3 13v-3"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  save: '<path d="M5 3h11l4 4v14H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
};
function icon(name, cls = 'ic') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';
  return s;
}
// 연호 (후한 헌제)
function eraName(y) {
  const eras = [[220, '연강'], [196, '건안'], [194, '흥평'], [190, '초평'], [189, '영한'], [0, '중평']];
  const [start, n] = eras.find(([s]) => y >= s);
  const k = y - start + 1;
  return `${n} ${k === 1 ? '원' : k}년`;
}
