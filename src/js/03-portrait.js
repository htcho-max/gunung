// ===== 초상화 (코드로 그림) =====
// 얼굴형·눈·눈썹·코·입·수염·머리·관/투구·옷을 조합하고, 이름난 인물은 고유한 모습을 덧씌움
const PORTRAIT_CACHE = {};
// 고유 모습: face(round|square|long|oval) skin eye(phoenix|round|narrow|kind|fierce) brow(thick|bushy|thin|knit)
//   beard(none|thin|goatee|full|long|curly|stubble) beardCol hat(...) body(armor|robe|white|lamellar) robeCol extra[]
const PORTRAIT_SPECIAL = {
  관우: { skin: '#b5473a', eye: 'phoenix', brow: 'thick', beard: 'long', hat: 'greenScarf', body: 'robe', robeCol: '#2f6b46' },
  장비: { skin: '#a27a58', face: 'round', eye: 'round', brow: 'bushy', beard: 'curly', hat: 'helmet', body: 'armor' },
  유비: { eye: 'kind', brow: 'thin', beard: 'goatee', extra: ['bigEars'] },
  조조: { eye: 'narrow', brow: 'thin', beard: 'thin', face: 'oval' },
  여포: { face: 'oval', eye: 'fierce', brow: 'knit', beard: 'none', hat: 'pheasant', body: 'armor', young: true },
  제갈량: { face: 'long', eye: 'kind', brow: 'thin', beard: 'goatee', hat: 'silkScarf', body: 'white', extra: ['fan'] },
  손권: { eye: 'round', beard: 'full', beardCol: '#6a3a6e', extra: ['greenEyes'] },
  손견: { face: 'square', eye: 'fierce', beard: 'full', hat: 'redBand', body: 'armor' },
  손책: { face: 'oval', eye: 'fierce', beard: 'none', hat: 'redBand', body: 'armor', young: true },
  동탁: { face: 'round', skin: '#d9a77d', eye: 'narrow', brow: 'bushy', beard: 'full', extra: ['fat'] },
  황충: { beard: 'long', beardCol: '#e8e4dc', hairCol: '#e8e4dc', hat: 'helmet', body: 'armor' },
  조운: { face: 'oval', eye: 'phoenix', beard: 'none', hat: 'silverHelm', body: 'white', young: true },
  마초: { face: 'oval', eye: 'fierce', beard: 'none', hat: 'lionHelm', body: 'white', young: true },
  하후돈: { eye: 'fierce', beard: 'full', hat: 'helmet', body: 'armor', extra: ['eyepatch'] },
  전위: { face: 'square', skin: '#a8805e', eye: 'round', brow: 'bushy', beard: 'stubble', hat: 'band', body: 'armor', extra: ['fat'] },
  허저: { face: 'round', eye: 'round', brow: 'thick', beard: 'stubble', hat: 'topknot', body: 'armor', extra: ['fat'] },
  주유: { face: 'oval', eye: 'phoenix', brow: 'thin', beard: 'none', hat: 'scholar', body: 'robe', young: true },
  사마의: { face: 'long', eye: 'narrow', brow: 'knit', beard: 'goatee' },
  원소: { eye: 'phoenix', brow: 'thin', beard: 'thin' },
  원술: { face: 'round', eye: 'narrow', beard: 'thin', extra: ['fat'] },
  맹획: { skin: '#8a6040', face: 'square', eye: 'round', brow: 'bushy', beard: 'curly', hat: 'feathers', body: 'lamellar', extra: ['earring'] },
  육손: { face: 'oval', eye: 'kind', beard: 'none', hat: 'scholar', young: true },
  여몽: { face: 'square', eye: 'fierce', beard: 'thin', hat: 'helmet', body: 'armor' },
  감녕: { eye: 'fierce', beard: 'stubble', hat: 'feathers', body: 'lamellar', extra: ['bell'] },
  태사자: { eye: 'fierce', beard: 'thin', hat: 'helmet', body: 'armor' },
  장료: { face: 'long', eye: 'fierce', beard: 'goatee', hat: 'helmet', body: 'armor' },
  가후: { face: 'long', eye: 'narrow', brow: 'knit', beard: 'goatee' },
  곽가: { face: 'oval', eye: 'kind', beard: 'thin', young: true },
  순욱: { face: 'oval', eye: 'kind', brow: 'thin', beard: 'thin' },
  방통: { face: 'round', skin: '#c99a70', eye: 'round', brow: 'bushy', beard: 'stubble', hat: 'scholar' },
  강유: { face: 'oval', eye: 'phoenix', beard: 'thin', hat: 'helmet', body: 'armor', young: true },
};
const SKINS = ['#ecc8a2', '#e2b98f', '#d6a87e', '#e8bf96', '#cc9b72', '#deb48a'];
function portraitKind(o) {
  if (o.st === 'on' && isRuler(o)) return 'ruler';
  if (o.war >= o.int + 8 || o.war >= 85) return 'warrior';
  if (o.int >= 75 || o.pol >= 78) return 'scholar';
  return 'plain';
}
function portraitURL(o) {
  const kind = portraitKind(o);
  const a = G ? age(o) : 30;
  const ab = a < 24 ? 0 : a < 45 ? 1 : a < 60 ? 2 : 3;
  const patch = o.name === '하후돈' && G && G.year >= 198;
  const key = o.name + '|' + kind + '|' + ab + '|' + (o.f >= 0 && G ? G.factions[o.f].color : '') + '|' + patch;
  if (PORTRAIT_CACHE[key]) return PORTRAIT_CACHE[key];
  const cv = document.createElement('canvas'); cv.width = 120; cv.height = 140;
  drawPortrait(cv.getContext('2d'), o, kind, ab, patch);
  return PORTRAIT_CACHE[key] = cv.toDataURL();
}
function drawPortrait(x, o, kind, ab, patch) {
  const R = mulberry(hashStr(o.name) + 7);
  const pick2 = arr => arr[Math.floor(R() * arr.length)];
  const sp = PORTRAIT_SPECIAL[o.name] || {};
  const W = 120, H = 140, cx = 60;
  const col = o.f >= 0 && G ? G.factions[o.f].color : '#7d7666';
  // 특징 정하기
  const face = sp.face || pick2(['oval', 'oval', 'square', 'round', 'long']);
  const skin = sp.skin || pick2(SKINS);
  const eye = sp.eye || (o.war >= 85 ? pick2(['fierce', 'round', 'phoenix']) : o.int >= 85 ? pick2(['narrow', 'phoenix', 'kind']) : pick2(['round', 'kind', 'narrow', 'phoenix', 'fierce']));
  const brow = sp.brow || (o.war >= 85 ? pick2(['thick', 'bushy', 'knit']) : pick2(['thin', 'thick', 'knit', 'thin']));
  const young = sp.young || ab === 0;
  const beard = sp.beard || (young ? pick2(['none', 'none', 'stubble']) : pick2(['thin', 'goatee', 'full', 'long', 'thin', 'stubble']));
  const greyHair = ab >= 3 ? '#d9d5cc' : ab === 2 ? pick2(['#4a423b', '#6b645c']) : pick2(['#16110d', '#231a13', '#2b2018']);
  const hairCol = sp.hairCol || greyHair;
  const beardCol = sp.beardCol || hairCol;
  let hat = sp.hat;
  if (!hat) {
    if (kind === 'ruler') hat = 'crown';
    else if (kind === 'warrior') hat = pick2(['helmet', 'helmet', 'band', 'topknot', 'silverHelm']);
    else if (kind === 'scholar') hat = pick2(['scholar', 'scholar', 'silkScarf', 'tallCap']);
    else hat = o.st === 'ronin' ? pick2(['scarf', 'topknot', 'straw']) : pick2(['scarf', 'topknot', 'tallCap']);
  }
  if (kind === 'ruler' && !['crown'].includes(hat) && !sp.hat) hat = 'crown';
  if (kind === 'ruler' && sp.hat && !['redBand', 'greenScarf'].includes(sp.hat)) hat = 'crown';
  const body = sp.body || (kind === 'warrior' ? pick2(['armor', 'armor', 'lamellar']) : kind === 'ruler' ? 'royal' : 'robe');
  const extra = new Set(sp.extra || []);
  if (patch) extra.add('eyepatch'); else extra.delete('eyepatch');
  const fat = extra.has('fat');

  // ── 배경: 세력색 비단 + 상서로운 구름
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, shade(col, -55)); bg.addColorStop(1, '#0e1618');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.globalAlpha = .13; x.strokeStyle = shade(col, 60); x.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const yy = 20 + i * 30, xx = (i % 2) * 50 + 10; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(xx + k * 14, yy, 7, Math.PI, 0); x.stroke(); } }
  x.globalAlpha = 1;
  const halo = x.createRadialGradient(cx, 58, 10, cx, 58, 62); halo.addColorStop(0, 'rgba(255,240,210,.18)'); halo.addColorStop(1, 'rgba(255,240,210,0)');
  x.fillStyle = halo; x.fillRect(0, 0, W, H);

  // 인물은 조금 줄여 아래로 (관·깃털이 잘리지 않게)
  x.save(); x.translate(cx * .12, 18); x.scale(.88, .88);
  // ── 몸과 옷
  const sw = fat ? 56 : 50;
  const robeCol = sp.robeCol || (body === 'white' ? '#d8d6cc' : body === 'royal' ? shade(col, -10) : shade(col, -25));
  if (body === 'armor' || body === 'lamellar') {
    x.fillStyle = body === 'lamellar' ? '#6b5a44' : '#4b4f55';
    x.beginPath(); x.moveTo(cx - sw - 4, H); x.quadraticCurveTo(cx - sw, 104, cx - 20, 100); x.lineTo(cx + 20, 100); x.quadraticCurveTo(cx + sw, 104, cx + sw + 4, H); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 1;
    for (let yy = 106; yy < H; yy += 6) for (let xx = cx - sw + ((yy / 6) % 2) * 4; xx < cx + sw; xx += 8) { x.beginPath(); x.arc(xx, yy, 4, 0, Math.PI); x.stroke(); }
    // 어깨 짐승 머리 장식
    for (const s of [-1, 1]) {
      const px = cx + s * (sw - 10), py = 110;
      x.fillStyle = '#a88a3e'; x.beginPath(); x.ellipse(px, py, 13, 9, s * .3, 0, 7); x.fill();
      x.fillStyle = '#5a4416'; x.beginPath(); x.arc(px - 3 * s, py - 1, 1.8, 0, 7); x.arc(px + 3 * s, py - 1, 1.8, 0, 7); x.fill();
    }
    x.fillStyle = col; x.fillRect(cx - 22, 100, 44, 5);
    x.fillStyle = shade(col, -30); x.beginPath(); x.moveTo(cx - 14, 100); x.lineTo(cx, 116); x.lineTo(cx + 14, 100); x.fill();
  } else {
    const g = x.createLinearGradient(cx - sw, 0, cx + sw, 0); g.addColorStop(0, shade(robeCol, 20)); g.addColorStop(1, shade(robeCol, -30));
    x.fillStyle = g;
    x.beginPath(); x.moveTo(cx - sw - 4, H); x.quadraticCurveTo(cx - sw + 2, 104, cx - 20, 98); x.lineTo(cx + 20, 98); x.quadraticCurveTo(cx + sw - 2, 104, cx + sw + 4, H); x.fill();
    // 겹친 옷깃
    x.fillStyle = body === 'white' ? '#9fb5c8' : '#efe6d2';
    x.beginPath(); x.moveTo(cx - 20, 98); x.lineTo(cx + 6, 132); x.lineTo(cx + 12, 126); x.lineTo(cx - 12, 98); x.fill();
    x.beginPath(); x.moveTo(cx + 20, 98); x.lineTo(cx - 4, 128); x.lineTo(cx - 10, 122); x.lineTo(cx + 12, 98); x.fill();
    if (body === 'royal') { x.strokeStyle = '#e8c56f'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 20, 98); x.lineTo(cx + 6, 132); x.moveTo(cx + 20, 98); x.lineTo(cx - 4, 128); x.stroke(); }
  }
  // 목
  x.fillStyle = shade(skin, -35); x.fillRect(cx - 9, 84, 18, 17);

  // ── 얼굴
  const fw = (face === 'round' ? 33 : face === 'square' ? 32 : face === 'long' ? 27 : 29) + (fat ? 4 : 0) + R() * 2;
  const fh = (face === 'long' ? 42 : face === 'round' ? 36 : 39) + R() * 2;
  const fy = 60;
  const faceShape = () => {
    x.beginPath();
    if (face === 'square') { x.moveTo(cx - fw, fy - fh * .6); x.quadraticCurveTo(cx - fw, fy - fh, cx, fy - fh); x.quadraticCurveTo(cx + fw, fy - fh, cx + fw, fy - fh * .6); x.lineTo(cx + fw * .95, fy + fh * .45); x.quadraticCurveTo(cx + fw * .7, fy + fh, cx, fy + fh); x.quadraticCurveTo(cx - fw * .7, fy + fh, cx - fw * .95, fy + fh * .45); x.closePath(); }
    else x.ellipse(cx, fy, fw, fh, 0, 0, 7);
  };
  // 귀
  const earR = extra.has('bigEars') ? 9 : 6;
  x.fillStyle = shade(skin, -10);
  for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * (fw - 1), fy + 4, earR * .7, earR * 1.35 + (extra.has('bigEars') ? 4 : 0), 0, 0, 7); x.fill(); }
  if (extra.has('earring')) { x.strokeStyle = '#e8c56f'; x.lineWidth = 2; x.beginPath(); x.arc(cx - fw + 1, fy + 18, 4, 0, 7); x.stroke(); }
  const sg = x.createRadialGradient(cx - fw * .35, fy - fh * .4, 4, cx, fy, fw * 1.4);
  sg.addColorStop(0, shade(skin, 18)); sg.addColorStop(.6, skin); sg.addColorStop(1, shade(skin, -32));
  x.fillStyle = sg; faceShape(); x.fill();
  // 볼
  x.fillStyle = 'rgba(210,100,80,.16)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * fw * .55, fy + 10, 7, 4, 0, 0, 7); x.fill(); }

  // ── 눈썹
  const fierce = eye === 'fierce' ? 1 : eye === 'kind' ? -.6 : (o.war - 60) / 60;
  const ey = fy - 3;
  x.strokeStyle = hairCol; x.fillStyle = hairCol; x.lineCap = 'round';
  for (const s of [-1, 1]) {
    const ox = cx + s * 12, inner = ox - s * 7, outer = ox + s * 8;
    const yi = ey - 9 + fierce * 2.5, yo = ey - 11 - fierce * 2 - (brow === 'knit' ? -1 : 0);
    if (brow === 'bushy') { x.beginPath(); x.moveTo(inner, yi + 2); x.quadraticCurveTo(ox, yi - 7, outer, yo); x.lineTo(outer, yo + 4); x.quadraticCurveTo(ox, yi - 2, inner, yi + 4); x.fill(); }
    else { x.lineWidth = brow === 'thick' ? 4 : brow === 'knit' ? 3.2 : 2.2; x.beginPath(); x.moveTo(inner, yi); x.quadraticCurveTo(ox, yo - 2, outer, yo); x.stroke(); }
    if (brow === 'knit') { x.lineWidth = 1; x.strokeStyle = 'rgba(80,40,25,.5)'; x.beginPath(); x.moveTo(cx - 2, ey - 9); x.lineTo(cx - 1, ey - 5); x.moveTo(cx + 2, ey - 9); x.lineTo(cx + 1, ey - 5); x.stroke(); x.strokeStyle = hairCol; }
  }
  // ── 눈
  for (const s of [-1, 1]) {
    const ox = cx + s * 12;
    if (s === -1 && extra.has('eyepatch')) continue;
    const w = eye === 'round' ? 5.5 : eye === 'narrow' ? 6.5 : 6, h = eye === 'round' ? 3.6 : eye === 'narrow' ? 1.6 : eye === 'phoenix' ? 2.2 : 2.8;
    const tilt = (eye === 'phoenix' || eye === 'fierce' ? .28 : eye === 'kind' ? -.15 : 0) * -s;
    x.save(); x.translate(ox, ey); x.rotate(tilt);
    x.fillStyle = '#f4eee2'; x.beginPath(); x.ellipse(0, 0, w, h, 0, 0, 7); x.fill();
    x.fillStyle = extra.has('greenEyes') ? '#3f7a52' : '#2a1a10'; x.beginPath(); x.arc(s * .5, .2, Math.min(h, 2.6) + .3, 0, 7); x.fill();
    x.fillStyle = '#0c0806'; x.beginPath(); x.arc(s * .5, .2, 1.1, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(s * .5 - .8, -.6, .7, 0, 7); x.fill();
    x.strokeStyle = '#1c120c'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(0, 0, w, h, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    if (eye === 'phoenix') { x.beginPath(); x.moveTo(w * .7 * -s * -1, -h * .5); x.lineTo(w * 1.25 * s, -h * 1.2); x.stroke(); }
    x.restore();
  }
  if (extra.has('eyepatch')) {
    x.fillStyle = '#1a1410'; x.beginPath(); x.ellipse(cx - 12, ey, 7, 5.5, 0, 0, 7); x.fill();
    x.strokeStyle = '#1a1410'; x.lineWidth = 1.8; x.beginPath(); x.moveTo(cx - 19, ey - 2); x.lineTo(cx - fw + 2, ey - 12); x.moveTo(cx - 5, ey - 3); x.lineTo(cx + fw - 2, ey - 14); x.stroke();
  }
  // ── 코
  x.strokeStyle = shade(skin, -55); x.lineWidth = 1.7;
  const nb = R();
  x.beginPath(); x.moveTo(cx - 1, ey + 2); x.quadraticCurveTo(cx - 4 - nb * 2, ey + 11, cx - 4, ey + 14); x.quadraticCurveTo(cx, ey + 16, cx + 4, ey + 14); x.stroke();
  x.fillStyle = 'rgba(255,240,220,.35)'; x.beginPath(); x.ellipse(cx + 1, ey + 8, 1.4, 4, 0, 0, 7); x.fill();
  // ── 입
  const my = fy + 22;
  x.strokeStyle = '#7a3a2a'; x.lineWidth = 1.8;
  const smile = (o.cha - 60) / 25 - (eye === 'fierce' ? 1 : 0);
  x.beginPath(); x.moveTo(cx - 7, my); x.quadraticCurveTo(cx, my + smile * 1.6 + 1, cx + 7, my); x.stroke();
  x.fillStyle = 'rgba(160,70,55,.45)'; x.beginPath(); x.ellipse(cx, my + 2.5, 4, 1.4, 0, 0, 7); x.fill();
  // ── 주름
  if (ab >= 2) { x.strokeStyle = 'rgba(90,45,30,.35)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(cx - 10, fy - fh * .72); x.lineTo(cx + 10, fy - fh * .72); x.moveTo(cx - 9, fy - fh * .62); x.lineTo(cx + 9, fy - fh * .62); x.moveTo(cx - 13, my - 6); x.lineTo(cx - 10, my + 2); x.moveTo(cx + 13, my - 6); x.lineTo(cx + 10, my + 2); x.stroke(); }

  // ── 수염
  x.fillStyle = beardCol; x.strokeStyle = beardCol;
  const stache = () => { x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 10, my - 2); x.quadraticCurveTo(cx - 4, my - 5, cx, my - 3); x.quadraticCurveTo(cx + 4, my - 5, cx + 10, my - 2); x.stroke(); };
  if (beard === 'stubble') { x.fillStyle = 'rgba(40,30,25,.22)'; x.beginPath(); x.ellipse(cx, my + 4, fw * .75, 14, 0, 0, Math.PI); x.fill(); }
  if (beard === 'thin') { stache(); x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx - 10, my - 2); x.quadraticCurveTo(cx - 14, my + 4, cx - 13, my + 9); x.moveTo(cx + 10, my - 2); x.quadraticCurveTo(cx + 14, my + 4, cx + 13, my + 9); x.stroke(); }
  if (beard === 'goatee') { stache(); x.beginPath(); x.moveTo(cx - 5, my + 5); x.quadraticCurveTo(cx, my + 22, cx + 1, my + 26); x.quadraticCurveTo(cx + 2, my + 20, cx + 5, my + 5); x.fill(); }
  if (beard === 'full') { stache(); x.beginPath(); x.moveTo(cx - fw * .9, fy + 4); x.quadraticCurveTo(cx - fw * .9, my + 18, cx, my + 22); x.quadraticCurveTo(cx + fw * .9, my + 18, cx + fw * .9, fy + 4); x.quadraticCurveTo(cx + fw * .6, my + 6, cx + 8, my + 4); x.lineTo(cx - 8, my + 4); x.quadraticCurveTo(cx - fw * .6, my + 6, cx - fw * .9, fy + 4); x.fill(); }
  if (beard === 'long') {
    stache();
    const g = x.createLinearGradient(0, my, 0, H); g.addColorStop(0, beardCol); g.addColorStop(1, shade(beardCol.startsWith('#') ? beardCol : '#222222', 25));
    x.fillStyle = g; x.beginPath(); x.moveTo(cx - fw * .8, fy + 8); x.quadraticCurveTo(cx - 20, H - 4, cx, H + 6); x.quadraticCurveTo(cx + 20, H - 4, cx + fw * .8, fy + 8); x.quadraticCurveTo(cx + 10, my + 6, cx, my + 5); x.quadraticCurveTo(cx - 10, my + 6, cx - fw * .8, fy + 8); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1; for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(cx + k * 5, my + 8); x.quadraticCurveTo(cx + k * 6, my + 30, cx + k * 3, H); x.stroke(); }
  }
  if (beard === 'curly') { stache(); for (let i = 0; i < 34; i++) { const a = Math.PI * (.08 + .84 * i / 33); x.lineWidth = 2.2; x.beginPath(); x.moveTo(cx + Math.cos(a) * fw * .75, fy + 8 + Math.sin(a) * 12); x.quadraticCurveTo(cx + Math.cos(a) * fw * 1.05, fy + 14 + Math.sin(a) * 22, cx + Math.cos(a + .08) * fw * 1.1, fy + 20 + Math.sin(a) * 28); x.stroke(); } }

  // ── 머리와 모자
  x.fillStyle = hairCol;
  const hairCap = () => { x.beginPath(); x.ellipse(cx, fy - fh * .55, fw + 2, fh * .55, 0, Math.PI, 0); x.fill(); };
  const gold = '#d9b25a';
  switch (hat) {
    case 'crown': {
      hairCap();
      x.fillStyle = '#1a1612'; x.beginPath(); x.moveTo(cx - 16, fy - fh + 4); x.lineTo(cx - 12, fy - fh - 18); x.lineTo(cx + 12, fy - fh - 18); x.lineTo(cx + 16, fy - fh + 4); x.fill();
      const g = x.createLinearGradient(0, fy - fh - 24, 0, fy - fh - 14); g.addColorStop(0, '#f6dc93'); g.addColorStop(1, '#a37a2c');
      x.fillStyle = g; x.fillRect(cx - 30, fy - fh - 24, 60, 7);
      x.strokeStyle = '#e6d7a8'; x.lineWidth = 1;
      for (let i = 0; i < 7; i++) { const xx = cx - 26 + i * 8.6; x.beginPath(); x.moveTo(xx, fy - fh - 17); x.lineTo(xx, fy - fh - 4); x.stroke(); x.fillStyle = i % 2 ? '#c94a30' : '#e6d7a8'; x.beginPath(); x.arc(xx, fy - fh - 3, 1.8, 0, 7); x.fill(); }
      x.fillStyle = gold; x.fillRect(cx - 3, fy - fh - 30, 6, 7);
      break;
    }
    case 'helmet': case 'silverHelm': case 'lionHelm': {
      const base = hat === 'helmet' ? '#5d636b' : '#c9ccd2', dk = shade(base, -40);
      const g = x.createLinearGradient(cx - fw, 0, cx + fw, 0); g.addColorStop(0, shade(base, 30)); g.addColorStop(1, dk);
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, fy - fh * .48, fw + 6, fh * .62, 0, Math.PI, 0); x.fill();
      x.fillRect(cx - fw - 6, fy - fh * .5, 10, 30); x.fillRect(cx + fw - 4, fy - fh * .5, 10, 30);
      x.fillStyle = gold; x.fillRect(cx - fw - 6, fy - fh * .52, (fw + 6) * 2, 5);
      x.fillStyle = col; x.beginPath(); x.moveTo(cx, fy - fh - 20); x.quadraticCurveTo(cx - 7, fy - fh - 8, cx - 4, fy - fh); x.lineTo(cx + 4, fy - fh); x.quadraticCurveTo(cx + 7, fy - fh - 8, cx, fy - fh - 20); x.fill();
      if (hat === 'lionHelm') { x.fillStyle = gold; x.beginPath(); x.ellipse(cx, fy - fh * .7, 10, 7, 0, 0, 7); x.fill(); x.fillStyle = '#5a4416'; x.beginPath(); x.arc(cx - 4, fy - fh * .72, 1.5, 0, 7); x.arc(cx + 4, fy - fh * .72, 1.5, 0, 7); x.fill(); }
      break;
    }
    case 'pheasant': {
      hairCap();
      const g = x.createLinearGradient(0, fy - fh - 14, 0, fy - fh + 6); g.addColorStop(0, '#f6dc93'); g.addColorStop(1, '#8a5a2a');
      x.fillStyle = g; x.beginPath(); x.moveTo(cx - 22, fy - fh + 6); x.quadraticCurveTo(cx, fy - fh - 22, cx + 22, fy - fh + 6); x.closePath(); x.fill();
      x.fillStyle = '#7a3a8a'; x.beginPath(); x.arc(cx, fy - fh - 6, 4, 0, 7); x.fill();
      for (const s of [-1, 1]) {
        x.strokeStyle = '#c47a2a'; x.lineWidth = 3.5; x.beginPath(); x.moveTo(cx + s * 8, fy - fh - 4); x.bezierCurveTo(cx + s * 30, fy - fh - 50, cx + s * 60, fy - fh - 30, cx + s * 64, fy - fh + 30); x.stroke();
        x.strokeStyle = '#3a2410'; x.lineWidth = 1; x.setLineDash([2, 4]); x.stroke(); x.setLineDash([]);
      }
      break;
    }
    case 'redBand': case 'greenScarf': case 'band': {
      hairCap();
      x.fillStyle = hairCol; x.beginPath(); x.ellipse(cx, fy - fh - 4, 9, 7, 0, 0, 7); x.fill();
      const bc = hat === 'redBand' ? '#c0392b' : hat === 'greenScarf' ? '#2f6b46' : shade(col, -10);
      if (hat === 'greenScarf') { x.fillStyle = bc; x.beginPath(); x.ellipse(cx, fy - fh * .62, fw + 4, fh * .58, 0, Math.PI, 0); x.fill(); x.beginPath(); x.ellipse(cx, fy - fh - 4, 11, 9, 0, 0, 7); x.fill(); }
      x.fillStyle = bc; x.fillRect(cx - fw - 2, fy - fh * .62, (fw + 2) * 2, 7);
      x.beginPath(); x.moveTo(cx + fw - 2, fy - fh * .58); x.quadraticCurveTo(cx + fw + 14, fy - fh * .4, cx + fw + 10, fy - 4); x.lineTo(cx + fw + 5, fy - 6); x.quadraticCurveTo(cx + fw + 7, fy - fh * .4, cx + fw - 4, fy - fh * .5); x.fill();
      break;
    }
    case 'scholar': case 'tallCap': {
      hairCap();
      x.fillStyle = '#16120e';
      if (hat === 'scholar') { x.beginPath(); x.moveTo(cx - 15, fy - fh + 2); x.lineTo(cx - 11, fy - fh - 22); x.lineTo(cx + 11, fy - fh - 22); x.lineTo(cx + 15, fy - fh + 2); x.fill(); x.fillStyle = '#2a241c'; x.fillRect(cx - 19, fy - fh - 3, 38, 6); x.strokeStyle = gold; x.lineWidth = 1.3; x.beginPath(); x.moveTo(cx - 24, fy - fh - 12); x.lineTo(cx + 24, fy - fh - 12); x.stroke(); }
      else { x.beginPath(); x.moveTo(cx - 10, fy - fh + 2); x.lineTo(cx - 8, fy - fh - 30); x.quadraticCurveTo(cx, fy - fh - 36, cx + 8, fy - fh - 30); x.lineTo(cx + 10, fy - fh + 2); x.fill(); }
      break;
    }
    case 'silkScarf': {
      hairCap();
      x.fillStyle = '#36597a'; x.beginPath(); x.moveTo(cx - fw - 3, fy - fh * .45); x.quadraticCurveTo(cx - fw, fy - fh - 18, cx, fy - fh - 16); x.quadraticCurveTo(cx + fw, fy - fh - 18, cx + fw + 3, fy - fh * .45); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1; for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(cx + k * 8, fy - fh - 14); x.lineTo(cx + k * 11, fy - fh * .5); x.stroke(); }
      x.fillStyle = '#36597a'; x.beginPath(); x.moveTo(cx + fw, fy - fh * .5); x.quadraticCurveTo(cx + fw + 12, fy - 10, cx + fw + 6, fy + 20); x.lineTo(cx + fw + 1, fy + 14); x.quadraticCurveTo(cx + fw + 5, fy - 10, cx + fw - 4, fy - fh * .4); x.fill();
      break;
    }
    case 'scarf': {
      x.fillStyle = o.st === 'ronin' ? '#5a6a5e' : shade(col, -35);
      x.beginPath(); x.ellipse(cx, fy - fh * .5, fw + 4, fh * .62, 0, Math.PI, 0); x.fill();
      x.fillRect(cx - fw - 4, fy - fh * .52, (fw + 4) * 2, 6);
      x.beginPath(); x.moveTo(cx + fw - 6, fy - fh * .45); x.lineTo(cx + fw + 10, fy - 4); x.lineTo(cx + fw + 3, fy - 2); x.closePath(); x.fill();
      break;
    }
    case 'straw': {
      hairCap();
      x.fillStyle = '#c9a868'; x.beginPath(); x.moveTo(cx - fw - 18, fy - fh * .5); x.quadraticCurveTo(cx, fy - fh - 30, cx + fw + 18, fy - fh * .5); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(90,60,20,.45)'; x.lineWidth = 1; for (let k = -4; k <= 4; k++) { x.beginPath(); x.moveTo(cx, fy - fh - 14); x.lineTo(cx + k * 12, fy - fh * .5); x.stroke(); }
      break;
    }
    case 'feathers': {
      hairCap();
      x.fillStyle = '#8a3a1c'; x.fillRect(cx - fw - 2, fy - fh * .6, (fw + 2) * 2, 7);
      const fc = ['#c94a30', '#e8c56f', '#3f7a52', '#e8c56f', '#c94a30'];
      fc.forEach((c2, i) => { x.fillStyle = c2; x.save(); x.translate(cx - 16 + i * 8, fy - fh * .6); x.rotate((i - 2) * .22); x.beginPath(); x.ellipse(0, -14, 3.2, 14, 0, 0, 7); x.fill(); x.restore(); });
      break;
    }
    case 'topknot': default: {
      hairCap();
      x.beginPath(); x.ellipse(cx, fy - fh - 5, 9, 8, 0, 0, 7); x.fill();
      x.fillStyle = gold; x.fillRect(cx - 14, fy - fh - 6, 28, 3);
    }
  }
  // ── 소품
  if (extra.has('fan')) {
    x.save(); x.translate(cx + 34, 128); x.rotate(-.35);
    for (let k = -4; k <= 4; k++) { x.fillStyle = k % 2 ? '#f2efe6' : '#dcd8cc'; x.beginPath(); x.moveTo(0, 0); x.lineTo(k * 5 - 3, -36); x.lineTo(k * 5 + 3, -36); x.closePath(); x.fill(); }
    x.fillStyle = '#6a4a2a'; x.fillRect(-2, 0, 4, 14); x.restore();
  }
  if (extra.has('bell')) { x.fillStyle = '#e8c56f'; x.beginPath(); x.arc(cx + 30, 112, 4, 0, 7); x.fill(); }
  x.restore();
  // 아래쪽이 비지 않도록 옷자락을 마저 채움
  x.fillStyle = body === 'armor' || body === 'lamellar' ? (body === 'lamellar' ? '#6b5a44' : '#4b4f55') : (sp.robeCol || (body === 'white' ? '#d8d6cc' : shade(col, -25)));
  x.fillRect(cx * .12 + (cx - sw - 4) * .88, 18 + 140 * .88 - 1, (sw * 2 + 8) * .88, H);
  // ── 가장자리 그늘과 테두리
  const vg = x.createRadialGradient(cx, 64, 40, cx, 70, 90); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(214,173,85,.75)'; x.lineWidth = 2; x.strokeRect(1, 1, W - 2, H - 2);
  x.strokeStyle = 'rgba(214,173,85,.3)'; x.lineWidth = 1; x.strokeRect(4.5, 4.5, W - 9, H - 9);
}
function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp((n >> 8 & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function portraitImg(o, cls = 'pt') { return el('img', { class: cls, src: portraitURL(o), alt: o.name }); }
