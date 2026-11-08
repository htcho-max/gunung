// ===== 공용 도구 =====
const VERSION = '0.7.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = () => Math.random();
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;
const fmt = n => Math.round(n).toLocaleString('ko-KR');
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// 한국어 조사
function josa(word, a, b) { // a: 받침 있을 때, b: 없을 때 (예: '은','는')
  const ch = String(word).charCodeAt(String(word).length - 1);
  if (ch < 0xAC00 || ch > 0xD7A3) return word + b;
  return word + (((ch - 0xAC00) % 28) ? a : b);
}
const eun = w => josa(w, '은', '는'), iga = w => josa(w, '이', '가'), eul = w => josa(w, '을', '를'), wa = w => josa(w, '과', '와'), ro = w => {
  const ch = String(w).charCodeAt(String(w).length - 1); const jong = (ch >= 0xAC00 && ch <= 0xD7A3) ? (ch - 0xAC00) % 28 : 0;
  return w + ((jong && jong !== 8) ? '으로' : '로');
};

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
