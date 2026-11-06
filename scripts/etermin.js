#!/usr/bin/env node
/**
 * Minimal eTermin API client (CLI) – used by Claude Code to read/manage the
 * eTermin account (appointments, calendars, services, absences, vouchers, …).
 *
 * API reference: https://app.swaggerhub.com/apis-docs/etermin.net/eTermin-API/
 * Overview:      https://www.etermin.net/online-terminplaner-api
 *
 * Credentials (eTermin → Einstellungen → Integration → API):
 *   ETERMIN_PUBLIC_KEY  – "publickey"
 *   ETERMIN_SECRET_KEY  – secret key, used to sign each request
 * Read from the environment or from `.env.etermin` in the repo root (gitignored).
 *
 * Usage:
 *   node scripts/etermin.js <METHOD> <resource> [key=value ...] [--yes]
 *
 * Examples:
 *   node scripts/etermin.js GET calendar
 *   node scripts/etermin.js GET appointment start=2026-10-01 end=2026-10-31
 *   node scripts/etermin.js GET timeslots date=2026-10-05 serviceid=123 calendarid=456
 *   node scripts/etermin.js POST calendarsnonworkingtimes appcalendarid=456 \
 *        startdate="2026-12-24 00:00" enddate="2026-12-26 23:59" reason=Urlaub --yes
 *
 * Safety: POST/PUT/DELETE only print the request (dry run) unless `--yes` is given.
 */

const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");

const BASE_URL = "https://www.etermin.net/api/";
const ENV_FILE = path.join(__dirname, "..", ".env.etermin");

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return;
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// signature = base64(HMAC-SHA256(key = secret key, message = salt))
function authHeaders(publicKey, secretKey) {
  const salt      = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", secretKey).update(salt).digest("base64");
  return { publickey: publicKey, salt, signature };
}

function usage(code) {
  console.error("Usage: node scripts/etermin.js <GET|POST|PUT|DELETE> <resource> [key=value ...] [--yes]");
  process.exit(code);
}

async function main() {
  const args    = process.argv.slice(2);
  const confirm = args.includes("--yes");
  const rest    = args.filter((a) => a !== "--yes");
  if (rest.length < 2 || rest[0] === "-h" || rest[0] === "--help") usage(rest.length < 2 ? 1 : 0);

  const method   = rest[0].toUpperCase();
  const resource = rest[1].replace(/^\/?(api\/)?/, "");
  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) usage(1);

  const params = new URLSearchParams();
  for (const kv of rest.slice(2)) {
    const i = kv.indexOf("=");
    if (i < 1) { console.error(`Invalid parameter "${kv}" (expected key=value)`); process.exit(1); }
    params.append(kv.slice(0, i), kv.slice(i + 1));
  }

  const query = params.toString();
  const url   = BASE_URL + resource + (query ? `?${query}` : "");

  if (method !== "GET" && !confirm) {
    console.log(`[dry run] ${method} ${url}`);
    console.log("Re-run with --yes to send this request.");
    return;
  }

  loadEnvFile();
  const { ETERMIN_PUBLIC_KEY, ETERMIN_SECRET_KEY } = process.env;
  if (!ETERMIN_PUBLIC_KEY || !ETERMIN_SECRET_KEY) {
    console.error("Missing ETERMIN_PUBLIC_KEY / ETERMIN_SECRET_KEY (env or .env.etermin).");
    process.exit(1);
  }

  const res = await fetch(url, {
    method,
    headers: { ...authHeaders(ETERMIN_PUBLIC_KEY, ETERMIN_SECRET_KEY), accept: "application/json" },
  });
  const text = await res.text();
  let out = text;
  try { out = JSON.stringify(JSON.parse(text), null, 2); } catch {}
  console.log(out);
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
