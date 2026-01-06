import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import crypto from "crypto";

const PORT = process.env.PORT || 8787;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const CALL_BASE_URL = process.env.CALL_BASE_URL || "https://meet.jit.si/";

// v0.6: SQLite persistence (recommended for public demo)
const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), "realia.db");

// Admin
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const NAME_CHANGE_COOLDOWN_MS = Number(process.env.NAME_CHANGE_COOLDOWN_MS || 6 * 60 * 60 * 1000); // 6h


// --- SQLite helpers ---
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`PRAGMA journal_mode=WAL;`);
  db.run(`CREATE TABLE IF NOT EXISTS users(
    user_id TEXT PRIMARY KEY,
    name TEXT,
    created_at INTEGER,
    pin_salt TEXT,
    pin_hash TEXT,
    name_updated_at INTEGER,
    member_status TEXT
  );`);

// best-effort migrations for older DBs
db.run(`ALTER TABLE users ADD COLUMN pin_salt TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN pin_hash TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN name_updated_at INTEGER;`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN member_status TEXT;`, () => {});

  db.run(`ALTER TABLE proposals ADD COLUMN status TEXT;`, () => {});
db.run(`ALTER TABLE requests ADD COLUMN selected_proposal_id TEXT;`, () => {});
  db.run(`CREATE TABLE IF NOT EXISTS profiles(
    user_id TEXT PRIMARY KEY,
    company TEXT, title TEXT, tags TEXT, region TEXT, website TEXT,
    updated_at INTEGER
  );`);

// best-effort migrations for older DBs
db.run(`ALTER TABLE users ADD COLUMN pin_salt TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN pin_hash TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN name_updated_at INTEGER;`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN member_status TEXT;`, () => {});
  db.run(`CREATE TABLE IF NOT EXISTS blocks(
    user_id TEXT,
    blocked_user_id TEXT,
    created_at INTEGER,
    PRIMARY KEY(user_id, blocked_user_id)
  );`);

// best-effort migrations for older DBs
db.run(`ALTER TABLE users ADD COLUMN pin_salt TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN pin_hash TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN name_updated_at INTEGER;`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN member_status TEXT;`, () => {});
  db.run(`CREATE TABLE IF NOT EXISTS jobs(
    job_id TEXT PRIMARY KEY,
    owner_user_id TEXT,
    owner_name TEXT,
    title TEXT, detail TEXT, budget TEXT, tags TEXT,
    ts INTEGER,
    status TEXT
  );`);

// best-effort migrations for older DBs
db.run(`ALTER TABLE users ADD COLUMN pin_salt TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN pin_hash TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN name_updated_at INTEGER;`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN member_status TEXT;`, () => {});
  db.run(`CREATE TABLE IF NOT EXISTS negotiations(
  request_id TEXT PRIMARY KEY,
  room_url TEXT,
  created_at INTEGER
);`);

db.run(`CREATE TABLE IF NOT EXISTS member_applications(
  app_id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  company TEXT,
  phone TEXT,
  categories TEXT,
  region TEXT,
  ts INTEGER,
  status TEXT
);`);

db.run(`CREATE TABLE IF NOT EXISTS audit_log(
  log_id TEXT PRIMARY KEY,
  kind TEXT,
  target_id TEXT,
  payload TEXT,
  ts INTEGER
);`);

db.run(`CREATE TABLE IF NOT EXISTS notifications(


  notif_id TEXT PRIMARY KEY,
  user_id TEXT,
  kind TEXT,
  payload TEXT,
  ts INTEGER,
  read INTEGER
);`);

db.run(`CREATE TABLE IF NOT EXISTS lead_locks(
  request_id TEXT PRIMARY KEY,
  exclusive_until INTEGER,
  allowed_user_ids TEXT,
  ts INTEGER
);`);


// Migrations (best-effort)
db.run(`ALTER TABLE requests ADD COLUMN location_raw TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN service_areas TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN member_categories TEXT;`, () => {});

db.run(`CREATE TABLE IF NOT EXISTS reports(

    report_id TEXT PRIMARY KEY,
    from_user_id TEXT,
    target_user_id TEXT,
    reason TEXT,
    context TEXT,
    detail TEXT,
    ts INTEGER,
    status TEXT,
    selected_proposal_id TEXT
  );`);

// best-effort migrations for older DBs
db.run(`ALTER TABLE users ADD COLUMN pin_salt TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN pin_hash TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN name_updated_at INTEGER;`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN member_status TEXT;`, () => {});
  db.run(`CREATE TABLE IF NOT EXISTS member_settings(
  user_id TEXT PRIMARY KEY,
  categories TEXT,
  price_min INTEGER,
  price_max INTEGER,
  updated_at INTEGER
);`);

db.run(`CREATE TABLE IF NOT EXISTS requests(
  request_id TEXT PRIMARY KEY,
  requester_user_id TEXT,
  requester_name TEXT,
  text TEXT,
  category TEXT,
  budget_max INTEGER,
  location_text TEXT,
  needs TEXT,
  ts INTEGER,
  status TEXT
);`);

db.run(`CREATE TABLE IF NOT EXISTS proposals(
  proposal_id TEXT PRIMARY KEY,
  request_id TEXT,
  from_user_id TEXT,
  from_name TEXT,
  to_user_id TEXT,
  message TEXT,
  ts INTEGER
);`);

db.run(`CREATE TABLE IF NOT EXISTS partner_requests(

    request_id TEXT PRIMARY KEY,
    from_user_id TEXT,
    from_name TEXT,
    to_user_id TEXT,
    note TEXT,
    ts INTEGER,
    status TEXT
  );`);

// best-effort migrations for older DBs
db.run(`ALTER TABLE users ADD COLUMN pin_salt TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN pin_hash TEXT;`, () => {});
db.run(`ALTER TABLE users ADD COLUMN name_updated_at INTEGER;`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN member_status TEXT;`, () => {});
});


function safeParseJSON(s, fallback){
  try { return JSON.parse(s); } catch { return fallback; }
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}


function randSalt(){
  return crypto.randomBytes(16).toString("hex");
}
function hashPin(pin, salt){
  return crypto.createHash("sha256").update(String(salt) + ":" + String(pin)).digest("hex");
}
function pinLooksValid(pin){
  const p = String(pin || "");
  return p.length >= 4 && p.length <= 12;
}

function isAdmin(req){
  const t = String(req.query?.token || "");
  return ADMIN_TOKEN && t === ADMIN_TOKEN;
}

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

app.get("/health", async (_, res) => {
  res.json({ ok: true, ts: Date.now(), db: path.basename(DB_FILE) });
});

// Admin pages
function escapeHtml(s){
  return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

app.get("/admin", (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  res.send(`<html><head><meta charset="utf-8"><title>REALIA Admin</title></head>
  <body style="font-family:system-ui;background:#0b1220;color:#e9f0ff;padding:16px">
    <h2>REALIA Admin</h2>
    <ul>
      <li><a style="color:#4aa3ff" href="/admin/reports?token=${encodeURIComponent(req.query.token || "")}">Reports</a></li>
      <li><a style="color:#4aa3ff" href="/admin/applications?token=${encodeURIComponent(req.query.token || "")}">Applications</a></li>
      <li><a style="color:#4aa3ff" href="/admin/members?token=${encodeURIComponent(req.query.token || "")}">Members</a></li>
      <li><a style="color:#4aa3ff" href="/admin/users?token=${encodeURIComponent(req.query.token || "")}">Users</a></li>
      <li><a style="color:#4aa3ff" href="/admin/export.csv?table=requests&token=${encodeURIComponent(req.query.token || "")}">ExportCSV(Requests)</a></li>
      <li><a style="color:#4aa3ff" href="/admin/export.csv?table=proposals&token=${encodeURIComponent(req.query.token || "")}">ExportCSV(Proposals)</a></li>
      <li><a style="color:#4aa3ff" href="/admin/audit?token=${encodeURIComponent(req.query.token || "")}">Audit</a></li>
      <li><a style="color:#4aa3ff" href="/admin/pipeline?token=${encodeURIComponent(req.query.token || "")}">Pipeline</a></li>
      <li><a style="color:#4aa3ff" href="/admin/metrics?token=${encodeURIComponent(req.query.token || "")}">Metrics</a></li>
      <li><a style="color:#4aa3ff" href="/admin/jobs?token=${encodeURIComponent(req.query.token || "")}">Jobs</a></li>
    </ul>
  </body></html>`);
});

app.get("/admin/reports", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const list = await all(`SELECT * FROM reports ORDER BY ts DESC LIMIT 300;`);
  const rows = list.map(r => `
    <tr>
      <td>${new Date(r.ts).toLocaleString()}</td>
      <td>${escapeHtml(r.status || "open")}</td>
      <td>${escapeHtml(r.from_user_id)}</td>
      <td>${escapeHtml(r.target_user_id)}</td>
      <td>${escapeHtml(r.reason)}</td>
      <td>${escapeHtml(r.context)}</td>
      <td style="white-space:pre-wrap;max-width:520px">${escapeHtml(r.detail)}</td>
      <td>
        <form method="post" action="/admin/reports/resolve?token=${encodeURIComponent(req.query.token || "")}">
          <input type="hidden" name="id" value="${escapeHtml(r.report_id)}" />
          <button>Resolve</button>
        </form>
      </td>
    </tr>
  `).join("");
  res.send(`<html><head><meta charset="utf-8"><title>Reports</title></head>
  <body style="font-family:system-ui;background:#0b1220;color:#e9f0ff;padding:16px">
    <h2>Reports</h2>
    <p>count: ${list.length}</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse">
      <thead>
        <tr><th>ts</th><th>status</th><th>from</th><th>target</th><th>reason</th><th>context</th><th>detail</th><th>action</th></tr>
      </thead>
      <tbody>${rows || "<tr><td colspan='8'>none</td></tr>"}</tbody>
    </table>
    <p style="opacity:.75">※ Resolve はデモ用。運用では権限/監査を追加してください。</p>
  </body></html>`);
});

// tiny form body parser for admin post
app.use(express.urlencoded({ extended: true }));
app.post("/admin/reports/resolve", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const id = String(req.body?.id || "");
  if (id) await run(`UPDATE reports SET status='resolved' WHERE report_id=?;`, [id]);
  res.redirect(`/admin/reports?token=${encodeURIComponent(req.query.token || "")}`);
});




app.get("/admin/audit", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const list = await all(`SELECT * FROM audit_log ORDER BY ts DESC LIMIT 400;`);
  const rows = list.map(l => `
    <tr>
      <td>${new Date(l.ts).toLocaleString()}</td>
      <td>${escapeHtml(l.kind||"")}</td>
      <td>${escapeHtml(l.target_id||"")}</td>
      <td><pre style="white-space:pre-wrap;margin:0">${escapeHtml(l.payload||"")}</pre></td>
    </tr>
  `).join("");
  res.send(`<html><head><meta charset="utf-8"><title>Audit</title></head>
  <body style="font-family:system-ui;background:#0b1220;color:#e9f0ff;padding:16px">
    <h2>Audit Log</h2>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse">
      <thead><tr><th>ts</th><th>kind</th><th>target</th><th>payload</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='4'>none</td></tr>"}</tbody>
    </table>
  </body></html>`);
});



app.get("/admin/pipeline", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const token = String(req.query.token || "");
  const from = Number(req.query?.from || 0) || 0;
  const to = Number(req.query?.to || 0) || 0;

  const where = [];
  const params = [];
  if (from) { where.push("ts >= ?"); params.push(from); }
  if (to) { where.push("ts <= ?"); params.push(to); }
  const whereSql = where.length ? ("WHERE " + where.join(" AND ")) : "";

  const reqBy = await all(`SELECT status, COUNT(*) as c FROM requests ${whereSql} GROUP BY status;`, params);
  const propBy = await all(`SELECT status, COUNT(*) as c FROM proposals ${whereSql} GROUP BY status;

// Proposals joined with requests for breakdowns
const propJoin = await all(`SELECT p.status as p_status, r.category as category, r.location_text as location_text
                           FROM proposals p
                           LEFT JOIN requests r ON r.request_id=p.request_id
                           ${whereSql.replaceAll("ts", "p.ts")};`, params);

const aggPropBy = (keyFn) => {
  const map = new Map();
  for (const row of propJoin){
    const k = keyFn(row);
    if (!map.has(k)) map.set(k, { k, total: 0, accepted: 0 });
    const o = map.get(k);
    o.total += 1;
    if (String(row.p_status||"sent") === "accepted") o.accepted += 1;
  }
  return Array.from(map.values()).sort((a,b)=>b.total-a.total).slice(0, 12);
};

const propCat = aggPropBy((r)=> String(r.category||"(none)") || "(none)");
const propPref = aggPropBy((r)=> normPref(r.location_text));
`, params);

  const reqRows = await all(`SELECT category, location_text, status FROM requests ${whereSql};`, params);
const normPref = (s) => {
  const t = String(s||"");
  const m = t.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
  return m ? m[1] : (t ? t.slice(0, 8) : "(none)");
};

const aggBy = (keyFn) => {
  const map = new Map();
  for (const r of reqRows){
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, { k, total: 0, negotiating: 0, won: 0 });
    const o = map.get(k);
    o.total += 1;
    const st = String(r.status||"open");
    if (st === "negotiating") o.negotiating += 1;
    if (st === "won") o.won += 1;
  }
  return Array.from(map.values()).sort((a,b)=>b.total-a.total).slice(0, 12);
};

const catStats = aggBy((r)=> String(r.category||"(none)") || "(none)");

// Heatmap (Category x Prefecture) using request totals
const topCats = catStats.map(x => x.k).slice(0, 8);
const topPrefs = prefStats.map(x => x.k).slice(0, 8);
const heatMap = new Map();
for (const r of reqRows){
  const c = String(r.category || "(none)");
  const p = normPref(r.location_text);
  if (!topCats.includes(c) || !topPrefs.includes(p)) continue;
  const key = c + "||" + p;
  heatMap.set(key, (heatMap.get(key) || 0) + 1);
}
const heatCell = (c,p) => Number(heatMap.get(c + "||" + p) || 0);
const prefStats = aggBy((r)=> normPref(r.location_text));

const reqCat = await all(`SELECT COALESCE(category,'') as k, COUNT(*) as c FROM requests ${whereSql} GROUP BY COALESCE(category,'') ORDER BY c DESC LIMIT 12;`, params);
  
const members = await all(`SELECT service_areas FROM users WHERE member_status='approved' LIMIT 2000;`);
const memCount = new Map();
for (const u of members){
  const areas = parseServiceAreas(u.service_areas);
  for (const a of areas){
    const k = normPref(a);
    memCount.set(k, (memCount.get(k)||0)+1);
  }
}
const memTop = Array.from(memCount.entries()).map(([k,c])=>({k,c})).sort((a,b)=>b.c-a.c).slice(0,12);

  const reqLoc = await all(`SELECT COALESCE(location_text,'') as k, COUNT(*) as c FROM requests ${whereSql} GROUP BY COALESCE(location_text,'') ORDER BY c DESC LIMIT 12;`, params);

  const pick = (rows, key) => {
    const r = rows.find(x => String(x.status||"") === key);
    return r ? Number(r.c||0) : 0;
  };

  const open = pick(reqBy, "open");
  const negotiating = pick(reqBy, "negotiating");
  const won = pick(reqBy, "won");
  const lost = pick(reqBy, "lost");
  const closed = pick(reqBy, "closed");
  const cancelled = pick(reqBy, "cancelled");

  const sent = pick(propBy, "sent");
  const accepted = pick(propBy, "accepted");
  const rejected = pick(propBy, "rejected");

  const pct = (a,b) => (b ? ((a/b)*100).toFixed(1) : "0.0") + "%";

  const now = Date.now();
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
  const endOfDay = (t) => { const d = new Date(t); d.setHours(23,59,59,999); return d.getTime(); };
  const startOfWeek = () => { const d = new Date(); const day = d.getDay(); const diff = (day === 0 ? 6 : day-1); d.setDate(d.getDate()-diff); d.setHours(0,0,0,0); return d.getTime(); };
  const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.getTime(); };

  const link = (label, f, t) => `/admin/pipeline?token=${encodeURIComponent(token)}&from=${f}&to=${t}`;

  const rowsKV = (rows) => rows.map(r => `<tr><td>${escapeHtml(String(r.k||"(none)"))}</td><td style="text-align:right">${Number(r.c||0)}</td></tr>`).join("");
  const rowsStats = (rows) => rows.map(r => {
    const wr = r.negotiating ? ((r.won / r.negotiating) * 100).toFixed(1) + '%' : '0.0%';
    return `<tr><td>${escapeHtml(String(r.k||"(none)"))}</td><td style="text-align:right">${r.total}</td><td style="text-align:right">${r.negotiating}</td><td style="text-align:right">${r.won}</td><td style="text-align:right">${wr}</td></tr>`;
  }).join("");

  res.send(`<html><head><meta charset="utf-8"><title>Pipeline</title></head>
  <body style="font-family:system-ui;background:#0b1220;color:#e9f0ff;padding:16px">
    <h2>Pipeline</h2>
    <p style="opacity:.8">依頼→提案→交渉→成約 の簡易可視化（デモ）。</p>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 18px">
      <a style="color:#4aa3ff" href="${link("All", 0, 0)}">全期間</a>
      <a style="color:#4aa3ff" href="${link("ThisWeek", startOfWeek(), endOfDay(now))}">今週</a>
      <a style="color:#4aa3ff" href="${link("ThisMonth", startOfMonth(), endOfDay(now))}">今月</a>
    </div>

    <form method="get" action="/admin/pipeline" style="margin-bottom:16px">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div>
          <label>from (ms)</label><br/>
          <input name="from" value="${from||""}" placeholder="0" style="width:220px" />
        </div>
        <div>
          <label>to (ms)</label><br/>
          <input name="to" value="${to||""}" placeholder="0" style="width:220px" />
        </div>
        <div>
          <button style="padding:8px 12px">Apply</button>
        </div>
      </div>
    </form>

    <h3>Funnel</h3>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="background:#111b2f;padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:10px;min-width:220px">
        <div style="opacity:.8">Requests open</div>
        <div style="font-size:28px;font-weight:900">${open}</div>
      </div>
      <div style="background:#111b2f;padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:10px;min-width:220px">
        <div style="opacity:.8">Negotiating</div>
        <div style="font-size:28px;font-weight:900">${negotiating}</div>
        <div style="opacity:.7">rate vs open: ${pct(negotiating, open)}</div>
      </div>
      <div style="background:#111b2f;padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:10px;min-width:220px">
        <div style="opacity:.8">Won</div>
        <div style="font-size:28px;font-weight:900">${won}</div>
        <div style="opacity:.7">win rate vs negotiating: ${pct(won, negotiating)}</div>
      </div>
    </div>

    <h3 style="margin-top:18px">Requests status</h3>
    <ul>
      <li>open: ${open}</li>
      <li>negotiating: ${negotiating}</li>
      <li>won: ${won}</li>
      <li>lost: ${lost}</li>
      <li>closed: ${closed}</li>
      <li>cancelled: ${cancelled}</li>
    </ul>

    <h3>Proposals status</h3>
    <ul>
      <li>sent: ${sent}</li>
      <li>accepted: ${accepted}</li>
      <li>rejected: ${rejected}</li>
    </ul>

    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:18px">
  <div style="min-width:320px">
    <h3>Requests by Category (top)</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse;width:100%">
      <thead><tr><th>category</th><th>count</th></tr></thead>
      <tbody>${rowsKV(reqCat) || "<tr><td colspan='2'>(none)</td></tr>"}</tbody>
    </table>
  </div>

  <div style="min-width:320px">
    <h3>Requests by Location (top)</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse;width:100%">
      <thead><tr><th>location</th><th>count</th></tr></thead>
      <tbody>${rowsKV(reqLoc) || "<tr><td colspan='2'>(none)</td></tr>"}</tbody>
    </table>
  </div>

  <div style="min-width:520px">
    <h3>Win rate by Category (won / negotiating)</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse;width:100%">
      <thead><tr><th>category</th><th>total</th><th>negotiating</th><th>won</th><th>win rate</th></tr></thead>
      <tbody>${rowsStats(catStats) || "<tr><td colspan='5'>(none)</td></tr>"}</tbody>
    </table>
  </div>

  <div style="min-width:520px">
    <h3>Requests by Prefecture (normalized)</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse;width:100%">
      <thead><tr><th>prefecture</th><th>total</th><th>negotiating</th><th>won</th><th>win rate</th></tr></thead>
      <tbody>${rowsStats(prefStats) || "<tr><td colspan='5'>(none)</td></tr>"}</tbody>
    </table>
  </div>
</div>

    
<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:18px">
  <div style="min-width:520px">
    <h3>Proposals by Category (accepted / total)</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse;width:100%">
      <thead><tr><th>category</th><th>total</th><th>accepted</th><th>accept rate</th></tr></thead>
      <tbody>${propCat.map(r => {
        const ar = r.total ? ((r.accepted / r.total) * 100).toFixed(1) + '%' : '0.0%';
        return `<tr><td>${escapeHtml(String(r.k||"(none)"))}</td><td style="text-align:right">${r.total}</td><td style="text-align:right">${r.accepted}</td><td style="text-align:right">${ar}</td></tr>`;
      }).join("") || "<tr><td colspan='4'>(none)</td></tr>"}</tbody>
    </table>
  </div>

  <div style="min-width:520px">
    <h3>Proposals by Prefecture (accepted / total)</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse;width:100%">
      <thead><tr><th>prefecture</th><th>total</th><th>accepted</th><th>accept rate</th></tr></thead>
      <tbody>${propPref.map(r => {
        const ar = r.total ? ((r.accepted / r.total) * 100).toFixed(1) + '%' : '0.0%';
        return `<tr><td>${escapeHtml(String(r.k||"(none)"))}</td><td style="text-align:right">${r.total}</td><td style="text-align:right">${r.accepted}</td><td style="text-align:right">${ar}</td></tr>`;
      }).join("") || "<tr><td colspan='4'>(none)</td></tr>"}</tbody>
    </table>
  </div>
</div>


<h3 style="margin-top:22px">Heatmap: Category × Prefecture (requests)</h3>
<div style="overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:10px">
  <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;min-width:760px;width:100%">
    <thead>
      <tr>
        <th style="text-align:left;position:sticky;left:0;background:#0b1220">category \ pref</th>
        ${topPrefs.map(p => `<th style="text-align:right">${escapeHtml(p)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${topCats.map(c => `
        <tr>
          <td style="position:sticky;left:0;background:#0b1220">${escapeHtml(c)}</td>
          ${topPrefs.map(p => `<td style="text-align:right">${heatCell(c,p)}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  </table>
</div>


<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:18px">
  <div style="min-width:320px">
    <h3>Members by Service Area (top)</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse;width:100%">
      <thead><tr><th>pref</th><th>members</th></tr></thead>
      <tbody>${rowsKV(memTop) || "<tr><td colspan='2'>(none)</td></tr>"}</tbody>
    </table>
  </div>
</div>

<p style="margin-top:16px"><a style="color:#4aa3ff" href="/admin?token=${encodeURIComponent(token)}">← back</a></p>
  </body></html>`);
});

app.get("/admin/metrics", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const reqs = await all(`SELECT status, COUNT(*) as c FROM requests GROUP BY status;`);
  const props = await all(`SELECT status, COUNT(*) as c FROM proposals GROUP BY status;`);
  const totalUsers = await get(`SELECT COUNT(*) as c FROM users;`);
  const totalMembers = await get(`SELECT COUNT(*) as c FROM users u WHERE EXISTS(SELECT 1 FROM member_settings ms WHERE ms.user_id=u.user_id AND (ms.categories<>'' OR ms.price_max>0));`);
  const fmt = (rows) => rows.map(r => `<li>${escapeHtml(r.status||"null")}: ${r.c}</li>`).join("");
  res.send(`<html><head><meta charset="utf-8"><title>Metrics</title></head>
  <body style="font-family:system-ui;background:#0b1220;color:#e9f0ff;padding:16px">
    <h2>Metrics</h2>
    <p>users: ${totalUsers?.c || 0} / members(with settings): ${totalMembers?.c || 0}</p>
    <h3>Requests by status</h3>
    <ul>${fmt(reqs) || "<li>none</li>"}</ul>
    <h3>Proposals by status</h3>
    <ul>${fmt(props) || "<li>none</li>"}</ul>
    <p style="opacity:.75">※ デモ用メトリクス。運用では期間/フィルタ/監査ログを追加。</p>
  </body></html>`);
});


app.get("/admin/export.csv", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const table = String(req.query?.table || "requests");
  const from = Number(req.query?.from || 0) || 0;
  const to = Number(req.query?.to || 0) || 0;

  const where = [];
  const params = [];
  if (from) { where.push("ts >= ?"); params.push(from); }
  if (to) { where.push("ts <= ?"); params.push(to); }
  const whereSql = where.length ? ("WHERE " + where.join(" AND ")) : "";

  let rows = [];
  if (table === "proposals") {
    rows = await all(`SELECT proposal_id, request_id, from_user_id, from_name, to_user_id, message, ts, status FROM proposals ${whereSql} ORDER BY ts DESC;`, params);
    const header = ["proposal_id","request_id","from_user_id","from_name","to_user_id","message","ts","status"];
    const csv = toCSV(header, rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(csv);
    return;
  }

  // default requests
  rows = await all(`SELECT request_id, requester_user_id, requester_name, text, category, budget_max, location_text, needs, ts, status, selected_proposal_id FROM requests ${whereSql} ORDER BY ts DESC;`, params);
  const header = ["request_id","requester_user_id","requester_name","text","category","budget_max","location_text","needs","ts","status","selected_proposal_id"];
  const csv = toCSV(header, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send(csv);
});

function csvEscape(v){
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return '"' + s.replaceAll('"','""') + '"';
  return s;
}
function toCSV(header, rows){
  const lines = [];
  lines.push(header.map(csvEscape).join(","));
  for (const r of rows){
    lines.push(header.map(k => csvEscape(r[k])).join(","));
  }
  return lines.join("\n");
}



app.get("/admin/applications", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const list = await all(`SELECT * FROM member_applications ORDER BY ts DESC LIMIT 300;`);
  const rows = list.map(a => `
    <tr>
      <td>${new Date(a.ts).toLocaleString()}</td>
      <td>${escapeHtml(a.status||"pending")}</td>
      <td>${escapeHtml(a.user_id)}</td>
      <td>${escapeHtml(a.name||"")}</td>
      <td>${escapeHtml(a.company||"")}</td>
      <td>${escapeHtml(a.phone||"")}</td>
      <td>${escapeHtml(a.region||"")}</td>
      <td>${escapeHtml(a.categories||"")}</td>
      <td>
        <form method="post" action="/admin/applications/approve?token=${encodeURIComponent(req.query.token||"")}">
          <input type="hidden" name="id" value="${escapeHtml(a.app_id)}" />
          <button>Approve</button>
        </form>
      </td>
    </tr>
  `).join("");
  res.send(`<html><head><meta charset="utf-8"><title>Applications</title></head>
  <body style="font-family:system-ui;background:#0b1220;color:#e9f0ff;padding:16px">
    <h2>Member Applications</h2>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse">
      <thead><tr><th>ts</th><th>status</th><th>user_id</th><th>name</th><th>company</th><th>phone</th><th>region</th><th>categories</th><th>action</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='9'>none</td></tr>"}</tbody>
    </table>
  </body></html>`);
});

app.post("/admin/applications/approve", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const id = String(req.body?.id || "");
  const appRow = await get(`SELECT user_id, region, categories FROM member_applications WHERE app_id=? LIMIT 1;`, [id]);
  if (appRow?.user_id) {
    await run(`UPDATE users SET member_status='approved', service_areas=?, member_categories=? WHERE user_id=?;`, [String(appRow.region||""), String(appRow.categories||""), appRow.user_id]);
    await pushNotif(appRow.user_id, "member_approved", { user_id: appRow.user_id, ts: Date.now() });
    await run(`UPDATE member_applications SET status='approved' WHERE app_id=?;`, [id]);
    await audit("application_approve", id, { user_id: appRow.user_id, by: "admin", ts: Date.now() }, String(req.query?.token || "").slice(-6), "/admin/applications/approve");
  }
  res.redirect(`/admin/applications?token=${encodeURIComponent(req.query.token || "")}`);
});

app.get("/admin/members", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const list = await all(`SELECT user_id, name, member_status, created_at FROM users ORDER BY created_at DESC LIMIT 400;`);
  const rows = list.map(u => `
    <tr>
      <td>${escapeHtml(u.user_id)}</td>
      <td>${escapeHtml(u.name||"")}</td>
      <td>${escapeHtml(u.member_status||"")}</td>
      <td>${new Date(u.created_at).toLocaleString()}</td>
      <td>
        <form method="post" action="/admin/members/set?token=${encodeURIComponent(req.query.token||"")}">
          <input type="hidden" name="id" value="${escapeHtml(u.user_id)}" />
          <select name="status">
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="suspended">suspended</option>
            <option value="">(none)</option>
          </select>
          <button>Set</button>
        </form>
      </td>
    </tr>
  `).join("");
  res.send(`<html><head><meta charset="utf-8"><title>Members</title></head>
  <body style="font-family:system-ui;background:#0b1220;color:#e9f0ff;padding:16px">
    <h2>Members</h2>
    <p>※ member_status が approved のみ提案可 / ピックアップ対象</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse">
      <thead><tr><th>user_id</th><th>name</th><th>member_status</th><th>created_at</th><th>action</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='5'>none</td></tr>"}</tbody>
    </table>
  </body></html>`);
});

app.post("/admin/members/set", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const id = String(req.body?.id || "");
  const status = String(req.body?.status || "");
  const areas = String(req.body?.service_areas || "");
  const cats = String(req.body?.member_categories || "");
  await run(`UPDATE users SET member_status=?, service_areas=COALESCE(NULLIF(?,''), service_areas), member_categories=COALESCE(NULLIF(?,''), member_categories) WHERE user_id=?;`, [status || null, areas, cats, id]);
  if (status === "approved") { await pushNotif(id, "member_approved", { user_id: id, ts: Date.now() }); }
  await audit("member_status", id, { status, by: "admin", ts: Date.now() }, String(req.query?.token || "").slice(-6), "/admin/members/set");
  if (status === "suspended") { await pushNotif(id, "member_suspended", { user_id: id, ts: Date.now() }); }
  res.redirect(`/admin/members?token=${encodeURIComponent(req.query.token || "")}`);
});

app.get("/admin/users", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const list = await all(`SELECT user_id, name, created_at, (pin_hash IS NOT NULL) AS has_pin FROM users ORDER BY created_at DESC LIMIT 300;`);
  const rows = list.map(u => `
    <tr>
      <td>${escapeHtml(u.user_id)}</td>
      <td>${escapeHtml(u.name || "")}</td>
      <td>${new Date(u.created_at).toLocaleString()}</td>
      <td>${u.has_pin ? "yes" : "no"}</td>
    </tr>
  `).join("");
  res.send(`<html><head><meta charset="utf-8"><title>Users</title></head>
  <body style="font-family:system-ui;background:#0b1220;color:#e9f0ff;padding:16px">
    <h2>Users</h2>
    <p>count: ${list.length}</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse">
      <thead><tr><th>user_id</th><th>name</th><th>created_at</th><th>has_pin</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='4'>none</td></tr>"}</tbody>
    </table>
  </body></html>`);
});

app.get("/admin/jobs", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  const list = await all(`SELECT * FROM jobs ORDER BY ts DESC LIMIT 200;`);
  const rows = list.map(j => `
    <tr>
      <td>${new Date(j.ts).toLocaleString()}</td>
      <td>${escapeHtml(j.owner_name)}</td>
      <td>${escapeHtml(j.title)}</td>
      <td>${escapeHtml(j.budget||"")}</td>
      <td>${escapeHtml(j.tags||"")}</td>
      <td style="white-space:pre-wrap;max-width:520px">${escapeHtml(j.detail||"")}</td>
    </tr>
  `).join("");
  res.send(`<html><head><meta charset="utf-8"><title>Jobs</title></head>
  <body style="font-family:system-ui;background:#0b1220;color:#e9f0ff;padding:16px">
    <h2>Jobs</h2>
    <p>count: ${list.length}</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-color:rgba(255,255,255,.12);border-collapse:collapse">
      <thead><tr><th>ts</th><th>owner</th><th>title</th><th>budget</th><th>tags</th><th>detail</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='6'>none</td></tr>"}</tbody>
    </table>
  </body></html>`);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});

// --- In-memory online presence (per session) ---
/**
 * socketId -> { socketId, userId, name, x, y, status, lastSeen }
 */
const sessions = new Map();
/**
 * userId -> Set(socketId)
 */
const userSockets = new Map();
/**
 * socketId -> userId
 */
const socketToUser = new Map();

// v0.4 moderation in-memory rate limiter (per userId)
const rate = new Map();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function allowRate(userId, key, limit, windowMs){
  const now = Date.now();
  if(!rate.has(userId)) rate.set(userId, { dm: [], area: [], partner: [] });
  const bucket = rate.get(userId)[key] || [];
  const fresh = bucket.filter(ts => now - ts <= windowMs);
  if(fresh.length >= limit){
    rate.get(userId)[key] = fresh;
    return false;
  }
  fresh.push(now);
  rate.get(userId)[key] = fresh;
  return true;
}



async function audit(kind, targetId, payload, actor, route){
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await run(`INSERT INTO audit_log(log_id, kind, target_id, payload, ts) VALUES(?,?,?,?,?);`,
    [id, String(kind).slice(0, 32), String(targetId||"").slice(0, 80), JSON.stringify({ ...(payload||{}), actor: actor||"", route: route||"" }), Date.now()]);
}

async function pushNotif(userId, kind, payload){
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await run(`INSERT INTO notifications(notif_id, user_id, kind, payload, ts, read) VALUES(?,?,?,?,?,0);`,
    [id, userId, String(kind).slice(0, 32), JSON.stringify(payload || {}), Date.now()]);
  return id;
}

async function isBlockedByUserIds(aUserId, bUserId){
  // either direction blocks communication
  const r1 = await get(`SELECT 1 FROM blocks WHERE user_id=? AND blocked_user_id=? LIMIT 1;`, [aUserId, bUserId]);
  const r2 = await get(`SELECT 1 FROM blocks WHERE user_id=? AND blocked_user_id=? LIMIT 1;`, [bUserId, aUserId]);
  return !!(r1 || r2);
}

async function presenceList(){
  const online = Array.from(sessions.values());
  // attach profile preview from DB
  const ids = online.map(s => s.userId);
  const uniq = Array.from(new Set(ids));
  let profMap = new Map();
  if (uniq.length){
    const q = `SELECT user_id, company, title, tags, region, website FROM profiles WHERE user_id IN (${uniq.map(()=>"?").join(",")});`;
    const rows = await all(q, uniq);

// Matching score (member): service_areas(pref) overlap gives +2, category overlap gives +1
if (!mine && me.role === "member") {
  const areas = parseServiceAreas(me.serviceAreas || "");
  const cats = parseServiceAreas(me.memberCategories || "");
  const getPref = (loc) => {
    const t = String(loc||"");
    const m = t.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
    return m ? m[1] : t;
  };
  for (const r of rows) {
    let score = 0;
    const pref = getPref(r.location_text);
    if (areas.length && pref && areas.some(a => a && pref.includes(a))) score += 2;
    if (cats.length && r.category && cats.some(c => c && String(r.category).includes(c))) score += 1;
    r.matchScore = score;
    r.matchPref = pref;
  }
  rows.sort((a,b)=> (b.matchScore||0)-(a.matchScore||0) || (b.ts||0)-(a.ts||0));
}
    for (const r of rows) profMap.set(r.user_id, r);
  }
  return online.map(s => {
    const p = profMap.get(s.userId) || {};
    return {
      id: s.socketId,           // session id for DM routing (current MVP)
      userId: s.userId,         // stable id for persistence
      role: s.role || "user",
      memberStatus: s.memberStatus || "",
      name: s.name,
      x: s.x,
      y: s.y,
      status: s.status || "available",
      lastSeen: s.lastSeen,
      company: p.company || "",
      title: p.title || "",
      tags: p.tags || "",
      region: p.region || "",
      website: p.website || "",
    };
  });
}

async function broadcastPresence(){
  io.emit("presence:list", await presenceList());
}

async function broadcastJobs(){
  const list = await all(`SELECT * FROM jobs ORDER BY ts DESC LIMIT 100;`);
  io.emit("job:list", list);
}

function addUserSocket(userId, socketId){
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}
function removeUserSocket(userId, socketId){
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}



const CATEGORY_DICT = [
  { cat: "住宅塗装", keys: ["塗装", "外壁", "屋根", "塗り替え"] },
  { cat: "防水", keys: ["防水", "シーリング", "コーキング", "雨漏り"] },
  { cat: "リフォーム", keys: ["リフォーム", "改装", "修繕", "内装", "クロス", "床"] },
  { cat: "外構", keys: ["外構", "エクステリア", "フェンス", "カーポート", "庭"] },
  { cat: "引越し", keys: ["引越し", "引っ越し", "移転"] },
  { cat: "Web制作", keys: ["ホームページ", "Web", "サイト", "LP", "SEO"] },
  { cat: "士業", keys: ["税理士", "社労士", "司法書士", "行政書士", "弁護士"] },
];

function parseBudgetJPY(text){
  const t = String(text||"");
  // examples: 100万円, 100万, 1,000,000円
  const m1 = t.match(/([0-9]{1,3}(?:,[0-9]{3})+)\s*円/);
  if (m1) return Number(m1[1].replaceAll(",",""));
  const m2 = t.match(/([0-9]+)\s*万円/);
  if (m2) return Number(m2[1]) * 10000;
  const m3 = t.match(/([0-9]+)\s*万/);
  if (m3) return Number(m3[1]) * 10000;
  return 0;
}

function parseCategory(text){
  const t = String(text||"").toLowerCase();
  for (const d of CATEGORY_DICT){
    if (d.keys.some(k => t.includes(String(k).toLowerCase()))) return d.cat;
  }
  return "";
}


const CITY_TO_PREF = [
  { pref: "東京都", cities: ["新宿","渋谷","港区","千代田","中央区","品川","目黒","世田谷","足立","練馬","江東","台東"] },
  { pref: "大阪府", cities: ["大阪市","堺","豊中","吹田","東大阪"] },
  { pref: "愛知県", cities: ["名古屋","豊田","岡崎"] },
  { pref: "福岡県", cities: ["福岡","北九州"] },
  { pref: "北海道", cities: ["札幌","函館"] },
  { pref: "宮城県", cities: ["仙台"] },
  { pref: "広島県", cities: ["広島"] },
  { pref: "京都府", cities: ["京都"] },
  { pref: "神奈川県", cities: ["横浜","川崎","相模原"] },
  { pref: "埼玉県", cities: ["さいたま","川口","越谷"] },
  { pref: "千葉県", cities: ["千葉","船橋","柏"] },
];



const PREF_REGIONS = {
  "北海道": "北海道",
  "青森県":"東北","岩手県":"東北","宮城県":"東北","秋田県":"東北","山形県":"東北","福島県":"東北",
  "茨城県":"関東","栃木県":"関東","群馬県":"関東","埼玉県":"関東","千葉県":"関東","東京都":"関東","神奈川県":"関東",
  "新潟県":"中部","富山県":"中部","石川県":"中部","福井県":"中部","山梨県":"中部","長野県":"中部","岐阜県":"中部","静岡県":"中部","愛知県":"中部",
  "三重県":"近畿","滋賀県":"近畿","京都府":"近畿","大阪府":"近畿","兵庫県":"近畿","奈良県":"近畿","和歌山県":"近畿",
  "鳥取県":"中国","島根県":"中国","岡山県":"中国","広島県":"中国","山口県":"中国",
  "徳島県":"四国","香川県":"四国","愛媛県":"四国","高知県":"四国",
  "福岡県":"九州","佐賀県":"九州","長崎県":"九州","熊本県":"九州","大分県":"九州","宮崎県":"九州","鹿児島県":"九州","沖縄県":"沖縄"
};

const PREF_NEIGHBORS = {
  "北海道": [],
  "青森県":["岩手県","秋田県"], "岩手県":["青森県","宮城県","秋田県"], "宮城県":["岩手県","秋田県","山形県","福島県"], "秋田県":["青森県","岩手県","宮城県","山形県"], "山形県":["秋田県","宮城県","福島県","新潟県"], "福島県":["宮城県","山形県","新潟県","栃木県","茨城県","群馬県"],
  "茨城県":["福島県","栃木県","埼玉県","千葉県"], "栃木県":["福島県","群馬県","埼玉県","茨城県"], "群馬県":["福島県","新潟県","長野県","埼玉県","栃木県"], "埼玉県":["群馬県","栃木県","茨城県","千葉県","東京都","山梨県","長野県"], "千葉県":["茨城県","埼玉県","東京都"], "東京都":["埼玉県","千葉県","神奈川県","山梨県"], "神奈川県":["東京都","山梨県","静岡県"],
  "新潟県":["山形県","福島県","群馬県","長野県","富山県"], "富山県":["新潟県","長野県","岐阜県","石川県"], "石川県":["富山県","岐阜県","福井県"], "福井県":["石川県","岐阜県","滋賀県","京都府"], "山梨県":["東京都","神奈川県","静岡県","長野県","埼玉県"], "長野県":["新潟県","群馬県","埼玉県","山梨県","静岡県","愛知県","岐阜県","富山県"], "岐阜県":["富山県","石川県","福井県","滋賀県","三重県","愛知県","長野県"], "静岡県":["神奈川県","山梨県","長野県","愛知県"], "愛知県":["静岡県","長野県","岐阜県","三重県"],
  "三重県":["愛知県","岐阜県","滋賀県","京都府","奈良県","和歌山県"], "滋賀県":["福井県","岐阜県","三重県","京都府"], "京都府":["福井県","三重県","滋賀県","大阪府","兵庫県","奈良県"], "大阪府":["京都府","兵庫県","奈良県","和歌山県"], "兵庫県":["京都府","大阪府","鳥取県","岡山県"], "奈良県":["三重県","京都府","大阪府","和歌山県"], "和歌山県":["三重県","大阪府","奈良県"],
  "鳥取県":["兵庫県","岡山県","島根県"], "島根県":["鳥取県","広島県","山口県"], "岡山県":["兵庫県","鳥取県","広島県","香川県"], "広島県":["島根県","岡山県","山口県","愛媛県"], "山口県":["島根県","広島県","福岡県"],
  "徳島県":["香川県","愛媛県","高知県"], "香川県":["徳島県","愛媛県","岡山県"], "愛媛県":["香川県","徳島県","高知県","広島県"], "高知県":["徳島県","愛媛県"],
  "福岡県":["山口県","佐賀県","熊本県","大分県"], "佐賀県":["福岡県","長崎県"], "長崎県":["佐賀県"], "熊本県":["福岡県","大分県","宮崎県","鹿児島県"], "大分県":["福岡県","熊本県","宮崎県"], "宮崎県":["大分県","熊本県","鹿児島県"], "鹿児島県":["熊本県","宮崎県"], "沖縄県":[]
};

function prefOf(text){
  const t = String(text||"");
  const m = t.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
  return m ? m[1] : "";
}

function scoreMemberForRequest(member, req){
  // member: {service_areas, member_categories}
  const areas = parseServiceAreas(member.service_areas || member.serviceAreas || "");
  const cats = parseServiceAreas(member.member_categories || member.memberCategories || "");
  const reqPref = prefOf(req.location_text) || prefOf(req.location_raw) || prefOf(req.location_text || "");
  const reqRegion = PREF_REGIONS[reqPref] || "";
  let score = 0;

  // area match: exact pref +2, neighbor +1, same region +0.5
  if (areas.length && reqPref){
    if (areas.some(a => a && reqPref.includes(a))) score += 2;
    else if (areas.some(a => PREF_NEIGHBORS[reqPref]?.includes(a))) score += 1;
    else if (reqRegion && areas.some(a => PREF_REGIONS[a] === reqRegion)) score += 0.5;
  }

  // category match +1
  if (cats.length && req.category){
    if (cats.some(c => c && String(req.category).includes(c))) score += 1;
  }

  // budget: small heuristic (closer to "100万円前後" gives slight boost)
  const b = Number(req.budget_max || 0);
  if (b && b >= 800000 && b <= 1200000) score += 0.2;

  return { score, reqPref, reqRegion };
}

function parseServiceAreas(text){
  const t = String(text||"");
  return t.split(/[、,\n\r\t ]+/).map(s=>s.trim()).filter(Boolean);
}

function parseLocation(text){
  const t = String(text||"");
  // pick explicit prefecture/city tokens
  const m = t.match(/([^\s、,]{2,12}(?:都|道|府|県|市|区|町|村))/);
  if (m) return m[1];
  // infer prefecture from city hints
  for (const row of CITY_TO_PREF){
    for (const c of row.cities){
      if (t.includes(c)) return row.pref;
    }
  }
  return "";
}

function parseNeeds(text){
  const t = String(text||"");
  const keys = ["自社施工","保証","急ぎ","早め","相見積","カード","補助金","夜間","土日"];
  const hits = keys.filter(k => t.includes(k));
  return hits.join(", ");
}

function parseRequestText(text){
  return {
    category: parseCategory(text),
    budget_max: parseBudgetJPY(text),
    location_text: parseLocation(text),
    needs: parseNeeds(text),
  };
}

async function matchMembers({ category = "", budgetMax = 0, locationText = "", needs = "" }){
  // Heuristic matcher (v0.8): DB lookup + simple scoring.
  const membersOnline = Array.from(sessions.values()).filter(s => (s.role || "user") === "member");
  if (!membersOnline.length) return [];
  const uids = Array.from(new Set(membersOnline.map(m => m.userId)));
  const rows = await all(`SELECT u.user_id, u.name, u.member_status, p.company, p.title, p.tags, p.region, p.website,
                                 ms.categories, ms.price_min, ms.price_max
                          FROM users u
                          LEFT JOIN profiles p ON p.user_id=u.user_id
                          LEFT JOIN member_settings ms ON ms.user_id=u.user_id
                          LEFT JOIN users uu ON uu.user_id=u.user_id
                          WHERE u.user_id IN (${uids.map(()=>"?").join(",")});`, uids);
  const cat = String(category||"").toLowerCase();
  const need = String(needs||"").toLowerCase();
  const loc = String(locationText||"").toLowerCase();
  const b = Number(budgetMax)||0;

  const scored = rows.filter(r => String(r.member_status || "approved") !== "suspended").map(r => {
    let score = 0;
    const tags = `${r.tags||""} ${r.categories||""} ${r.title||""} ${r.company||""}`.toLowerCase();
    const region = `${r.region||""}`.toLowerCase();
    if (cat && tags.includes(cat)) score += 4;
    if (need && tags.includes(need)) score += 2;
    if (loc && (region.includes(loc) || loc.includes(region))) score += 2;
    const pmin = Number(r.price_min)||0;
    const pmax = Number(r.price_max)||0;
    if (b && pmax) {
      if (b >= pmin && b <= pmax) score += 4;
      else if (b < pmin) score -= 2;
      else if (b > pmax) score += 1; // could upsell
    } else if (b && (pmin || pmax)) {
      score += 1;
    }
    // small bump if company exists
    if (r.company) score += 1;
    return { userId: r.user_id, name: r.name, company: r.company||"", website: r.website||"", score, member_status: r.member_status||"" };
  }).sort((a,b)=>b.score-a.score);

  return scored.filter(m => !m.member_status || m.member_status === "approved").slice(0, 5);
}


async function ensureNegotiationRoom(requestId){
  const rid = String(requestId||"");
  if (!rid) return "";
  const row = await get(`SELECT room_url FROM negotiations WHERE request_id=? LIMIT 1;`, [rid]);
  if (row && row.room_url) return row.room_url;
  const url = genRoomUrl();
  await run(`INSERT OR REPLACE INTO negotiations(request_id, room_url, created_at) VALUES(?,?,?);`, [rid, url, Date.now()]);
  return url;
}

function genRoomUrl(){
  const slug = ["realia", Date.now().toString(36), Math.random().toString(16).slice(2)].join("-");
  const baseUrl = CALL_BASE_URL;
  return baseUrl.endsWith("/") ? `${baseUrl}${slug}` : `${baseUrl}/${slug}`;
}

io.on("connection", (socket) => {
  // Join with guest name + deviceId (stable user id)
  socket.on("auth:join", async ({ name, deviceId, pin, role }) => {
    let safeName = String(name || "Guest").slice(0, 24);
    const userId = String(deviceId || "").slice(0, 64) || `anon-${socket.id}`;

    // persist user row (upsert)

const existing = await get(`SELECT user_id, name, pin_salt, pin_hash, name_updated_at FROM users WHERE user_id=? LIMIT 1;`, [userId]);
const providedPin = String((arguments?.[0]?.pin ?? "") || "");

// If this user has a PIN set, require it on join (anti-impersonation)
if (existing && existing.pin_hash) {
  if (!pinLooksValid(providedPin)) {
    socket.emit("auth:need_pin", { reason: "pin_required" });
    return;
  }
  const expected = hashPin(providedPin, existing.pin_salt || "");
  if (expected !== existing.pin_hash) {
    socket.emit("auth:need_pin", { reason: "pin_wrong" });
    return;
  }
}

if (!existing) {
  // create user + default profile
  let pin_salt = null;
  let pin_hash = null;
  if (pinLooksValid(providedPin)) {
    pin_salt = randSalt();
    pin_hash = hashPin(providedPin, pin_salt);
  }
  await run(`INSERT INTO users(user_id, name, created_at, pin_salt, pin_hash, name_updated_at, member_status) VALUES(?,?,?,?,?,?,?);`,
    [userId, safeName, Date.now(), pin_salt, pin_hash, Date.now(), (role === "member" ? "pending" : null)]);
  await run(`INSERT OR REPLACE INTO profiles(user_id, company, title, tags, region, website, updated_at) VALUES(?,?,?,?,?,?,?);`,
    [userId, "", "", "", "", "", Date.now()]);
} else {
  // Update name (only if verified or no pin set). Cooldown applies if already had a pin.
  const now = Date.now();
  const last = Number(existing.name_updated_at || 0);
  const canChange = (now - last) >= NAME_CHANGE_COOLDOWN_MS || (existing.pin_hash && pinLooksValid(providedPin));
  const nextName = safeName;
  if (existing.name !== nextName && canChange) {
    await run(`UPDATE users SET name=?, name_updated_at=? WHERE user_id=?;`, [nextName, now, userId]);
  } else {
    // keep stored name for consistency
    safeName = String(existing.name || safeName);
  }

  // If no pin set yet, allow setting it during join (recommended)
  if (!existing.pin_hash && pinLooksValid(providedPin)) {
    const salt = randSalt();
    const h = hashPin(providedPin, salt);
    await run(`UPDATE users SET pin_salt=?, pin_hash=? WHERE user_id=?;`, [salt, h, userId]);
  }
}
const urow = await get(`SELECT member_status FROM users WHERE user_id=? LIMIT 1;`, [userId]);

    const s = {
      socketId: socket.id,
      userId,
      name: safeName,
      x: 50 + Math.random() * 400,
      y: 50 + Math.random() * 220,
      status: "available",
      const resolvedRole = (role === "member" && String(urow?.member_status || "") === "approved") ? "member" : "user";

    const s = {
      socketId: socket.id,
      userId,
      name: safeName,
      status: "available",
      role: resolvedRole,
      memberStatus: String(urow?.member_status || ""),
      lastSeen: Date.now(),
    };
    sessions.set(socket.id, s);
    socketToUser.set(socket.id, userId);
    addUserSocket(userId, socket.id);

    socket.emit("auth:ok", { id: socket.id, userId, name: safeName, role: s.role, memberStatus: s.memberStatus || "", serviceAreas: s.serviceAreas || "", memberCategories: s.memberCategories || "" });
    // send blocked list for this user
    const rows = await all(`SELECT blocked_user_id FROM blocks WHERE user_id=?;`, [userId]);
    socket.emit("block:list", { list: rows.map(r => r.blocked_user_id) });

    await broadcastPresence();
    await broadcastJobs();
  });

  socket.on("presence:update", async ({ x, y, status }) => {
    const s = sessions.get(socket.id);
    if (!s) return;
    s.x = clamp(Number(x) || s.x, 0, 500);
    s.y = clamp(Number(y) || s.y, 0, 300);
    if (status) s.status = String(status);
    s.lastSeen = Date.now();
    sessions.set(socket.id, s);
    await broadcastPresence();
  });

  socket.on("nearby:request", async ({ radius = 70 }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    const r = clamp(Number(radius) || 70, 20, 200);
    const near = Array.from(sessions.values())
      .filter(u => u.socketId !== me.socketId && dist(u, me) <= r)
      .map(u => ({ id: u.socketId, userId: u.userId, name: u.name, x: u.x, y: u.y, status: u.status }));
    socket.emit("nearby:list", { radius: r, nearby: near });
  });

  // Profile update (business card)
  
// Member settings (categories + price range)
socket.on("member:update_settings", async ({ categories = "", priceMin = 0, priceMax = 0 }) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  const cats = String(categories || "").slice(0, 200);
  const pmin = Math.max(0, Number(priceMin) || 0);
  const pmax = Math.max(0, Number(priceMax) || 0);
  await run(`INSERT OR REPLACE INTO member_settings(user_id, categories, price_min, price_max, updated_at) VALUES(?,?,?,?,?);`,
    [me.userId, cats, pmin, pmax, Date.now()]);
  socket.emit("member:ok", { categories: cats, priceMin: pmin, priceMax: pmax });
});

socket.on("member:get_settings", async () => {
  const me = sessions.get(socket.id);
  if (!me) return;
  const row = await get(`SELECT categories, price_min, price_max FROM member_settings WHERE user_id=? LIMIT 1;`, [me.userId]);
  socket.emit("member:settings", row || { categories: "", price_min: 0, price_max: 0 });
});

socket.on("profile:update", async (payload) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    const next = {
      company: String(payload?.company || "").slice(0, 60),
      title: String(payload?.title || "").slice(0, 60),
      tags: String(payload?.tags || "").slice(0, 120),
      region: String(payload?.region || "").slice(0, 60),
      website: String(payload?.website || "").slice(0, 120),
    };
    await run(`INSERT OR REPLACE INTO profiles(user_id, company, title, tags, region, website, updated_at) VALUES(?,?,?,?,?,?,?);`,
      [me.userId, next.company, next.title, next.tags, next.region, next.website, Date.now()]);
    socket.emit("profile:ok", next);
    await broadcastPresence();
  });

  // Block/unblock (by userId)
  socket.on("block:add", async ({ targetUserId }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    const tid = String(targetUserId || "").slice(0, 64);
    if (!tid) return;
    await run(`INSERT OR REPLACE INTO blocks(user_id, blocked_user_id, created_at) VALUES(?,?,?);`, [me.userId, tid, Date.now()]);
    const rows = await all(`SELECT blocked_user_id FROM blocks WHERE user_id=?;`, [me.userId]);
    socket.emit("block:list", { list: rows.map(r => r.blocked_user_id) });
  });

  socket.on("block:remove", async ({ targetUserId }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    const tid = String(targetUserId || "").slice(0, 64);
    if (!tid) return;
    await run(`DELETE FROM blocks WHERE user_id=? AND blocked_user_id=?;`, [me.userId, tid]);
    const rows = await all(`SELECT blocked_user_id FROM blocks WHERE user_id=?;`, [me.userId]);
    socket.emit("block:list", { list: rows.map(r => r.blocked_user_id) });
  });

  // Reporting
  socket.on("report:send", async ({ targetUserId, reason = "abuse", context = "", detail = "" }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    const tid = String(targetUserId || "").slice(0, 64);
    if (!tid) return;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await run(`INSERT INTO reports(report_id, from_user_id, target_user_id, reason, context, detail, ts, status)
              VALUES(?,?,?,?,?,?,?,?);`,
      [id, me.userId, tid, String(reason).slice(0,40), String(context).slice(0,80), String(detail).slice(0,800), Date.now(), "open"]);
    socket.emit("report:ok", { ok: true, id });
  });

  // Area chat (rate limited)
  socket.on("area:send", async ({ area = "commerce", text }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    if (!allowRate(me.userId, "area", 10, 10_000)) { socket.emit("error:toast", { message: "投稿が速すぎます。少し待ってください。" }); return; }
    const msg = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: "area",
      area: String(area).slice(0, 32),
      from: { id: me.socketId, userId: me.userId, name: me.name },
      text: String(text || "").slice(0, 1000),
      ts: Date.now(),
    };
    io.emit("area:message", msg);
  });

  // DM (rate + block)
  socket.on("dm:send", async ({ to, text }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    if (!allowRate(me.userId, "dm", 8, 10_000)) { socket.emit("error:toast", { message: "DMが速すぎます。少し待ってください。" }); return; }

    const toSocketId = String(to || "");
    if (!toSocketId) return;
    const toUserId = socketToUser.get(toSocketId) || "";

    if (toUserId && await isBlockedByUserIds(me.userId, toUserId)) {
      socket.emit("error:toast", { message: "ブロック設定により送信できません。" });
      return;
    }

    const msg = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: "dm",
      from: { id: me.socketId, userId: me.userId, name: me.name },
      to: toSocketId,
      text: String(text || "").slice(0, 1000),
      ts: Date.now(),
    };
    socket.emit("dm:message", msg);
    io.to(toSocketId).emit("dm:message", msg);
  });

  // Partner request (stored in DB; delivered to all active sockets of target user)
  socket.on("partner:request", async ({ toUserId, note }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    if (!allowRate(me.userId, "partner", 4, 60_000)) { socket.emit("error:toast", { message: "提携申請が多すぎます。1分ほど待ってください。" }); return; }

    const tid = String(toUserId || "").slice(0, 64);
    if (!tid) return;
    if (await isBlockedByUserIds(me.userId, tid)) {
      socket.emit("error:toast", { message: "ブロック設定により送信できません。" });
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await run(`INSERT INTO partner_requests(request_id, from_user_id, from_name, to_user_id, note, ts)
              VALUES(?,?,?,?,?,?);`,
      [id, me.userId, me.name, tid, String(note || "").slice(0,800), Date.now()]);

    const payload = {
      id,
      kind: "partner",
      from: { userId: me.userId, name: me.name },
      toUserId: tid,
      note: String(note || "").slice(0,800),
      ts: Date.now(),
    };
    socket.emit("partner:request", payload);

    const sockets = userSockets.get(tid);
    if (sockets) {
      for (const sid of sockets) io.to(sid).emit("partner:request", payload);
    }
  });

  socket.on("partner:inbox", async () => {
    const me = sessions.get(socket.id);
    if (!me) return;
    const list = await all(`SELECT * FROM partner_requests WHERE to_user_id=? ORDER BY ts DESC LIMIT 50;`, [me.userId]);
    socket.emit("partner:inbox", list);
  });

  

// Notifications (offline inbox)
socket.on("notif:list", async () => {
  const me = sessions.get(socket.id);
  if (!me) return;
  const rows = await all(`SELECT notif_id, kind, payload, ts, read FROM notifications WHERE user_id=? ORDER BY ts DESC LIMIT 100;`, [me.userId]);
  const list = rows.map(r => ({ ...r, payload: safeParseJSON(r.payload, {}) }));
  socket.emit("notif:list", list);
});

socket.on("notif:read", async ({ id }) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  const nid = String(id||"");
  if (!nid) return;
  await run(`UPDATE notifications SET read=1 WHERE notif_id=? AND user_id=?;`, [nid, me.userId]);
});


// Negotiation room (fixed per request)
socket.on("negotiation:get", async ({ requestId }) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  const rid = String(requestId || "");
  if (!rid) return;
  const req = await get(`SELECT requester_user_id FROM requests WHERE request_id=? LIMIT 1;`, [rid]);
  if (!req) return;

  // allow requester or any member who has sent proposal for this request
  if (req.requester_user_id !== me.userId) {
    const p = await get(`SELECT 1 FROM proposals WHERE request_id=? AND from_user_id=? LIMIT 1;`, [rid, me.userId]);
    if (!p) { socket.emit("error:toast", { message: "権限がありません" }); return; }
  }
  const url = await ensureNegotiationRoom(rid);
  socket.emit("negotiation:room", { requestId: rid, url });
});

// Member application (user -> apply, admin -> approve)
socket.on("member:apply", async ({ company="", phone="", categories="", region="" }) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const payload = {
    app_id: id,
    user_id: me.userId,
    name: me.name,
    company: String(company||"").slice(0, 80),
    phone: String(phone||"").slice(0, 40),
    categories: String(categories||"").slice(0, 200),
    region: String(region||"").slice(0, 80),
    ts: Date.now(),
    status: "pending",
  };
  await run(`INSERT INTO member_applications(app_id, user_id, name, company, phone, categories, region, ts, status)
            VALUES(?,?,?,?,?,?,?,?,?);`,
    [payload.app_id, payload.user_id, payload.name, payload.company, payload.phone, payload.categories, payload.region, payload.ts, payload.status]);

  // mark user as pending member
  await run(`UPDATE users SET member_status='pending' WHERE user_id=?;`, [me.userId]);
  me.memberStatus = "pending";
  sessions.set(socket.id, me);

  await pushNotif(me.userId, "member_apply", payload);
  socket.emit("member:apply_ok", payload);
  await broadcastPresence();
});



// Member dashboard stats (self)
socket.on("member:stats", async () => {
  const me = sessions.get(socket.id);
  if (!me) return;

  const rows = await all(`SELECT status, COUNT(*) as c FROM proposals WHERE from_user_id=? GROUP BY status;`, [me.userId]);
  const by = {};
  for (const r of rows) by[String(r.status||"sent")] = Number(r.c||0);
  const total = Object.values(by).reduce((a,b)=>a+b,0);
  const accepted = by["accepted"] || 0;
  const rate = total ? (accepted/total) : 0;

  const catRows = await all(`
    SELECT COALESCE(r.category,'(none)') as category,
           COUNT(*) as total,
           SUM(CASE WHEN p.status='accepted' THEN 1 ELSE 0 END) as accepted
    FROM proposals p
    LEFT JOIN requests r ON r.request_id=p.request_id
    WHERE p.from_user_id=?
    GROUP BY COALESCE(r.category,'(none)')
    ORDER BY total DESC
    LIMIT 10;
  `, [me.userId]);

  const byCategory = catRows.map(x => ({
    category: x.category,
    total: Number(x.total||0),
    accepted: Number(x.accepted||0),
    rate: (Number(x.total||0) ? (Number(x.accepted||0)/Number(x.total||0)) : 0),
  }));

  socket.emit("member:stats", { total, accepted, by, rate, byCategory });
});

// --- Requests (General user -> AI match -> members propose) ---
socket.on("request:create", async ({ text, category = "", budgetMax = 0, locationText = "", needs = "" }) => {
  const me = sessions.get(socket.id);
  if (!me) return;

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const payload = {
    request_id: id,
    requester_user_id: me.userId,
    requester_name: me.name,
    text: String(text||"").slice(0, 1200),
    category: String(category||"").slice(0, 60),
    budget_max: Number(budgetMax)||0,
    location_text: String(locationText||"").slice(0, 80),
    needs: String(needs||"").slice(0, 200),
    ts: Date.now(),
    status: "open",
  };
  if (!payload.text.trim()) return;

  await run(`INSERT INTO requests(request_id, requester_user_id, requester_name, text, category, budget_max, location_text, needs, ts, status)
            VALUES(?,?,?,?,?,?,?,?,?,?);`,
    [payload.request_id, payload.requester_user_id, payload.requester_name, payload.text, payload.category, payload.budget_max,
     payload.location_text, payload.needs, payload.ts, payload.status]);

  socket.emit("request:ok", payload);

// Auto-pickup: notify top members based on area/category score
try {
  const members = await all(`SELECT user_id, name, service_areas, member_categories FROM users WHERE member_status='approved' LIMIT 2000;`);
  const scored = members.map(m => {
    const s = scoreMemberForRequest(m, r);
    return { user_id: m.user_id, name: m.name, score: s.score, pref: s.reqPref, category: r.category };
  }).filter(x => x.score > 0).sort((a,b)=>b.score-a.score).slice(0, 5);

// store exclusive window for top2 (if any)
const top2 = scored.slice(0,2).map(x => x.user_id);
const exclusive_until_global = top2.length ? (Date.now() + 10*60*1000) : 0;
if (exclusive_until_global) {
  await run(`INSERT OR REPLACE INTO lead_locks(request_id, exclusive_until, allowed_user_ids, ts) VALUES(?,?,?,?);`,
    [r.request_id, exclusive_until_global, JSON.stringify(top2), Date.now()]);
}

  for (const c of scored){
    await pushNotif(c.user_id, "lead_candidate", {
      request_id: r.request_id,
      requester_name: r.requester_name,
      category: r.category,
      location_text: r.location_text,
      budget_max: r.budget_max,
      score: c.score,
          priority_rank: i+1,
          exclusive_until,
      ts: Date.now()
    });
  }
} catch (e) {
  console.log("auto-pickup failed", e?.message || e);
}

  // match and notify members
  const matches = await matchMembers({ category: payload.category, budgetMax: payload.budget_max, locationText: payload.location_text, needs: payload.needs });
  for (const m of matches) {
    const sockets = userSockets.get(m.userId);
    if (sockets) {
      for (const sid of sockets) io.to(sid).emit("request:notify", { request: payload, matchScore: m.score });
    }
  }
});

socket.on("request:list", async ({ mine = false } = {}) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  if (mine) {
    const list = await all(`SELECT * FROM requests WHERE requester_user_id=? ORDER BY ts DESC LIMIT 50;`, [me.userId]);
    socket.emit("request:list", list);
    return;
  }
  // member view: latest open
  if ((me.role || "user") !== "member") { socket.emit("error:toast", { message: "加盟店のみ閲覧できます" }); return; }
  const list = await all(`SELECT * FROM requests WHERE status='open' ORDER BY ts DESC LIMIT 50;`);
  socket.emit("request:list", list);
});

socket.on("proposal:send", async ({ requestId, message = "" }) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  if ((me.role || "user") !== "member") { socket.emit("error:toast", { message: "加盟店のみ提案できます" }); return; }
    if (String(me.memberStatus || "") !== "approved") { socket.emit("error:toast", { message: "加盟店が未承認です（運営の承認待ち）" }); return; }
  const req = await get(`SELECT requester_user_id, requester_name, text, category, budget_max, location_text, needs FROM requests WHERE request_id=? LIMIT 1;`, [String(requestId)]);
  if (!req) return;

  
// exclusive lead lock check (top2 priority window)
try {
  const lock = await get(`SELECT exclusive_until, allowed_user_ids FROM lead_locks WHERE request_id=? LIMIT 1;`, [String(requestId)]);
  if (lock && Number(lock.exclusive_until||0) > Date.now()) {
    let allowed = [];
    try { allowed = JSON.parse(String(lock.allowed_user_ids||"[]")); } catch(e) { allowed = []; }
    if (Array.isArray(allowed) && allowed.length && !allowed.includes(me.userId)) {
      socket.emit("proposal:blocked", { requestId: String(requestId), exclusive_until: Number(lock.exclusive_until||0) });
      socket.emit("error:toast", { message: `優先枠のため、提案できません（${new Date(Number(lock.exclusive_until||0)).toLocaleString()}まで）` });
      return;
    }
  }
} catch (e) {
  // ignore
}

// block check
  if (await isBlockedByUserIds(me.userId, req.requester_user_id)) {
    socket.emit("error:toast", { message: "ブロック設定により送信できません。" });
    return;
  }

  const pid = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const msg = String(message||"").slice(0, 1200) || `【ご提案】${req.category || "ご相談"}について、詳細を伺ってお見積り可能です。REALIA上で通話/チャットいかがでしょうか？`;

  await run(`INSERT INTO proposals(proposal_id, request_id, from_user_id, from_name, to_user_id, message, ts)
            VALUES(?,?,?,?,?,?,?);`,
    [pid, String(requestId), me.userId, me.name, req.requester_user_id, msg, Date.now(), "sent"]);

  const payload = { proposal_id: pid, request_id: requestId, from_user_id: me.userId, from_name: me.name, to_user_id: req.requester_user_id, message: msg, ts: Date.now(), status: "sent" };
  socket.emit("proposal:ok", payload);

  // Notify requester (all active sockets)
  const sockets = userSockets.get(req.requester_user_id);
  if (sockets) {
    for (const sid of sockets) io.to(sid).emit("proposal:notify", payload);
  }
});


// Proposals list
socket.on("proposal:list", async ({ mine = true, requestId = "" } = {}) => {
  const me = sessions.get(socket.id);
  if (!me) return;

  if (mine) {
    const rows = await all(`SELECT * FROM proposals WHERE to_user_id=? ORDER BY ts DESC LIMIT 100;`, [me.userId]);
    socket.emit("proposal:list", rows);
    return;
  }

  // member: see proposals sent by me (optionally per request)
  if ((me.role || "user") !== "member") { socket.emit("error:toast", { message: "加盟店のみ閲覧できます" }); return; }
  if (requestId) {
    const rows = await all(`SELECT * FROM proposals WHERE from_user_id=? AND request_id=? ORDER BY ts DESC LIMIT 100;`, [me.userId, String(requestId)]);
    socket.emit("proposal:list", rows);
    return;
  }
  const rows = await all(`SELECT * FROM proposals WHERE from_user_id=? ORDER BY ts DESC LIMIT 100;`, [me.userId]);
  socket.emit("proposal:list", rows);
});

// Request status management (requester)
socket.on("request:close", async ({ requestId, status = "closed" }) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  const rid = String(requestId || "");
  const req = await get(`SELECT requester_user_id, status FROM requests WHERE request_id=? LIMIT 1;`, [rid]);
  if (!req) return;
  if (req.requester_user_id !== me.userId) return;
  const st = ["closed", "cancelled"].includes(String(status)) ? String(status) : "closed";
  await run(`UPDATE requests SET status=? WHERE request_id=?;`, [st, rid]);
  socket.emit("request:status", { request_id: rid, status: st });
});

// Accept/reject proposal (requester)
socket.on("proposal:respond", async ({ proposalId, action }) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  const pid = String(proposalId || "");
  const prop = await get(`SELECT proposal_id, request_id, from_user_id, to_user_id, status FROM proposals WHERE proposal_id=? LIMIT 1;`, [pid]);
  if (!prop) return;
  if (prop.to_user_id !== me.userId) return;

  const req = await get(`SELECT requester_user_id, status FROM requests WHERE request_id=? LIMIT 1;`, [prop.request_id]);
  if (!req || req.requester_user_id !== me.userId) return;

  if (String(action) === "accept") {
    // mark accepted; request becomes negotiating
    await run(`UPDATE proposals SET status='accepted' WHERE proposal_id=?;`, [pid]);
    await run(`UPDATE requests SET status='negotiating', selected_proposal_id=? WHERE request_id=?;`, [pid, prop.request_id]);
    // reject others for that request (optional)
    await run(`UPDATE proposals SET status='rejected' WHERE request_id=? AND proposal_id<>? AND to_user_id=?;`, [prop.request_id, pid, me.userId]);
    socket.emit("proposal:status", { proposal_id: pid, status: "accepted", request_id: prop.request_id });
    socket.emit("request:status", { request_id: prop.request_id, status: "negotiating", selected_proposal_id: pid });

    // notify member
    const sockets = userSockets.get(prop.from_user_id);
    if (sockets) for (const sid of sockets) io.to(sid).emit("proposal:status", { proposal_id: pid, status: "accepted", request_id: prop.request_id });
    return;
  }

  if (String(action) === "reject") {
    await run(`UPDATE proposals SET status='rejected' WHERE proposal_id=?;`, [pid]);
    socket.emit("proposal:status", { proposal_id: pid, status: "rejected", request_id: prop.request_id });
    const sockets = userSockets.get(prop.from_user_id);
    if (sockets) for (const sid of sockets) io.to(sid).emit("proposal:status", { proposal_id: pid, status: "rejected", request_id: prop.request_id });
    return;
  }
});

// Mark as won/lost (member)
socket.on("request:mark_result", async ({ requestId, result }) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  if ((me.role || "user") !== "member") return;

  const rid = String(requestId || "");
  const req = await get(`SELECT request_id, selected_proposal_id, status FROM requests WHERE request_id=? LIMIT 1;`, [rid]);
  if (!req) return;

  // member can only mark result if they were selected
  if (!req.selected_proposal_id) return;
  const prop = await get(`SELECT proposal_id, from_user_id, to_user_id FROM proposals WHERE proposal_id=? LIMIT 1;`, [req.selected_proposal_id]);
  if (!prop || prop.from_user_id !== me.userId) return;

  const st = (String(result) === "won") ? "won" : (String(result) === "lost") ? "lost" : "";
  if (!st) return;

  await run(`UPDATE requests SET status=? WHERE request_id=?;`, [st, rid]);
  socket.emit("request:status", { request_id: rid, status: st });

  // notify requester
  const sockets = userSockets.get(prop.to_user_id);
  if (sockets) for (const sid of sockets) io.to(sid).emit("request:status", { request_id: rid, status: st });
});

// Jobs
  socket.on("job:create", async ({ title, detail, budget, tags }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await run(`INSERT INTO jobs(job_id, owner_user_id, owner_name, title, detail, budget, tags, ts)
              VALUES(?,?,?,?,?,?,?,?);`,
      [id, me.userId, me.name, String(title||"").slice(0,80), String(detail||"").slice(0,1200), String(budget||"").slice(0,40), String(tags||"").slice(0,120), Date.now()]);
    await broadcastJobs();
  });

  socket.on("job:delete", async ({ id }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    const job = await get(`SELECT owner_user_id FROM jobs WHERE job_id=?;`, [String(id)]);
    if (!job) return;
    if (job.owner_user_id !== me.userId) return;
    await run(`DELETE FROM jobs WHERE job_id=?;`, [String(id)]);
    await broadcastJobs();
  });

  socket.on("job:request_list", async () => {
    await broadcastJobs();
  });

  // Call room (Phase1): external URL
  socket.on("call:create", ({ to, context = "dm" }) => {
    const me = sessions.get(socket.id);
    if (!me) return;
    const toSocketId = String(to || "");
    if (!toSocketId) return;

    const url = genRoomUrl();
    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: "call",
      context,
      from: { id: me.socketId, userId: me.userId, name: me.name },
      to: toSocketId,
      url,
      ts: Date.now(),
    };
    socket.emit("call:room", payload);
    io.to(toSocketId).emit("call:room", payload);
  });

  
// Name update (requires PIN if set; cooldown enforced)
socket.on("name:update", async ({ name, pin }) => {
  const me = sessions.get(socket.id);
  if (!me) return;
  const nextName = String(name || "").slice(0, 24) || me.name;
  const row = await get(`SELECT pin_salt, pin_hash, name_updated_at FROM users WHERE user_id=? LIMIT 1;`, [me.userId]);
  const hasPin = !!(row && row.pin_hash);
  const providedPin = String(pin || "");

  if (hasPin) {
    if (!pinLooksValid(providedPin)) { socket.emit("error:toast", { message: "PINが必要です" }); return; }
    const expected = hashPin(providedPin, row.pin_salt || "");
    if (expected !== row.pin_hash) { socket.emit("error:toast", { message: "PINが違います" }); return; }
  }

  const now = Date.now();
  const last = Number(row?.name_updated_at || 0);
  if ((now - last) < NAME_CHANGE_COOLDOWN_MS) {
    socket.emit("error:toast", { message: "表示名の変更は時間をおいてください" });
    return;
  }

  await run(`UPDATE users SET name=?, name_updated_at=? WHERE user_id=?;`, [nextName, now, me.userId]);
  me.name = nextName;
  sessions.set(socket.id, me);
  socket.emit("name:ok", { name: nextName });
  await broadcastPresence();
});

socket.on("disconnect", async () => {
    const me = sessions.get(socket.id);
    sessions.delete(socket.id);
    socketToUser.delete(socket.id);
    if (me) removeUserSocket(me.userId, socket.id);
    await broadcastPresence();
  });
});

server.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] CLIENT_ORIGIN=${CLIENT_ORIGIN}`);
  console.log(`[backend] DB_FILE=${DB_FILE}`);
});
