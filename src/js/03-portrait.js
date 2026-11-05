// ===== 초상화 (코드로 그림) =====
const PORTRAIT_CACHE = {};
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
  const key = o.name + '|' + kind + '|' + ab + '|' + (o.f >= 0 && G ? G.factions[o.f].color : '');
  if (PORTRAIT_CACHE[key]) return PORTRAIT_CACHE[key];
  const cv = document.createElement('canvas'); cv.width = 120; cv.height = 140;
  drawPortrait(cv.getContext('2d'), o, kind, ab);
  return PORTRAIT_CACHE[key] = cv.toDataURL();
}
function drawPortrait(x, o, kind, ab) {
  const R = mulberry(hashStr(o.name) + 7);
  const W = 120, H = 140;
  const col = o.f >= 0 && G ? G.factions[o.f].color : '#7d7666';
  // 배경: 비단 느낌의 세로 그라데이션
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2b3a40'); bg.addColorStop(1, '#15201f');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.globalAlpha = .18; x.fillStyle = col; x.beginPath(); x.arc(60, 58, 54, 0, 7); x.fill(); x.globalAlpha = 1;
  // 피부
  let skin = ['#e8c39e', '#ddb28a', '#d2a37a', '#e3bb95', '#c99a70'][Math.floor(R() * 5)];
  if (o.name === '관우') skin = '#b6463a';
  if (o.name === '장비') skin = '#9c7656';
  if (o.name === '맹획') skin = '#8e6a48';
  const dark = shade(skin, -28);
  // 옷/갑옷
  const robe = kind === 'warrior' ? '#4a4d52' : shade(col, -20);
  x.fillStyle = robe;
  x.beginPath(); x.moveTo(8, H); x.quadraticCurveTo(14, 104, 40, 98); x.lineTo(80, 98); x.quadraticCurveTo(106, 104, 112, H); x.closePath(); x.fill();
  if (kind === 'warrior') { // 비늘 갑옷
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1;
    for (let yy = 104; yy < H; yy += 7) for (let xx = 14 + ((yy / 7) % 2) * 4; xx < 108; xx += 8) { x.beginPath(); x.arc(xx, yy, 4, 0, Math.PI); x.stroke(); }
    x.fillStyle = col; x.fillRect(48, 98, 24, 6);
  } else { // 옷깃
    x.fillStyle = '#efe6d2'; x.beginPath(); x.moveTo(44, 98); x.lineTo(60, 126); x.lineTo(76, 98); x.lineTo(70, 98); x.lineTo(60, 116); x.lineTo(50, 98); x.fill();
  }
  // 목
  x.fillStyle = dark; x.fillRect(51, 84, 18, 16);
  // 얼굴
  const fw = 30 + R() * 5, fh = 38 + R() * 4;
  x.fillStyle = skin; x.beginPath(); x.ellipse(60, 60, fw, fh, 0, 0, 7); x.fill();
  // 귀
  x.beginPath(); x.ellipse(60 - fw + 1, 62, 5, 8, 0, 0, 7); x.ellipse(60 + fw - 1, 62, 5, 8, 0, 0, 7); x.fill();
  // 눈썹: 무력이 높으면 치켜올림
  const fierce = (o.war - 50) / 50; // -1~1
  x.strokeStyle = ab === 3 ? '#cfcac0' : '#1e1712'; x.lineWidth = 3.5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(42, 50 + fierce * 2); x.lineTo(54, 48 - fierce * 3); x.moveTo(78, 50 + fierce * 2); x.lineTo(66, 48 - fierce * 3); x.stroke();
  // 눈
  x.fillStyle = '#1b1410';
  const ey = 56, eh = 2 + R() * 1.5;
  x.beginPath(); x.ellipse(48, ey, 5, eh, -fierce * .15, 0, 7); x.ellipse(72, ey, 5, eh, fierce * .15, 0, 7); x.fill();
  if (o.int >= 85) { x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(49, ey - 1, 1.5, 1.5); x.fillRect(73, ey - 1, 1.5, 1.5); }
  // 코·입
  x.strokeStyle = dark; x.lineWidth = 2;
  x.beginPath(); x.moveTo(60, 58); x.lineTo(57, 70); x.lineTo(62, 71); x.stroke();
  x.beginPath(); x.moveTo(53, 80); x.quadraticCurveTo(60, 82 + (o.cha - 60) / 20, 67, 80); x.stroke();
  // 주름
  if (ab >= 2) { x.strokeStyle = 'rgba(60,30,20,.35)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(44, 40); x.lineTo(56, 39); x.moveTo(64, 39); x.lineTo(76, 40); x.moveTo(41, 64); x.lineTo(45, 70); x.moveTo(79, 64); x.lineTo(75, 70); x.stroke(); }
  // 수염
  const hairC = ab === 3 ? '#d8d4ca' : ab === 2 ? '#5a5048' : '#1d1611';
  x.fillStyle = hairC; x.strokeStyle = hairC;
  const beard = ab === 0 ? 0 : (o.name === '관우' ? 3 : o.name === '장비' ? 4 : 1 + Math.floor(R() * 3));
  if (beard >= 1) { x.lineWidth = 3; x.beginPath(); x.moveTo(50, 76); x.quadraticCurveTo(60, 72, 70, 76); x.stroke(); }
  if (beard === 2) { x.beginPath(); x.moveTo(55, 84); x.lineTo(60, 98); x.lineTo(65, 84); x.fill(); }
  if (beard === 3) { x.beginPath(); x.moveTo(46, 80); x.quadraticCurveTo(48, 120, 60, 132); x.quadraticCurveTo(72, 120, 74, 80); x.quadraticCurveTo(60, 90, 46, 80); x.fill(); }
  if (beard === 4) { for (let i = 0; i < 26; i++) { const a = Math.PI * (.15 + .7 * i / 25); x.lineWidth = 2; x.beginPath(); x.moveTo(60 + Math.cos(a) * 24, 70 + Math.sin(a) * 14); x.lineTo(60 + Math.cos(a) * 33, 74 + Math.sin(a) * 26); x.stroke(); } }
  // 머리·관
  x.fillStyle = hairC;
  x.beginPath(); x.ellipse(60, 32, fw + 2, 16, 0, Math.PI, 0); x.fill();
  if (kind === 'ruler') { // 면류관
    x.fillStyle = '#1a1a1a'; x.fillRect(36, 10, 48, 18);
    x.fillStyle = '#c9a24a'; x.fillRect(26, 6, 68, 6);
    x.strokeStyle = '#d9c38a'; x.lineWidth = 1;
    for (let i = 0; i < 7; i++) { const xx = 30 + i * 10; x.beginPath(); x.moveTo(xx, 12); x.lineTo(xx, 26); x.stroke(); x.fillStyle = '#e6d7a8'; x.beginPath(); x.arc(xx, 27, 1.8, 0, 7); x.fill(); }
  } else if (kind === 'warrior') { // 투구
    x.fillStyle = '#6a6e74'; x.beginPath(); x.ellipse(60, 30, fw + 5, 22, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#585b60'; x.fillRect(60 - fw - 5, 28, (fw + 5) * 2, 6);
    x.fillStyle = col; x.beginPath(); x.moveTo(60, 2); x.lineTo(56, 12); x.lineTo(64, 12); x.fill();
    if (o.name === '여포') { x.strokeStyle = '#d9a43a'; x.lineWidth = 3; x.beginPath(); x.moveTo(52, 10); x.quadraticCurveTo(20, -10, 4, 30); x.moveTo(68, 10); x.quadraticCurveTo(100, -10, 116, 30); x.stroke(); }
  } else if (kind === 'scholar') { // 관(冠)
    x.fillStyle = '#181818'; x.beginPath(); x.moveTo(44, 26); x.lineTo(48, 6); x.lineTo(72, 6); x.lineTo(76, 26); x.fill();
    x.fillStyle = '#2a2a2a'; x.fillRect(40, 22, 40, 6);
  } else { // 두건
    x.fillStyle = o.st === 'ronin' ? '#5a6a5e' : shade(col, -35);
    x.beginPath(); x.ellipse(60, 28, fw + 3, 18, 0, Math.PI, 0); x.fill();
    x.fillRect(60 - fw - 3, 26, (fw + 3) * 2, 6);
  }
  // 테두리
  x.strokeStyle = 'rgba(201,162,74,.6)'; x.lineWidth = 2; x.strokeRect(1, 1, W - 2, H - 2);
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp((n >> 8 & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function portraitImg(o, cls = 'pt') { return el('img', { class: cls, src: portraitURL(o), alt: o.name }); }
