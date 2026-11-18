import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, 'public');
const DB_PATH = join(ROOT, 'discipline.db');
const PORT = process.env.PORT || 4747;

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS days (
    date        TEXT PRIMARY KEY,
    day_note    TEXT NOT NULL DEFAULT '',
    started_at  TEXT,
    energy      INTEGER,
    mood        TEXT,
    weight      REAL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    date         TEXT NOT NULL REFERENCES days(date) ON DELETE CASCADE,
    item_id      TEXT NOT NULL,
    label        TEXT NOT NULL,
    planned      TEXT NOT NULL,
    done_at      TEXT,
    minutes_late INTEGER NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'pending',
    note         TEXT NOT NULL DEFAULT '',
    UNIQUE(date, item_id)
  );

  CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);

  CREATE TABLE IF NOT EXISTS setlogs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    date      TEXT NOT NULL,
    exercise  TEXT NOT NULL,
    weight    REAL,
    reps      INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const json = (res, code, body) => {
  const s = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(s),
    'Cache-Control': 'no-store',
  });
  res.end(s);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => {
      d += c;
      if (d.length > 2e6) reject(new Error('too large'));
    });
    req.on('end', () => {
      try { resolve(d ? JSON.parse(d) : {}); } catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Being a minute or two over isn't a discipline failure — flag it as late only
// past this many minutes, while still recording the true lateness.
const GRACE_MIN = 5;

// --- routes ---------------------------------------------------------------

const routes = {
  'GET /api/day/:date': (params) => {
    const { date } = params;
    let day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    if (!day) {
      db.prepare('INSERT INTO days (date) VALUES (?)').run(date);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    }
    const items = db
      .prepare('SELECT * FROM checkins WHERE date = ? ORDER BY planned ASC')
      .all(date);
    return { day, items };
  },

  'POST /api/day/:date': (params, body) => {
    const { date } = params;
    db.prepare(
      `INSERT INTO days (date, day_note) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET day_note = excluded.day_note`
    ).run(date, body.day_note ?? '');
    return { ok: true };
  },

  'POST /api/day/:date/start': (params) => {
    const { date } = params;
    db.prepare(
      `INSERT INTO days (date, started_at) VALUES (?, datetime('now'))
       ON CONFLICT(date) DO UPDATE SET started_at = COALESCE(days.started_at, datetime('now'))`
    ).run(date);
    return routes['GET /api/day/:date'](params);
  },

  // Seed the day's checklist from the schedule the client computed.
  'POST /api/day/:date/seed': (params, body) => {
    const { date } = params;
    db.prepare('INSERT OR IGNORE INTO days (date) VALUES (?)').run(date);
    const ins = db.prepare(
      `INSERT OR IGNORE INTO checkins (date, item_id, label, planned) VALUES (?,?,?,?)`
    );
    for (const it of body.items || []) {
      ins.run(date, it.id, it.label, it.planned);
    }
    return routes['GET /api/day/:date'](params);
  },

  'POST /api/checkin': (params, body) => {
    const { date, item_id, done, note } = body;
    const row = db
      .prepare('SELECT * FROM checkins WHERE date = ? AND item_id = ?')
      .get(date, item_id);
    if (!row) return { error: 'no such item' };

    if (done) {
      const t = nowHHMM();
      const late = Math.max(0, toMin(t) - toMin(row.planned));
      db.prepare(
        `UPDATE checkins SET done_at = ?, minutes_late = ?, status = ?,
           note = COALESCE(NULLIF(?, ''), note) WHERE date = ? AND item_id = ?`
      ).run(t, late, late > GRACE_MIN ? 'late' : 'done', note ?? '', date, item_id);
    } else {
      db.prepare(
        `UPDATE checkins SET done_at = NULL, minutes_late = 0, status = 'pending'
         WHERE date = ? AND item_id = ?`
      ).run(date, item_id);
    }
    return { ok: true };
  },

  'POST /api/note': (params, body) => {
    const { date, item_id, note } = body;
    db.prepare('UPDATE checkins SET note = ? WHERE date = ? AND item_id = ?').run(
      note,
      date,
      item_id
    );
    return { ok: true };
  },

  'POST /api/set': (params, body) => {
    db.prepare('INSERT INTO setlogs (date, exercise, weight, reps) VALUES (?,?,?,?)').run(
      body.date,
      body.exercise,
      body.weight ?? null,
      body.reps ?? null
    );
    return { ok: true };
  },

  'GET /api/sets/:date': (params) => ({
    sets: db.prepare('SELECT * FROM setlogs WHERE date = ? ORDER BY id').all(params.date),
  }),

  // Heat map: every day with its completion counts.
  'GET /api/heatmap': () => {
    const rows = db
      .prepare(
        `SELECT date,
                COUNT(*)                                     AS total,
                SUM(CASE WHEN status != 'pending' THEN 1 ELSE 0 END) AS done,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END)     AS late
         FROM checkins GROUP BY date ORDER BY date`
      )
      .all();
    const notes = db
      .prepare(`SELECT date, day_note FROM days WHERE day_note != ''`)
      .all();
    return { rows, notes };
  },

  'GET /api/stats': () => {
    const r = db
      .prepare(
        `SELECT COUNT(DISTINCT date) AS days,
                SUM(CASE WHEN status != 'pending' THEN 1 ELSE 0 END) AS done,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late,
                AVG(NULLIF(minutes_late,0)) AS avg_late
         FROM checkins`
      )
      .get();
    return r;
  },
};

// --- static ---------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

async function serveStatic(res, pathname) {
  let p = pathname === '/' ? '/index.html' : pathname;
  if (p.includes('..')) return json(res, 400, { error: 'bad path' });
  const file = join(PUBLIC, p);
  if (!existsSync(file)) return json(res, 404, { error: 'not found' });
  const buf = await readFile(file);
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] || 'application/octet-stream',
    'Content-Length': buf.length,
    'Cache-Control': 'no-cache',
  });
  res.end(buf);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    if (!path.startsWith('/api/')) return serveStatic(res, path);

    const method = req.method;
    let m = null;
    let handler = null;
    let params = {};

    for (const key in routes) {
      const [rm, rp] = key.split(' ');
      if (rm !== method) continue;
      const rx = new RegExp('^' + rp.replace(/:[a-z]+/gi, '([^/]+)') + '$');
      const mm = path.match(rx);
      if (mm) {
        handler = routes[key];
        const names = [...rp.matchAll(/:([a-z]+)/gi)].map((x) => x[1]);
        names.forEach((n, i) => (params[n] = decodeURIComponent(mm[i + 1])));
        m = mm;
        break;
      }
    }

    if (!handler) return json(res, 404, { error: 'no route' });

    const body = method === 'POST' ? await readBody(req) : {};
    const out = await handler(params, body);
    return json(res, out?.error ? 400 : 200, out);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Discipline → http://localhost:${PORT}\n`);
  console.log(`  Database → ${DB_PATH}\n`);
});
