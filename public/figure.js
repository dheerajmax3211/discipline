// Side-view animated figure: forward kinematics + 2-bone IK, muscle overlays, props.
// Poses are authored in a 320x260 space (floor at y=235, figure faces right).
import { ANIMS } from './anims.js';

const R = Math.PI / 180;
const dir = (a) => [Math.cos(a * R), Math.sin(a * R)];
const add = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];
const SEG = { T: 62, TH: 58, SH: 56, UA: 36, FA: 34 };

export const MUSCLE_NAME = {
  chest: 'Chest', delts: 'Shoulders', rear_delts: 'Rear shoulders', biceps: 'Biceps', triceps: 'Triceps',
  forearms: 'Forearms', traps: 'Upper back', lats: 'Lats', lower_back: 'Lower back', abs: 'Abs',
  glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves', hip_flexors: 'Hip flexors', neck: 'Neck',
};

// [segment, t0, t1, side (f front / b back / c centre), offset (fraction of half-width), thickness]
const MUSCLE = {
  chest: [['T', 0.58, 0.95, 'f', 0.7, 9]],
  delts: [['UA', -0.12, 0.4, 'c', 0, 8.5]],
  rear_delts: [['UA', -0.12, 0.4, 'b', 0.4, 6], ['T', 0.85, 1.0, 'b', 0.6, 6]],
  biceps: [['UA', 0.18, 0.78, 'f', 0.65, 4.8]],
  triceps: [['UA', 0.15, 0.82, 'b', 0.65, 4.8]],
  forearms: [['FA', 0.08, 0.72, 'c', 0, 4.4]],
  traps: [['T', 0.82, 1.08, 'b', 0.55, 6.5]],
  lats: [['T', 0.35, 0.85, 'b', 0.7, 8]],
  lower_back: [['T', 0.02, 0.4, 'b', 0.75, 6.5]],
  abs: [['T', 0.1, 0.55, 'f', 0.75, 7]],
  glutes: [['T', -0.14, 0.12, 'b', 0.95, 11]],
  quads: [['TH', 0.1, 0.88, 'f', 0.7, 7]],
  hamstrings: [['TH', 0.1, 0.88, 'b', 0.7, 6.5]],
  calves: [['SH', 0.08, 0.62, 'b', 0.7, 5.2]],
  hip_flexors: [['TH', 0.0, 0.38, 'f', 0.55, 5.5]],
  neck: [['T', 1.02, 1.2, 'c', 0, 5.5]],
};
const FRONT = { T: 90, UA: -90, FA: -90, TH: -90, SH: -90 };
const HW = { T: 17, UA: 5.5, FA: 4.5, TH: 8.5, SH: 6.5 };

// Two-bone IK. `hint` picks which way the middle joint bends.
function ik(a, t, l1, l2, hint) {
  const dx = t[0] - a[0], dy = t[1] - a[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.5), l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const m = [a[0] + Math.cos(base) * d / 2, a[1] + Math.sin(base) * d / 2];
  let best = null, score = -Infinity;
  for (const s of [1, -1]) {
    const c = [a[0] + Math.cos(base + s * A) * l1, a[1] + Math.sin(base + s * A) * l1];
    const sc = (c[0] - m[0]) * hint[0] + (c[1] - m[1]) * hint[1];
    if (sc > score) { score = sc; best = c; }
  }
  return { mid: best, end: [a[0] + Math.cos(base) * d, a[1] + Math.sin(base) * d] };
}

const lerp = (a, b, u) => a + (b - a) * u;
export function lerpPose(a, b, u) {
  const o = {};
  for (const k of Object.keys(a)) {
    o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => lerp(v, b[k][i], u)) : lerp(a[k], b[k], u);
  }
  return o;
}

const DEF = { kh: [1, -0.2], kh2: [1, -0.2], eh: [-0.3, 1], eh2: [-0.3, 1], hd: 0, ft: 20 };
export function skeleton(P) {
  P = { ...DEF, ...P };
  const hand2 = P.hand2 || [P.hand[0] - 6, P.hand[1] - 3];
  const foot2 = P.foot2 || [P.foot[0] + 8, P.foot[1]];
  const pel = P.pel, td = dir(P.torso), sh = add(pel, td, SEG.T);
  const head = add(add(sh, td, 9), dir(P.torso + P.hd), 12);
  const leg = (f, h) => { const r = ik(pel, f, SEG.TH, SEG.SH, h); return { knee: r.mid, ankle: r.end }; };
  const arm = (t, h) => { const r = ik(sh, t, SEG.UA, SEG.FA, h); return { elbow: r.mid, hand: r.end }; };
  return { pel, sh, head, td, torso: P.torso, ft: P.ft, near: { ...leg(P.foot, P.kh), ...arm(P.hand, P.eh) }, far: { ...leg(foot2, P.kh2), ...arm(hand2, P.eh2) } };
}

const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / R;
const f1 = (n) => n.toFixed(1);

function bone(a, b, w, fill, edge) {
  return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${edge}" stroke-width="${w + 2}" stroke-linecap="round"/>` +
    `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"/>`;
}
function foot(ankle, ft, fill, edge) {
  const toe = add(ankle, dir(ft), 15);
  return bone(ankle, toe, 6, fill, edge);
}

function segs(s) {
  const n = s.near;
  return {
    T: { a: s.pel, b: s.sh }, UA: { a: s.sh, b: n.elbow }, FA: { a: n.elbow, b: n.hand },
    TH: { a: s.pel, b: n.knee }, SH: { a: n.knee, b: n.ankle },
  };
}

function overlays(s, hi, c) {
  const S = segs(s);
  let out = '';
  for (const [id, level] of hi) {
    for (const [sg, t0, t1, side, off, w] of MUSCLE[id] || []) {
      const { a, b } = S[sg];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const an = ang(a, b);
      const mid = (t0 + t1) / 2;
      let cx = a[0] + (b[0] - a[0]) * mid, cy = a[1] + (b[1] - a[1]) * mid;
      if (side !== 'c') {
        const nd = dir(an + (side === 'f' ? FRONT[sg] : -FRONT[sg]));
        cx += nd[0] * off * HW[sg]; cy += nd[1] * off * HW[sg];
      }
      const col = level === 1 ? '#ff3b30' : '#ff9f0a';
      const op = level === 1 ? 0.55 + 0.45 * c : 0.4 + 0.4 * c;
      out += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1((t1 - t0) * len / 2 * 1.1)}" ry="${f1(w * 1.25)}" transform="rotate(${f1(an)} ${f1(cx)} ${f1(cy)})" fill="${col}" opacity="${op.toFixed(2)}"${level === 1 ? ' filter="url(#glow)"' : ''}/>`;
    }
  }
  return out;
}

const EDGE = '#4b5663', SKIN = '#c9d1d9', FAR = '#8d98a5', TORSO = '#d3dae1';

function props(an, s) {
  let o = `<line x1="-2000" y1="236" x2="2000" y2="236" stroke="#3a4655" stroke-width="2"/>`;
  for (const p of an.props || []) {
    if (p.r) o += `<rect x="${p.r[0]}" y="${p.r[1]}" width="${p.r[2]}" height="${p.r[3]}" rx="3" fill="#2d3846" stroke="#566476" stroke-width="1.5"/>`;
    if (p.l) o += `<line x1="${p.l[0]}" y1="${p.l[1]}" x2="${p.l[2]}" y2="${p.l[3]}" stroke="#566476" stroke-width="${p.l[4] || 3}" stroke-linecap="round"/>`;
  }
  return o;
}
function held(an, s) {
  const n = s.near, f = s.far;
  const w = (p, r, c) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${c}" stroke="#111820" stroke-width="2"/>`;
  let o = '';
  if (an.band) {
    const a = an.band === 'hands' ? f.hand : an.band === 'foot' ? [160, 235] : an.band;
    o += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(n.hand[0])}" y2="${f1(n.hand[1])}" stroke="#ffd60a" stroke-width="3" stroke-linecap="round"/>`;
  }
  const h = an.held;
  if (h === 'db2') o += w(f.hand, 7, '#56606c') + w(n.hand, 7.5, '#6b7683');
  else if (h === 'db1') o += w(n.hand, 8, '#6b7683');
  else if (h === 'bar') o += w(n.hand, 6, '#7d8793');
  else if (h === 'wheel') o += w([n.hand[0], 227], 9, '#6b7683');
  return o;
}

// c = 0..1 effort (0 = start pose, 1 = working pose).
export function frameSVG(key, c) {
  const an = ANIMS[key];
  if (!an) return '';
  const P = lerpPose(an.poses[0], an.poses[1], c);
  const s = skeleton(P);
  const hi = [...(an.p || []).map((m) => [m, 1]), ...(an.s || []).map((m) => [m, 2])];
  const t = s.td, nrm = [-t[1], t[0]];
  const w1 = 16, w2 = 19;
  const q = [add(s.pel, nrm, w1), add(s.sh, nrm, w2), add(s.sh, nrm, -w2), add(s.pel, nrm, -w1)].map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
  const n = s.near, f = s.far;
  const neck = bone(s.sh, add(s.sh, t, 10), 11, SKIN, EDGE);
  return props(an, s) +
    bone(s.pel, f.knee, 19, FAR, EDGE) + bone(f.knee, f.ankle, 14, FAR, EDGE) + foot(f.ankle, s.ft, FAR, EDGE) +
    bone(s.sh, f.elbow, 13, FAR, EDGE) + bone(f.elbow, f.hand, 10.5, FAR, EDGE) +
    `<polygon points="${q}" fill="${TORSO}" stroke="${EDGE}" stroke-width="2" stroke-linejoin="round"/>` +
    bone(s.pel, n.knee, 20, SKIN, EDGE) + bone(n.knee, n.ankle, 15, SKIN, EDGE) + foot(n.ankle, s.ft, SKIN, EDGE) +
    neck + `<circle cx="${f1(s.head[0])}" cy="${f1(s.head[1])}" r="13" fill="${SKIN}" stroke="${EDGE}" stroke-width="2"/>` +
    bone(s.sh, n.elbow, 13, SKIN, EDGE) + bone(n.elbow, n.hand, 10.5, SKIN, EDGE) +
    `<circle cx="${f1(n.hand[0])}" cy="${f1(n.hand[1])}" r="5.4" fill="${SKIN}" stroke="${EDGE}" stroke-width="1.5"/>` +
    overlays(s, hi, c) + held(an, s);
}

// Bounding box of both poses + props, as a padded square viewBox so the figure fills the stage.
export function viewBox(key) {
  const an = ANIMS[key]; if (!an) return '0 0 320 276';
  const pts = [[0, 240]];
  for (const P of an.poses) {
    const s = skeleton(P);
    for (const o of [s.near, s.far]) pts.push(o.knee, o.ankle, o.elbow, o.hand);
    pts.push(s.pel, s.sh, s.head);
  }
  for (const p of an.props || []) {
    if (p.r) pts.push([p.r[0], p.r[1]], [p.r[0] + p.r[2], p.r[1] + p.r[3]]);
    if (p.l) pts.push([p.l[0], p.l[1]], [p.l[2], p.l[3]]);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - 26, x1 = Math.max(...xs) + 26, y0 = Math.min(...ys) - 26, y1 = Math.max(...ys) + 14;
  const side = Math.max(x1 - x0, y1 - y0, 200);
  return `${f1((x0 + x1) / 2 - side / 2)} ${f1((y0 + y1) / 2 - side / 2)} ${f1(side)} ${f1(side)}`;
}

const DEFS = `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>`;
export const svgWrap = (inner, vb = '0 0 320 276') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img">${DEFS}<rect x="-2000" y="-2000" width="4000" height="4000" fill="#18202a"/><g>${inner}</g></svg>`;

export const legend = (key) => {
  const a = ANIMS[key]; if (!a) return '';
  const chip = (m, cls) => `<span class="mchip ${cls}">${MUSCLE_NAME[m] || m}</span>`;
  return (a.p || []).map((m) => chip(m, 'p1')).join('') + (a.s || []).map((m) => chip(m, 'p2')).join('');
};

// Looping player: hold, ease to peak, hold, ease back.
export function mount(el) {
  el.innerHTML = svgWrap('');
  const g = el.querySelector('g');
  let key = null, paused = false, speed = 1, t0 = performance.now(), phase = 0, raf = 0;
  const cycle = 3200;
  const draw = (c) => { g.innerHTML = frameSVG(key, c); };
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  function tick(now) {
    if (key && !paused) {
      phase = (phase + (now - t0) * speed / cycle) % 1;
      const x = phase;
      const c = x < 0.15 ? 0 : x < 0.5 ? ease((x - 0.15) / 0.35) : x < 0.65 ? 1 : ease(1 - (x - 0.65) / 0.35);
      draw(c);
    }
    t0 = now;
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return {
    set(k) { key = k; phase = 0; el.querySelector('svg').setAttribute('viewBox', viewBox(k)); draw(0); },
    togglePause() { paused = !paused; return paused; },
    setSpeed(x) { speed = x; },
    stop() { cancelAnimationFrame(raf); },
  };
}
