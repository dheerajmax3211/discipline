// The day, as data. One source of truth for the app AND the printable master sheet.
// Weekday numbers follow JS: 0 = Sunday … 6 = Saturday.

export const START = '2026-11-17'; // Day 1. Change this if you start on another day.
export const WEEKS = 12;
export const DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Which workout session runs on which weekday (see SESSIONS in exdb.js).
export const WORKOUT_BY_WEEKDAY = ['G', 'A', 'B', 'C', 'D', 'E', 'F'];

export function weekNumber(date) {
  const ms = new Date(date + 'T12:00:00') - new Date(START + 'T12:00:00');
  return Math.max(1, Math.floor(ms / (7 * 86400000)) + 1);
}
export const phaseIndex = (date) => { const w = weekNumber(date); return w <= 4 ? 0 : w <= 8 ? 1 : 2; };

// ── Product names exactly as on your shelf ─────────────────────────────
export const P = {
  keto: 'Ketoconazole 2% shampoo (Sipla)',
  sel: 'Selenium sulfide 1% 2-in-1 shampoo',
  cond: 'Dove Hairfall Rescue conditioner',
  minox: 'Man Matters Minoxidil 5%',
  wash: 'Dot & Key barrier-repair face wash',
  moist: 'Dot & Key ceramide moisturiser',
  spf: 'Minimalist SPF 50',
  hyphen: 'Hyphen Double Shot Radiance serum',
  aha: 'Wishcare AHA + BHA body lotion',
  derma: 'Vaseline Derma Care Advanced Repair lotion',
  spfBody: 'Vaseline Healthy Bright SPF 30 lotion',
  bodywash: 'Dove body wash',
  jelly: 'Vaseline petroleum jelly',
};
// Not on your shelf yet — see the buy list on the print sheet.
export const BUY = {
  ada: 'Adapalene 0.1% gel',
  sa: 'Salicylic acid 2% serum',
};

// ── Per-weekday variations ─────────────────────────────────────────────
// Hair wash: Mon/Thu ketoconazole, Wed/Sat selenium, other days rinse only.
export const HAIR = ['rinse', 'keto', 'rinse', 'sel', 'keto', 'rinse', 'sel'];
export const HAIR_TEXT = {
  keto: `${P.keto}: wet hair, work into a good lather on the scalp, leave 5 minutes, rinse well. Then ${P.cond} on mid-lengths and ends only (not scalp, not forehead), 1 minute, rinse.`,
  sel: `${P.sel}: 5–10 ml on the wet scalp, massage, leave 3–4 minutes, rinse thoroughly. It is a 2-in-1, so no conditioner.`,
  rinse: 'Rinse only: lukewarm water and 1 minute of fingertip scalp massage. No shampoo today.',
};
export const HAIR_SHORT = { keto: 'Ketoconazole', sel: 'Selenium', rinse: 'Rinse only' };

// Night face active. Never two actives in one night.
export const NIGHT = [
  { k: 'rest',  name: 'Rest night — moisturiser only', how: 'Nothing but moisturiser. Skin repairs on rest nights.' },
  { k: 'sa',    name: `${BUY.sa}`, how: 'Thin layer on forehead, nose, chin and bumpy cheeks. Avoid eyes and lips.' },
  { k: 'ada',   name: `${BUY.ada}`, how: 'One pea-sized amount for the whole face. Dot on forehead, cheeks, chin and spread thin. Avoid eyes, lips, nostril corners.' },
  { k: 'hy',    name: `${P.hyphen}`, how: 'Shake until the two layers are mixed. 4–5 drops on face and neck, massage until absorbed.' },
  { k: 'ada',   name: `${BUY.ada}`, how: 'One pea-sized amount for the whole face. Dot on forehead, cheeks, chin and spread thin. Avoid eyes, lips, nostril corners.' },
  { k: 'sa',    name: `${BUY.sa}`, how: 'Thin layer on forehead, nose, chin and bumpy cheeks. Avoid eyes and lips.' },
  { k: 'hy',    name: `${P.hyphen}`, how: 'Shake until the two layers are mixed. 4–5 drops on face and neck, massage until absorbed.' },
];
export const NIGHT_BY_WEEKDAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Night body lotion. AHA on Mon/Wed/Fri, repair lotion on the other nights.
export const AHA_DAYS = [1, 3, 5];

// ── The day ───────────────────────────────────────────────────────────
// d = weekdays the item exists on (omit = every day). `steps` may be a function
// of (weekday, weekNum) when the text changes day to day.
const ALL = undefined;
const MF = [1, 2, 3, 4, 5];
const MS = [1, 2, 3, 4, 5, 6];

export const SCHEDULE = [
  { id: 'wake', t: '05:30', dur: 5, label: 'Wake up',
    steps: (wd) => [
      'Drink 400 ml of water. Brush teeth.',
      'Splash cold water on the face for 30 seconds — this helps morning puffiness.',
      wd === 0 ? 'SUNDAY: weigh yourself now, after the toilet and before water, on the same scale every week. Write it in the day note.' : 'Phone charges outside the bedroom.',
    ] },
  { id: 'face_am', t: '05:35', dur: 8, label: 'Face before the walk',
    steps: [
      'Rinse the face with plain water. No cleanser now. Pat dry.',
      `${P.moist}: 2 pumps / a coin-sized amount over face and neck.`,
      `${P.spf}: two finger-lengths over face, ears, neck and the back of the neck. Wait 2 minutes.`,
    ] },
  { id: 'dress', t: '05:45', dur: 10, label: 'Dress for the walk',
    steps: ['Walking clothes and shoes. Water bottle in hand.'] },
  { id: 'walk', t: '06:00', dur: 45, label: 'Walk with Mom',
    steps: ['45 minutes. Easy pace for the first 30, brisk for the last 10–15.', 'Nose breathing, shoulders back, phone in the pocket.'] },
  { id: 'pre', t: '06:45', dur: 5, label: 'Pre-workout fuel',
    steps: ['1 banana + 4–5 almonds + 250 ml water.', 'Black coffee or tea is fine if you want it. No sugar.'] },
  { id: 'warm', t: '06:50', dur: 5, label: 'Warm-up',
    steps: [
      '20 arm circles each way, 15 band pull-aparts, 10 bodyweight squats, 10 hip hinges.',
      'Then do 1 light set of the first exercise (about half the weight × 10).',
    ], d: [1, 2, 3, 4, 5, 6] },
  { id: 'workout', t: '06:55', dur: 55, label: 'Workout', session: 'TODAY', steps: [] },
  { id: 'bath', t: '07:55', dur: 15, label: 'Bath + hair wash',
    steps: (wd) => [
      `HAIR (${HAIR_SHORT[HAIR[wd]]}): ${HAIR_TEXT[HAIR[wd]]}`,
      `BODY: ${P.bodywash} with your hands. Skip the loofah and scrubbing: friction is what darkens underarms, neck and thighs.`,
      `FACE (last, so no hair product sits on the forehead): ${P.wash}, 30–40 seconds, lukewarm water.`,
      'Towel-dry the body to about 80% dry. Pat the scalp but do not rub.',
    ] },
  { id: 'body_am', t: '08:10', dur: 5, label: 'Body lotion with sunscreen',
    steps: [
      `On damp skin: ${P.spfBody} on neck, back of neck, arms, hands, and any area that will not be covered. This is also your lightening lotion.`,
      'Do not put it on the groin or in the underarms.',
    ] },
  { id: 'face_am2', t: '08:15', dur: 5, label: 'Face — morning',
    steps: [
      `${P.moist}: 2 pumps, face and neck. Wait 2 minutes.`,
      `${P.spf}: two finger-lengths over face, ears and neck. It must be on before you step out at 09:15.`,
    ] },
  { id: 'minox1', t: '08:25', dur: 5, label: 'Minoxidil — morning',
    steps: [
      'The scalp must be completely dry (at least 15 minutes after the bath).',
      `${P.minox}: 1 ml on the thinning areas, part the hair in sections, spread with fingertips.`,
      'Keep it off the forehead and face. Wipe any drips with tissue. Wash your hands. Do not wash or wet the scalp for 4 hours.',
    ] },
  { id: 'groom', t: '08:30', dur: 10, label: 'Dress + grooming',
    steps: ['Dress. Comb the hair with a wide-tooth comb (no pulling).', 'Beard: do not shave the patchy cheeks. Trim only the neckline, and do it at night, not on the day you use the AHA lotion.'] },
  { id: 'bfast', t: '08:45', dur: 30, label: 'Breakfast',
    steps: ['30–40 g of protein: eggs, paneer, tofu, curd or dal, plus a carb (oats, poha, idli, dosa, bread) and a fruit.', '1 glass of milk or curd. Keep the salt low: it is the biggest cause of morning face puffiness.'] },
  { id: 'drop', t: '09:15', dur: 30, label: 'Drop Mom at the office', d: MS,
    steps: ['Back by 09:45.'] },
  { id: 'work1', t: '09:45', dur: 105, label: 'Work block 1', d: MF,
    steps: ['Water bottle (750 ml) on the desk. Finish it by lunch.', 'Stand up and move for 2 minutes every 50 minutes.'] },
  { id: 'posture', t: '11:30', dur: 10, label: 'Posture + neck break', session: 'POSTURE',
    steps: ['5 minutes: band pull-aparts, band external rotations, chest stretch, neck isometrics.', 'Chin slightly tucked, ears over shoulders, tongue resting on the roof of the mouth.'] },
  { id: 'lunch', t: '13:00', dur: 30, label: 'Lunch', d: MS,
    steps: ['Half the plate vegetables, a quarter protein (30–40 g), a quarter rice or roti.', 'Walk for 10 minutes afterwards: it flattens the blood-sugar spike.'] },
  { id: 'work2', t: '13:40', dur: 200, label: 'Work block 2', d: MF,
    steps: ['Stand up every 50 minutes. Keep drinking water: 3 litres a day in total.'] },
  { id: 'snack', t: '16:30', dur: 10, label: 'Snack',
    steps: ['Protein + fruit: curd or milk, a handful of peanuts, a banana, or a boiled egg.'] },
  { id: 'evening', t: '17:15', dur: 45, label: 'Evening: pickleball or finisher', d: MS, session: 'FINISH',
    steps: (wd) => [
      wd === 6 ? 'Saturday: pickleball or nothing. No workout after 19:00.' : 'Either play pickleball (45–60 min) or do the 25-minute finisher. Not both.',
      'On a finisher day: lateral raises, hammer curls, kickbacks and abs.',
    ] },
  { id: 'change', t: '18:10', dur: 15, label: 'Rinse + change', d: MS,
    steps: ['Rinse off the sweat, face included. No sunscreen: the sun is gone.', 'Clean, dry T-shirt.'] },
  { id: 'pickup', t: '18:30', dur: 60, label: 'Go pick up Mom', d: MS,
    steps: (wd) => [wd === 6 ? 'Collect Mom at 18:45. Then movie night.' : 'Leave at 18:30 to reach her at 18:45.'] },
  { id: 'lunch_out', t: '13:30', dur: 90, label: 'Lunch out with Mom', d: [0],
    steps: ['A quiet lunch or a movie together. It is Sunday: this is part of the plan.', 'Order protein first (dal, paneer, chicken or eggs), then rice or roti.'] },
  { id: 'friends', t: '17:30', dur: 150, label: 'Out with friends', d: [0],
    steps: ['No workout. Walk to wherever you can. Keep the food reasonable and sleep on time.'] },
  { id: 'movie', t: '19:15', dur: 150, label: 'Movie night with Mom', d: [6],
    steps: ['No workout after 19:00. Dinner can be with the film.'] },
  { id: 'dinner', t: '20:00', dur: 45, label: 'Dinner',
    steps: ['Protein 30–40 g + vegetables + carb. Finish by 20:45.', 'After 21:00 only water. If you are hungry: warm milk or curd and a banana.'] },
  { id: 'face_pm', t: '21:30', dur: 10, label: 'Face — night',
    steps: (wd, wk) => {
      let n = NIGHT[wd];
      if (wk <= 2 && wd === 2) n = NIGHT[3]; // adapalene only on Thursday for weeks 1–2
      return [
        `${P.wash}: 30–40 seconds, lukewarm. Pat the face dry.`,
        'WAIT 5–10 MINUTES with a dry face. This is what prevents irritation.',
        `TONIGHT: ${n.name}. ${n.how}`,
        'Wait 5 minutes, then moisturiser (Dot & Key) all over, neck included.',
        n.k === 'ada' || n.k === 'sa' ? `If you do not own ${n.name} yet, skip it and use moisturiser only.` : '',
      ].filter(Boolean);
    } },
  { id: 'body_pm', t: '21:45', dur: 5, label: 'Body — night',
    steps: (wd) => AHA_DAYS.includes(wd) ? [
      `${P.aha} (AHA night): thin layer on the sides and back of the neck, lower back, buttocks, outer thighs and upper arms.`,
      'Underarms and inner thighs only after week 2 and after a patch test; stop if it stings. Never on the groin, shaved or broken skin.',
      `Then ${P.derma} on the remaining dry skin.`,
    ] : [
      `${P.derma}: all over the body, especially on stretch marks.`,
      `${P.jelly}: a thin film on elbows, knees, heels and the stretch marks. Barrier repair only, not a lightener.`,
      'No AHA tonight: skin needs rest days.',
    ] },
  { id: 'minox2', t: '21:50', dur: 5, label: 'Minoxidil — night',
    steps: [
      'Scalp dry (it is: you have not washed it since morning).',
      `${P.minox}: 1 ml, same method. Wash your hands, keep it off the face.`,
    ] },
  { id: 'phone', t: '21:55', dur: 5, label: 'Phone away + alarm',
    steps: ['Alarm 05:30. Charger outside the room. Room dark and cool.'] },
  { id: 'sleep', t: '22:00', dur: 0, label: 'Lights out',
    steps: ['7.5 hours of sleep. Hair, skin, muscle and puffiness all depend on it.'] },
];

export const SESSION_FOR_DAY = (date) => WORKOUT_BY_WEEKDAY[new Date(date + 'T12:00:00').getDay()];

// Items for a date, with all per-day text resolved. Used by the app and the print sheet.
export function itemsFor(date, sessions) {
  const wd = new Date(date + 'T12:00:00').getDay();
  const wk = weekNumber(date);
  const key = WORKOUT_BY_WEEKDAY[wd];
  return SCHEDULE.filter((s) => !s.d || s.d.includes(wd))
    .map((s) => {
      let steps = typeof s.steps === 'function' ? s.steps(wd, wk) : s.steps.slice();
      let label = s.label, session = s.session, dur = s.dur;
      if (s.id === 'workout') {
        const sess = sessions[key];
        label = `Workout ${key}: ${sess.name}`;
        session = key;
        steps = [
          `${sess.sub}. Rest times and sets are in the list on the right.`,
          wd === 0 ? 'Light 30-minute session. Finish at 07:25.' : 'Full session: 50–55 minutes. Phone on silent.',
        ];
        if (wd === 0) dur = 30;
      }
      return { id: s.id, planned: s.t, dur, label, steps, session };
    })
    .sort((a, b) => a.planned.localeCompare(b.planned));
}
