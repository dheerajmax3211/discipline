import { itemsFor, WORKOUT_BY_WEEKDAY, DAYNAMES, weekNumber, phaseIndex, WEEKS } from './schedule.js';
import { SESSIONS, WEEK, PHASES, resolve } from './exdb.js';
import { legend } from './figure.js';
import { mount } from './video.js';

let fig = null;   // animated figure player, created on first exercise

const $ = (id) => document.getElementById(id);
const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const nowMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const weekday = (ds) => new Date(ds + 'T12:00:00').getDay();

const api = {
  async get(path) { const r = await fetch(path); return r.json(); },
  async post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return r.json();
  },
};

let DATE = todayStr();
let state = { day: null, items: [] };
let curExKey = null;
let curSessKey = null;
let lastFocusId = null;
let curGroup = [];      // resolved exercises (with sets for the current phase)
let curGroupName = '';
let viewOffset = 0; // 0 = today, 1 = tomorrow, -1 = yesterday
let speedIdx = 0;
const SPEEDS = [1, 0.5, 2];   // multiplier on the photo crossfade

// ---------------------------------------------------------------- schedule

const buildItems = (date) => itemsFor(date, SESSIONS);

// ---------------------------------------------------------------- rendering

function renderList() {
  const nm = nowMin();
  const items = state.items;
  const ul = $('list');
  ul.textContent = '';

  for (const it of items) {
    const li = document.createElement('li');
    const p = toMin(it.planned);
    const isDone = it.status !== 'pending';
    if (it.status === 'late') li.classList.add('islate');
    if (isDone) li.classList.add('isdone');
    if (!isDone && p < nm) li.classList.add('past');

    // current item = first unchecked whose planned time has passed or is within 20 min
    const firstOpen = items.find((x) => x.status === 'pending');
    if (firstOpen && firstOpen.item_id === it.item_id && !isDone) li.classList.add('cur');

    const t = document.createElement('div');
    t.className = 't';
    t.textContent = it.planned;

    const main = document.createElement('div');
    main.className = 'li-main';
    const lab = document.createElement('div');
    lab.className = 'li-label';
    lab.textContent = it.label;
    main.appendChild(lab);
    if (it.steps && it.steps.length) {
      const sb = document.createElement('ol');
      sb.className = 'li-steps';
      for (const st of it.steps) { const l = document.createElement('li'); l.textContent = st; sb.appendChild(l); }
      main.appendChild(sb);
    }

    const meta = document.createElement('div');
    meta.className = 'li-meta';
    if (it.status === 'late') {
      const b = document.createElement('span');
      b.className = 'badge late';
      b.textContent = `late ${it.minutes_late} min`;
      meta.appendChild(b);
    } else if (it.status === 'done') {
      const b = document.createElement('span');
      b.className = 'badge done';
      b.textContent = `done ${it.done_at}`;
      meta.appendChild(b);
    }
    if (it.note) {
      const b = document.createElement('span');
      b.className = 'badge note';
      b.textContent = 'note';
      meta.appendChild(b);
    }
    if (meta.children.length) main.appendChild(meta);

    if (it.note) {
      const n = document.createElement('div');
      n.className = 'li-note';
      n.textContent = it.note;
      main.appendChild(n);
    }

    const act = document.createElement('div');
    act.className = 'li-act';

    const ck = document.createElement('button');
    ck.className = 'ck' + (it.status === 'done' ? ' on' : it.status === 'late' ? ' lon' : '');
    ck.textContent = '✓';
    ck.title = it.status === 'pending' ? 'Mark done (records lateness automatically)' : 'Undo';
    ck.onclick = () => toggle(it, it.status === 'pending');

    const nb = document.createElement('button');
    nb.className = 'nb';
    nb.textContent = '✎';
    nb.title = 'Add a note';
    nb.onclick = () => {
      const row = li.nextElementSibling;
      row.classList.toggle('open');
      if (row.classList.contains('open')) row.querySelector('textarea').focus();
    };

    act.append(ck, nb);
    li.append(t, main, act);

    const noteRow = document.createElement('div');
    noteRow.className = 'note-row';
    const ta = document.createElement('textarea');
    ta.rows = 2;
    ta.placeholder = 'Note on this task…';
    ta.value = it.note || '';
    let timer;
    ta.oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await api.post('/api/note', { date: DATE, item_id: it.item_id, note: ta.value });
        it.note = ta.value;
      }, 500);
    };
    noteRow.appendChild(ta);

    ul.append(li, noteRow);
  }

  const total = items.length;
  const done = items.filter((x) => x.status !== 'pending').length;
  const late = items.filter((x) => x.status === 'late').length;
  $('progress').firstElementChild.style.width = `${(done / Math.max(total, 1)) * 100}%`;
  $('progressText').textContent = `${done} / ${total}` + (late ? ` · ${late} late` : '');

  updateNow(items);
}

function updateNow(items) {
  const nm = nowMin();
  const isToday = DATE === todayStr();
  const open = items.filter((x) => x.status === 'pending');

  if (!open.length) {
    $('nowtitle').textContent = 'Day complete';
    $('nowsub').textContent = 'Everything checked off.';
    $('nowtime').textContent = '';
    $('donebtn').disabled = true;
    return;
  }

  // The current slot is the last one whose planned time has passed. Anything
  // earlier that is still open is "missed", not the thing to do right now.
  let current = null;
  for (const it of open) {
    if (toMin(it.planned) <= nm) current = it;
  }
  const next = open.find((x) => toMin(x.planned) > nm);
  const earlier = open.filter((x) => current && toMin(x.planned) < toMin(current.planned));

  const focus = current || next || open[0];
  if (isToday && viewOffset === 0 && focus && focus.id !== lastFocusId) {
    lastFocusId = focus.id;
    if (focus.session && focus.session !== curSessKey) setGroup(focus.session);
  }

  if (current) {
    $('nowtitle').textContent = current.label;
    $('nowsub').textContent = (current.steps || []).join('\n');
    const late = nm - toMin(current.planned);
    let txt = late <= 2 ? 'due now' : `${late} min past ${current.planned}`;
    if (earlier.length) txt += ` · ${earlier.length} earlier item${earlier.length > 1 ? 's' : ''} missed`;
    if (next) txt += ` · next ${next.label} at ${next.planned}`;
    $('nowtime').textContent = isToday ? txt : current.planned;
    $('donebtn').disabled = false;
    $('donebtn').onclick = () => toggle(current, true);
  } else {
    const n = next || open[0];
    $('nowtitle').textContent = n.label;
    $('nowsub').textContent = (n.steps || []).join('\n');
    const mins = toMin(n.planned) - nm;
    $('nowtime').textContent = isToday
      ? mins <= 0 ? 'due now' : `in ${mins} min · ${n.planned}`
      : n.planned;
    $('donebtn').disabled = false;
    $('donebtn').onclick = () => toggle(n, true);
  }
}

async function toggle(item, done) {
  const wasPending = item.status === 'pending';
  await api.post('/api/checkin', { date: DATE, item_id: item.item_id, done });
  await loadDay();

  if (!done || !wasPending) return;

  // Ticking something should move the day forward, not leave the same view up.
  if (item.id === 'workout' || item.item_id === 'workout') {
    // Finished the session: jump to the first exercise still to do.
    advanceExercise();
  }
}

// Move to the next exercise in the current session, wrapping at the end.
function advanceExercise() {
  if (!curGroup.length) return;
  const i = curGroup.findIndex((e) => e.key === curExKey);
  const next = (i + 1) % curGroup.length;
  showExercise(curGroup[next], next);
}

// ---------------------------------------------------------------- day load

async function loadDay() {
  const built = buildItems(DATE);
  await api.post(`/api/day/${DATE}/seed`, {
    items: built.map((b) => ({ id: b.id, label: b.label, planned: b.planned })),
  });
  const data = await api.get(`/api/day/${DATE}`);
  const subs = new Map(built.map((b) => [b.id, b]));

  state.day = data.day;
  state.items = data.items
    .filter((row) => subs.has(row.item_id))
    .map((row) => {
      const b = subs.get(row.item_id);
      return { ...row, label: b.label, steps: b.steps, session: b.session };
    })
    .sort((x, y) => x.planned.localeCompare(y.planned));

  const wd = weekday(DATE);
  $('dateline').textContent =
    `${DAYNAMES[wd]} · ${new Date(DATE + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` +
    (DATE === todayStr() ? ' · today' : '');

  $('dn').value = state.day.day_note || '';
  computeTierState();
  renderList();
  updateSession();
  renderHeatmap();
}

// ---------------------------------------------------------------- animation

// Which week of the 12-week plan we're in, and so which phase (0–2).
let weekNum = 1;
let phase = 0;

function computeTierState() {
  weekNum = weekNumber(todayStr());
  phase = phaseIndex(todayStr());
}

function tierLabel() {
  const p = PHASES[phase];
  return `Week ${Math.min(weekNum, WEEKS)} · ${p.name} (weeks ${p.weeks})`;
}

function sessionKeyForOffset(off) {
  const d = new Date(DATE + 'T12:00:00');
  d.setDate(d.getDate() + off);
  return WORKOUT_BY_WEEKDAY[d.getDay()];
}

function updateSession() {
  if (!curGroup.length) {
    const w = state.items.find((i) => i.id === 'workout');
    setGroup(w && w.session ? w.session : WORKOUT_BY_WEEKDAY[weekday(DATE)]);
  } else {
    renderSessionList();
  }
}

function setGroup(key, startIndex = 0) {
  const sess = SESSIONS[key];
  if (!sess) return;
  curSessKey = key;
  curGroup = sess.items.map((it) => resolve(it, phase));
  curGroupName = sess.name;

  const d = new Date(DATE + 'T12:00:00');
  d.setDate(d.getDate() + viewOffset);
  const dayName = DAYNAMES[d.getDay()];
  const tag =
    viewOffset === 0 ? `${dayName} · today` :
    viewOffset === 1 ? `${dayName} · tomorrow` :
    viewOffset === -1 ? `${dayName} · yesterday` : dayName;

  $('slhead').textContent = `${sess.name} — ${sess.sub || ''} · ${tag}`;

  renderWeekStrip();
  // highlight whichever weekday this session belongs to
  const wIdx = WEEK.findIndex((w) => w.key === key);
  document.querySelectorAll('.wday').forEach((el, i) => {
    el.classList.toggle('on', i === wIdx);
  });

  renderSessionList();
  showExercise(curGroup[startIndex] || null, startIndex);
}

function setDayOffset(off) {
  viewOffset = off;
  setGroup(sessionKeyForOffset(off), 0);
}

function renderWeekStrip() {
  const box = $('weekstrip');
  if (!box) return;
  box.textContent = '';
  const todayIdx = new Date(DATE + 'T12:00:00').getDay();

  WEEK.forEach((w, idx) => {
    const sess = SESSIONS[w.key];
    const d = document.createElement('div');
    d.className = 'wday';
    if (idx === todayIdx) d.classList.add('today');
    if (idx === todayIdx && viewOffset === 0) d.classList.add('on');

    const dn = document.createElement('div'); dn.className = 'wdn'; dn.textContent = w.day.slice(0, 3);
    const dk = document.createElement('div'); dk.className = 'wdk'; dk.textContent = sess.name;
    const ds = document.createElement('div'); ds.className = 'wds'; ds.textContent = sess.sub || '';
    const dc = document.createElement('div'); dc.className = 'wdcount'; dc.textContent = `${sess.items.length} exercises`;

    d.append(dn, dk, ds, dc);
    d.onclick = () => {
      viewOffset = idx - todayIdx;
      setGroup(w.key, 0);
    };
    box.appendChild(d);
  });
}

function renderSessionList() {
  const box = $('slitems');
  box.textContent = '';
  curGroup.forEach((e, i) => {
    const d = document.createElement('div');
    d.className = 'sli' + (e.key === curExKey ? ' on' : '');
    const n = document.createElement('div'); n.className = 'n'; n.textContent = i + 1;
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = e.name;
    const rs = document.createElement('div'); rs.className = 'rs'; rs.textContent = e.setsNow || '';
    d.append(n, nm, rs);
    d.onclick = () => showExercise(e, i);
    box.appendChild(d);
  });
}

// Two real photos (start / end position) crossfaded by CSS.
function showExercise(e, idx = 0) {
  if (!e) return;
  curExKey = e.key;
  $('animname').textContent = e.name;
  $('animcue').textContent = e.cue || '';
  $('animgear').textContent = [e.setsNow, e.gear, e.rest && e.rest !== '—' ? `rest ${e.rest}` : ''].filter(Boolean).join(' · ');
  $('animidx').textContent = `${idx + 1} / ${curGroup.length}`;
  const tl = $('sltier');
  if (tl) tl.textContent = tierLabel();
  renderSessionList();
  loadSets(e.key);

  fig ||= mount($('fig'));
  fig.set(e.key);
  $('exmus').innerHTML = legend(e.key);   // static muscle names from figure.js, no user input
}

async function loadSets(key) {
  const { sets } = await api.get(`/api/sets/${DATE}`);
  const box = $('setlist');
  box.textContent = '';
  sets
    .filter((s) => s.exercise === key)
    .forEach((s) => {
      const d = document.createElement('span');
      d.className = 's';
      d.textContent = `${s.weight ?? '—'} kg × ${s.reps ?? '—'}`;
      box.appendChild(d);
    });
}

// ---------------------------------------------------------------- heatmap

async function renderHeatmap() {
  const { rows } = await api.get('/api/heatmap');
  const map = new Map(rows.map((r) => [r.date, r]));

  const grid = $('heatgrid');
  grid.textContent = '';

  // 53 weeks back from today, starting on the Sunday of that week.
  const end = new Date(todayStr() + 'T12:00:00');
  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  const cells = [];
  const d = new Date(start);
  while (d <= end) {
    cells.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  const tip = document.getElementById('tip') || (() => {
    const t = document.createElement('div');
    t.id = 'tip';
    t.className = 'tip';
    document.body.appendChild(t);
    return t;
  })();

  for (const dt of cells) {
    const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (ds === todayStr()) cell.classList.add('today');

    const r = map.get(ds);
    if (r && r.total > 0) {
      const ratio = r.done / r.total;
      const lvl = ratio >= 1 ? 4 : ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : ratio > 0 ? 1 : 0;
      cell.classList.add(`l${lvl}`);
      if (r.late > 0) cell.classList.add('late');
    }

    cell.onmouseenter = () => {
      const rect = cell.getBoundingClientRect();
      tip.textContent = r
        ? `${ds} · ${r.done}/${r.total} done${r.late ? ` · ${r.late} late` : ''}`
        : `${ds} · no check-ins`;
      tip.classList.add('on');
      tip.style.left = `${rect.left + 8}px`;
      tip.style.top = `${rect.top - 30}px`;
    };
    cell.onmouseleave = () => tip.classList.remove('on');
    grid.appendChild(cell);
  }

  // month labels positioned over the columns
  const months = $('heatmonths');
  months.textContent = '';
  const colW = 16; // 13px cell + 3px gap
  let lastMonth = -1;
  for (let i = 0; i < cells.length; i += 7) {
    const m = cells[i].getMonth();
    if (m !== lastMonth) {
      const s = document.createElement('span');
      s.textContent = cells[i].toLocaleDateString('en-IN', { month: 'short' });
      s.style.left = `${(i / 7) * colW}px`;
      months.appendChild(s);
      lastMonth = m;
    }
  }

  const st = await api.get('/api/stats');
  $('stats').textContent = `${st.days || 0} days · ${st.done || 0} done`;
}

// ---------------------------------------------------------------- clock

function tickClock() {
  const d = new Date();
  $('clock').textContent =
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  // roll over to a new day at midnight
  if (DATE !== todayStr()) {
    DATE = todayStr();
    viewOffset = 0;
    curGroup = [];
    loadDay();
  }
  if (state.items.length) {
    updateNow(state.items);
    const nx = state.items.find((x) => x.status === 'pending');
    const el = $('nextup');
    if (el) el.textContent = nx ? `Next · ${nx.label} ${nx.planned}` : 'All done';
  }
}

// ---------------------------------------------------------------- wire up

function wire() {
  $('startbtn').onclick = async () => {
    await api.post(`/api/day/${DATE}/start`);
    await loadDay();
    $('startbtn').textContent = 'Day started';
    $('startbtn').disabled = true;
  };

  let dnTimer;
  $('dn').oninput = () => {
    clearTimeout(dnTimer);
    dnTimer = setTimeout(async () => {
      await api.post(`/api/day/${DATE}`, { day_note: $('dn').value });
      $('dnsaved').textContent = 'saved';
      setTimeout(() => ($('dnsaved').textContent = ''), 1200);
    }, 600);
  };

  // Day preview: previous / today / next session.
  document.querySelectorAll('.slb').forEach((b) => {
    b.onclick = () => setDayOffset(Number(b.dataset.day));
  });

  $('prev').onclick = () => {
    const i = Math.max(0, curGroup.findIndex((e) => e.key === curExKey) - 1);
    showExercise(curGroup[i], i);
  };
  $('next').onclick = () => {
    const i = Math.min(curGroup.length - 1, curGroup.findIndex((e) => e.key === curExKey) + 1);
    showExercise(curGroup[i], i);
  };

  $('playpause').onclick = () => {
    if (!fig) return;
    $('playpause').textContent = fig.togglePause() ? 'Play' : 'Pause';
  };

  $('speed').onclick = () => {
    speedIdx = (speedIdx + 1) % SPEEDS.length;
    fig?.setSpeed(SPEEDS[speedIdx]);
    $('speed').textContent = `${SPEEDS[speedIdx]}×`;
  };

  $('logset').onclick = () => {
    const b = $('logsetbox');
    b.hidden = !b.hidden;
    if (!b.hidden) $('lsw').focus();
  };

  $('lssave').onclick = async () => {
    const w = parseFloat($('lsw').value);
    const r = parseInt($('lsr').value, 10);
    if (!curExKey) return;
    await api.post('/api/set', {
      date: DATE,
      exercise: curExKey,
      weight: isNaN(w) ? null : w,
      reps: isNaN(r) ? null : r,
    });
    $('lsw').value = '';
    $('lsr').value = '';
    $('logsetbox').hidden = true;
    loadSets(curExKey);
  };

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') $('next').click();
    if (e.key === 'ArrowLeft') $('prev').click();
    if (e.key === ' ') { e.preventDefault(); $('playpause').click(); }
  });
}

// If someone opens index.html directly instead of running the server,
// say so plainly rather than rendering an empty shell.
async function boot() {
  if (location.protocol === 'file:') return notServed();
  try {
    const r = await fetch('/api/stats');
    if (!r.ok) throw new Error('bad');
  } catch {
    return notServed();
  }
  wire();
  await loadDay();
  tickClock();
  setInterval(tickClock, 1000);
}

function notServed() {
  document.body.innerHTML = `
    <div style="max-width:560px;margin:14vh auto;padding:32px;font-family:-apple-system,Helvetica,sans-serif;
                color:#e6edf3;background:#161b22;border:1px solid #2a313c;border-radius:12px;line-height:1.6">
      <div style="color:#3fb950;font-weight:800;letter-spacing:.5px;font-size:13px">DISCIPLINE</div>
      <h1 style="font-size:22px;margin:10px 0 14px">The app needs its local server.</h1>
      <p style="color:#8b949e;margin:0 0 18px">
        Opening this file directly can't save your check-ins. Start it with the launcher instead —
        it opens the browser for you.
      </p>
      <p style="margin:0 0 8px;color:#8b949e;font-size:13px">In Terminal:</p>
      <pre style="background:#0e1116;border:1px solid #2a313c;border-radius:8px;padding:12px;
                  font-size:13px;overflow-x:auto;margin:0 0 18px">cd ~/Documents/essentials/discipline
node server.js</pre>
      <p style="margin:0;font-size:13px;color:#8b949e">
        Then open <span style="color:#3fb950">http://localhost:4747</span> — or just double-click
        <b style="color:#e6edf3">start.command</b>.
      </p>
    </div>`;
}

boot();
