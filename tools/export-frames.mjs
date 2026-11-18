// Dumps per-exercise joint frames (2D side-view solve from public/anims.js) for the Blender renderer.
// usage: node tools/export-frames.mjs > tools/frames.json
import { ANIMS } from '../public/anims.js';
import { skeleton, lerpPose, viewBox } from '../public/figure.js';
const N = 32, ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const out = {};
for (const [key, an] of Object.entries(ANIMS)) {
  const frames = [];
  for (let i = 0; i < N; i++) {
    const x = i / N;
    const c = x < 0.15 ? 0 : x < 0.5 ? ease((x - 0.15) / 0.35) : x < 0.65 ? 1 : ease(1 - (x - 0.65) / 0.35);
    const s = skeleton(lerpPose(an.poses[0], an.poses[1], c));
    frames.push({ pel: s.pel, sh: s.sh, head: s.head, ft: s.ft, near: s.near, far: s.far });
  }
  out[key] = { p: an.p, s: an.s, props: an.props || [], held: an.held || null, band: an.band || null, vb: viewBox(key).split(' ').map(Number), frames };
}
console.log(JSON.stringify(out));
