// Per-exercise animation data: two poses (start -> working), muscles lit, props.
// p = primary muscles (red), s = secondary (amber). Poses are end-effector targets; figure.js solves the joints.
const D = { pel: [160, 118], torso: -90, hand: [166, 126], foot: [160, 230], kh: [1, -0.2], kh2: [1, -0.2], eh: [-0.3, 1], eh2: [-0.3, 1], hd: 0, ft: 0 };
const norm = (p) => {
  const o = { ...D, ...p };
  if (!p.hand2) o.hand2 = [o.hand[0] - 6, o.hand[1] - 3];
  if (!p.foot2) o.foot2 = [o.foot[0] + 8, o.foot[1]];
  return o;
};
export const ANIMS = {};
const X = (keys, p, s, base, a, b, extra = {}) => {
  for (const key of [].concat(keys)) ANIMS[key] = { p, s, ...extra, poses: [norm({ ...base, ...a }), norm({ ...base, ...b })] };
};
// plank-style body line from a fixed foot to a shoulder point
const plank = (foot, sh) => {
  const dx = sh[0] - foot[0], dy = sh[1] - foot[1], d = Math.hypot(dx, dy);
  return { foot, pel: [foot[0] + dx / d * (d - 62), foot[1] + dy / d * (d - 62)], torso: Math.atan2(dy, dx) * 180 / Math.PI, kh: [0, -1], ft: 70 };
};

const BENCH = [{ r: [84, 178, 150, 10] }, { l: [110, 188, 110, 236, 5] }, { l: [210, 188, 210, 236, 5] }];
const INCB = [{ l: [186, 184, 118, 116, 10] }, { l: [180, 190, 180, 236, 5] }, { l: [125, 126, 125, 236, 5] }];
const MAT = [{ r: [40, 234, 240, 4] }];
const SEATP = [{ r: [105, 178, 90, 10] }, { l: [120, 188, 120, 236, 5] }, { l: [180, 188, 180, 236, 5] }];
const BAR = [{ l: [90, 34, 240, 34, 5] }, { l: [96, 34, 96, 236, 4] }, { l: [234, 34, 234, 236, 4] }];
const BOX = [{ r: [190, 200, 70, 36] }];
const LY = { pel: [190, 164], torso: 180, foot: [236, 230], kh: [0, -1] };
const INC = { pel: [185, 166], torso: -135, foot: [236, 230], kh: [0, -1] };
const FL = { pel: [150, 220], torso: 180, foot: [225, 230], kh: [0, -1] };
const SEAT = { pel: [150, 164], foot: [195, 230] };
const HANG = { pel: [168, 166], torso: -90, hand: [170, 34], foot: [150, 222], kh: [1, 0.2], eh: [-1, 0.6] };
const BEND = { pel: [150, 118], torso: -25, kh: [1, -0.3] };

// ---------- CHEST ----------
X('flat_press', ['chest'], ['triceps', 'delts'], LY, { hand: [132, 138] }, { hand: [128, 94] }, { props: BENCH, held: 'db2' });
X('close_press', ['triceps'], ['chest', 'delts'], LY, { hand: [131, 140] }, { hand: [128, 94] }, { props: BENCH, held: 'bar' });
X('fly', ['chest'], ['delts'], LY, { hand: [78, 158], eh: [0, 1] }, { hand: [128, 98], eh: [0, 1] }, { props: BENCH, held: 'db2' });
X('incline_press', ['chest', 'delts'], ['triceps'], INC, { hand: [150, 104], eh: [1, 0.4] }, { hand: [148, 56], eh: [1, 0.4] }, { props: INCB, held: 'db2' });
X('incline_fly', ['chest'], ['delts'], INC, { hand: [100, 112], eh: [0, 1] }, { hand: [146, 62], eh: [0, 1] }, { props: INCB, held: 'db2' });
X('pullover', ['lats'], ['chest', 'triceps'], LY, { hand: [128, 94] }, { hand: [82, 172] }, { props: BENCH, held: 'db1' });
X('bent_pullover', ['lats'], ['chest', 'triceps'], LY, { hand: [132, 112], eh: [0, -1] }, { hand: [92, 150], eh: [0, -1] }, { props: BENCH, held: 'db1' });
X('chest_stretch', ['chest'], ['delts'], {}, { hand: [166, 126] }, { hand: [100, 92], hand2: [96, 86] });

// ---------- PUSH-UPS & DIPS ----------
const PUh = { hand: [216, 230], eh: [-1, -0.3] };
X(['pushup'], ['chest'], ['triceps', 'delts', 'abs'], {}, { ...plank([50, 218], [215, 160]), ...PUh }, { ...plank([50, 218], [225, 206]), ...PUh }, { props: [] });
X('cg_pushup', ['triceps'], ['chest', 'delts'], {}, { ...plank([50, 218], [215, 160]), ...PUh }, { ...plank([50, 218], [225, 206]), ...PUh });
X('pushup_feet_up', ['chest', 'delts'], ['triceps', 'abs'], {}, { ...plank([42, 163], [215, 162]), ...PUh }, { ...plank([42, 163], [222, 204]), ...PUh }, { props: [{ r: [18, 176, 50, 60] }] });
X('incline_pushup', ['chest'], ['triceps', 'delts'], {}, { ...plank([70, 218], [212, 110]), hand: [216, 176], eh: [-1, -0.3] }, { ...plank([70, 218], [224, 150]), hand: [216, 176], eh: [-1, -0.3] }, { props: [{ r: [190, 178, 70, 58] }] });
X('bench_dip', ['triceps'], ['chest', 'delts'], {}, { pel: [126, 172], torso: -90, hand: [108, 178], foot: [215, 230], kh: [1, -0.4], eh: [-1, 0.3] }, { pel: [126, 208], torso: -90, hand: [108, 178], foot: [215, 230], kh: [1, -0.4], eh: [-1, 0.3] }, { props: [{ r: [50, 178, 62, 10] }, { l: [60, 188, 60, 236, 5] }] });

// ---------- SHOULDERS ----------
X('seated_press', ['delts'], ['triceps', 'traps'], SEAT, { hand: [154, 80] }, { hand: [154, 34] }, { props: SEATP, held: 'db2' });
X('arnold', ['delts'], ['triceps', 'traps'], SEAT, { hand: [188, 96], eh: [-0.4, 1] }, { hand: [154, 34] }, { props: SEATP, held: 'db2' });
X('lateral', ['delts'], ['traps'], {}, { hand: [166, 126] }, { hand: [232, 62], eh: [0, 1] }, { held: 'db2' });
X(['rear_raise', 'reverse_fly'], ['rear_delts'], ['traps'], BEND, { hand: [212, 154], eh: [0, 1] }, { hand: [150, 98], eh: [0, 1] }, { held: 'db2' });
X('band_pull_apart', ['rear_delts'], ['traps', 'forearms'], {}, { hand: [232, 58], eh: [0, 1] }, { hand: [182, 62], eh: [-0.6, 1] }, { band: 'hands' });
X('band_rotation', ['abs'], ['delts', 'lats'], {}, { hand: [214, 80], eh: [0, 1] }, { hand: [172, 86], eh: [0, 1] }, { band: [300, 80] });

// ---------- TRICEPS ----------
X('oh_triceps', ['triceps'], ['delts'], {}, { hand: [146, 72], eh: [0, -1] }, { hand: [164, -10], eh: [0, -1] }, { held: 'db1' });
X('skull', ['triceps'], [], LY, { hand: [100, 152], eh: [0.3, -1] }, { hand: [128, 94], eh: [0.3, -1] }, { props: BENCH, held: 'bar' });
X('kickback', ['triceps'], ['rear_delts'], BEND, { hand: [176, 142], eh: [-0.5, -1] }, { hand: [134, 108], eh: [-0.5, -1] }, { held: 'db1' });

// ---------- BACK ----------
X(['pullup', 'chinup'], ['lats'], ['biceps', 'traps'], HANG, { pel: [168, 166] }, { pel: [168, 120], hand: [170, 34], foot: [150, 178] }, { props: BAR });
X('hang', ['forearms', 'lats'], ['traps'], HANG, { pel: [168, 170] }, { pel: [168, 164] }, { props: BAR });
X('db_row', ['lats'], ['biceps', 'rear_delts', 'traps'], BEND, { hand: [212, 154], hand2: [226, 176], eh: [-0.3, 1] }, { hand: [184, 112], hand2: [226, 176], eh: [-1, -0.3] }, { props: [{ r: [200, 176, 60, 10] }, { l: [210, 186, 210, 236, 5] }, { l: [250, 186, 250, 236, 5] }], held: 'db1' });
X('bent_row', ['lats', 'traps'], ['biceps', 'rear_delts', 'lower_back'], { pel: [140, 122], torso: -38, kh: [1, -0.4] }, { hand: [190, 164], eh: [-0.3, 1] }, { hand: [172, 116], eh: [-1, -0.3] }, { held: 'bar' });
X('incline_row', ['lats', 'traps'], ['biceps', 'rear_delts'], { pel: [130, 130], torso: -50, kh: [1, -0.4] }, { hand: [188, 166], eh: [-0.3, 1] }, { hand: [166, 118], eh: [-1, -0.3] }, { held: 'db2', props: [{ l: [120, 150, 190, 90, 8] }, { l: [120, 150, 120, 236, 5] }, { l: [190, 92, 190, 236, 5] }] });

// ---------- BICEPS & FOREARMS ----------
X(['ez_curl', 'rev_curl'], ['biceps'], ['forearms'], {}, { hand: [168, 128] }, { hand: [192, 70], eh: [-0.3, 1] }, { held: 'bar' });
ANIMS.rev_curl.p = ['forearms']; ANIMS.rev_curl.s = ['biceps'];
X('hammer', ['biceps', 'forearms'], [], {}, { hand: [168, 128] }, { hand: [192, 70], eh: [-0.3, 1] }, { held: 'db2' });
X('incline_curl', ['biceps'], ['forearms'], { pel: [185, 166], torso: -125, foot: [236, 230], kh: [0, -1] }, { hand: [152, 180], eh: [-0.3, 1] }, { hand: [178, 118], eh: [0.2, 1] }, { props: INCB, held: 'db2' });
X('conc_curl', ['biceps'], ['forearms'], { pel: [150, 164], torso: -60, foot: [205, 230], kh: [1, -0.3] }, { hand: [196, 176], eh: [0.3, 1] }, { hand: [212, 124], eh: [0.3, 1] }, { props: SEATP, held: 'db1' });
X('wrist_curl', ['forearms'], [], { pel: [150, 164], torso: -62, foot: [215, 230], kh: [1, -0.3] }, { hand: [220, 178], eh: [0, 1] }, { hand: [222, 162], eh: [0, 1] }, { props: SEATP, held: 'bar' });

// ---------- LEGS & GLUTES ----------
const SQB = { pel: [112, 176], torso: -68, foot: [160, 230], kh: [1, -0.1] };
X('goblet', ['quads', 'glutes'], ['hamstrings', 'abs'], {}, { hand: [183, 78], eh: [0, 1] }, { ...SQB, hand: [168, 128], eh: [0, 1] }, { held: 'db1' });
X('squat_bench', ['quads', 'glutes'], ['hamstrings'], {}, { hand: [183, 78], eh: [0, 1] }, { pel: [108, 170], torso: -72, foot: [165, 230], hand: [172, 118], eh: [0, 1] }, { held: 'db1', props: [{ r: [56, 178, 50, 10] }, { l: [66, 188, 66, 236, 5] }] });
X('plie', ['quads', 'glutes'], ['hamstrings'], {}, { hand: [183, 78], eh: [0, 1] }, { pel: [140, 160], torso: -84, foot: [160, 230], hand: [176, 108], eh: [0, 1], kh: [1, 0.2] }, { held: 'db1' });
X('bulgarian', ['quads', 'glutes'], ['hamstrings'], {}, { pel: [170, 118], foot: [195, 230], foot2: [88, 164], kh2: [0, 1], hand: [172, 126] }, { pel: [150, 168], foot: [195, 230], foot2: [88, 164], kh2: [0, 1], hand: [156, 176] }, { props: [{ r: [60, 176, 56, 10] }, { l: [70, 186, 70, 236, 5] }], held: 'db2' });
X('rear_lunge', ['quads', 'glutes'], ['hamstrings', 'calves'], {}, { pel: [172, 118], foot: [185, 230], foot2: [160, 230], hand: [174, 126] }, { pel: [140, 152], foot: [190, 230], foot2: [72, 222], kh2: [0, 1], hand: [142, 160] }, { held: 'db2' });
X('step_up', ['quads', 'glutes'], ['calves', 'hamstrings'], {}, { pel: [165, 122], foot: [215, 198], foot2: [150, 230], hand: [168, 128] }, { pel: [212, 92], foot: [215, 198], foot2: [214, 170], kh2: [1, 0], hand: [216, 100] }, { props: BOX, held: 'db2' });
X(['rdl', 'hip_hinge'], ['hamstrings', 'glutes'], ['lower_back'], {}, { hand: [166, 126] }, { pel: [112, 124], torso: -25, hand: [170, 168], kh: [1, -0.3] }, { held: 'db2' });
ANIMS.hip_hinge.held = null; ANIMS.hip_hinge.poses[1].hand = [150, 112]; ANIMS.hip_hinge.poses[0].hand = [150, 122];
X('bridge', ['glutes'], ['hamstrings', 'abs'], FL, { pel: [200, 220], torso: 180, hand: [215, 226] }, { pel: [184, 176], torso: 135, hand: [200, 228] }, { props: MAT });
X('sl_bridge', ['glutes'], ['hamstrings', 'abs'], FL, { pel: [200, 220], torso: 180, hand: [215, 226], foot2: [250, 170] }, { pel: [184, 176], torso: 135, hand: [200, 228], foot2: [250, 140] }, { props: MAT });
X('kickback_glute', ['glutes'], ['hamstrings', 'lower_back'], { torso: -4, hand: [195, 228], eh: [0, 1] }, { pel: [135, 172], foot: [92, 206], foot2: [50, 226], kh: [1, 0.5], kh2: [0, 1] }, { pel: [135, 172], foot: [40, 152], foot2: [50, 226], kh: [0, 1], kh2: [0, 1] }, { props: MAT });
X('calf', ['calves'], [], { hand: [166, 126] }, { ft: 0 }, { pel: [160, 100], foot: [160, 212], ft: 55 }, { held: 'db2' });
X('sl_calf', ['calves'], [], { hand: [166, 126] }, { foot2: [130, 200], ft: 0 }, { pel: [160, 100], foot: [160, 212], foot2: [130, 200], ft: 55 }, { held: 'db1' });

// ---------- CORE ----------
X('ab_roller', ['abs'], ['lats', 'delts'], { foot: [88, 228], kh: [1, 0.3], hd: 0, ft: 0 }, { pel: [150, 176], torso: -20, hand: [230, 224], eh: [0, 1] }, { pel: [138, 192], torso: -4, hand: [252, 226], eh: [0, 1] }, { held: 'wheel', props: MAT });
X('hanging_raise', ['abs'], ['hip_flexors', 'forearms'], HANG, { foot: [150, 224] }, { foot: [238, 152], kh: [1, -1] }, { props: BAR });
X('reverse_crunch', ['abs'], ['hip_flexors'], FL, { pel: [200, 220], foot: [240, 184], kh: [1, -1], hand: [215, 226] }, { pel: [190, 206], torso: 175, foot: [214, 140], kh: [1, -1], hand: [200, 214] }, { props: MAT });
X('dead_bug', ['abs'], ['hip_flexors'], FL, { pel: [190, 220], hand: [128, 152], hand2: [136, 152], foot: [250, 190], foot2: [250, 190], kh: [1, -1], kh2: [1, -1] }, { pel: [190, 220], hand: [66, 206], hand2: [136, 152], foot: [250, 190], foot2: [300, 224], kh: [1, -1], kh2: [0, -1] }, { props: MAT });
X('plank', ['abs'], ['delts', 'glutes', 'lower_back'], {}, { ...plank([50, 224], [218, 178]), hand: [240, 228], eh: [-1, 0.2] }, { ...plank([50, 224], [218, 172]), hand: [240, 228], eh: [-1, 0.2] }, { props: MAT });
X('side_bridge', ['abs'], ['glutes', 'delts'], {}, { ...plank([50, 224], [218, 182]), pel: [140, 200], hand: [240, 228], eh: [-1, 0.2] }, { ...plank([50, 224], [218, 170]), hand: [240, 228], eh: [-1, 0.2] }, { props: MAT });
X('cross_crunch', ['abs'], ['hip_flexors'], FL, { pel: [200, 220], torso: 180, hand: [132, 206], eh: [0, -1], foot: [225, 182], foot2: [255, 224], kh: [1, -1], kh2: [0, -1] }, { pel: [200, 220], torso: 200, hand: [134, 178], eh: [0, -1], foot: [255, 224], foot2: [225, 182], kh: [0, -1], kh2: [1, -1] }, { props: MAT });
X('flutter', ['abs'], ['hip_flexors', 'quads'], FL, { pel: [150, 220], foot: [260, 202], foot2: [260, 170], hand: [165, 226], kh: [0, -1], kh2: [0, -1] }, { pel: [150, 220], foot: [260, 170], foot2: [260, 202], hand: [165, 226], kh: [0, -1], kh2: [0, -1] }, { props: MAT });
X('russian', ['abs'], ['hip_flexors'], { pel: [150, 220], torso: -115, foot: [215, 180], kh: [1, -1] }, { hand: [188, 168], eh: [0, 1] }, { hand: [152, 178], eh: [0, 1] }, { held: 'db1', props: MAT });
X('climbers', ['abs'], ['hip_flexors', 'delts', 'quads'], {}, { ...plank([50, 222], [215, 168]), hand: [216, 230], eh: [-1, -0.3], foot2: [142, 206] }, { ...plank([50, 222], [215, 168]), foot: [138, 204], hand: [216, 230], eh: [-1, -0.3], foot2: [58, 222] }, { props: MAT });
X('cat', ['lower_back', 'abs'], ['traps'], { torso: -4, pel: [135, 174], foot: [55, 226], hand: [195, 228], kh: [1, 0.5], eh: [0, 1] }, { torso: 6, hd: -25 }, { torso: -14, hd: 45, pel: [135, 168] }, { props: MAT });
X('worlds', ['hip_flexors', 'glutes'], ['hamstrings', 'lats', 'traps'], {}, { pel: [140, 170], torso: -35, foot: [195, 230], foot2: [60, 224], kh2: [0, 1], hand: [206, 224], hand2: [200, 222] }, { pel: [140, 166], torso: -78, foot: [195, 230], foot2: [60, 224], kh2: [0, 1], hand: [196, 58], hand2: [200, 222] }, {});

// ---------- NECK ----------
const NK = { hand: [152, 44], eh: [0, -1] };
X('neck_fb', ['neck'], ['traps'], {}, { ...NK, hd: -10 }, { ...NK, hd: 34 });
X('neck_side', ['neck'], ['traps'], {}, { ...NK, hd: 0 }, { ...NK, hd: 24 });
X('neck_stretch', ['neck'], ['traps'], {}, { ...NK, hd: 0 }, { ...NK, hd: 28 });
