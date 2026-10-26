// GamerVault static site builder.
// Reads content/ (site.json, games.json, articles/*.md) and writes a complete static site to dist/.
// Run: npm run build
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { marked } from "marked";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, "dist");
// Works with the folder layout (content/, src/) or with every file uploaded flat at the top level.
const find = (...cands) => cands.map((c) => path.join(ROOT, c)).find((c) => fs.existsSync(c)) || path.join(ROOT, cands[0]);
const read = (p) => fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p), "utf8");
const site = JSON.parse(read(find("content/site.json", "site.json")));
const { categories, games } = JSON.parse(read(find("content/games.json", "games.json")));
const ARTICLE_DIR = fs.existsSync(path.join(ROOT, "content/articles")) ? path.join(ROOT, "content/articles") : ROOT;
const ink = site.inkling;
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------------- helpers ---------------- */
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const fmtDate = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const write = (rel, html) => { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); };

/* ---------------- icons ---------------- */
const I = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  coins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  game: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3M16 12h.01M18 14h.01"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>',
  handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12l4-4 4 2 3-2 7 5"/><path d="M7 14l3 3 2-1 2 2 4-3"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6a4 4 0 0 0-5 5L4 17l3 3 6-6a4 4 0 0 0 5-5l-3 3-3-3z"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 10v4h4l8 5V5L7 10z"/><path d="M19 9a4 4 0 0 1 0 6"/></svg>',
  lang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 4-3 7-7 9"/><path d="M13 21l4-9 4 9M14.5 18h5"/></svg>',
};

/* ---------------- generated art (no third-party assets) ---------------- */
const GENRE_STYLE = {
  "Kids & Family": ["#3b2a6b", "#ffcf5a", "#7ee0c3"],
  "Casual": ["#1d3a4f", "#c6ef3a", "#7fc8ff"],
  "Puzzle": ["#24314f", "#c6ef3a", "#ff9e7a"],
  "Strategy": ["#2b2f1f", "#c6ef3a", "#e9d8a6"],
  "Simulation": ["#1f3a33", "#9be37a", "#ffd166"],
  "Adventure": ["#3a2a1f", "#ffb36b", "#c6ef3a"],
  "Action": ["#2a1630", "#ff5d8f", "#c6ef3a"],
  "Story & Romance": ["#3a1f2e", "#ff9ec4", "#ffe3a3"],
  "Multiplayer": ["#16304a", "#5ad1ff", "#c6ef3a"],
};
function gameArt(game, w = 400, h = 250, opts = {}) {
  const [bg, a, b] = GENRE_STYLE[game.genre] || ["#1c1f23", "#c6ef3a", "#7fc8ff"];
  const r = rng(hash(game.slug));
  let s = "";
  const g = game.genre;
  if (g === "Puzzle" || g === "Casual") {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) {
      if (r() < 0.55) continue;
      const c = r() < 0.5 ? a : b;
      s += `<rect x="${x * 48 + 8}" y="${y * 52 + 6}" width="38" height="38" rx="10" fill="${c}" opacity="${(0.25 + r() * 0.7).toFixed(2)}"/>`;
    }
  } else if (g === "Strategy") {
    for (let y = 0; y < 6; y++) for (let x = 0; x < 9; x++) {
      const cx = x * 50 + (y % 2) * 25, cy = y * 44;
      const pts = [0, 1, 2, 3, 4, 5].map((k) => { const an = Math.PI / 3 * k + Math.PI / 6; return `${(cx + 24 * Math.cos(an)).toFixed(1)},${(cy + 24 * Math.sin(an)).toFixed(1)}`; }).join(" ");
      s += `<polygon points="${pts}" fill="${r() < 0.18 ? a : "none"}" stroke="${b}" stroke-opacity=".35" stroke-width="2" opacity="${r() < 0.18 ? 0.85 : 1}"/>`;
    }
  } else if (g === "Simulation") {
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = 60 + r() * (h - 40), hh = 30 + r() * 90, ww = 30 + r() * 40;
      s += `<rect x="${x.toFixed(0)}" y="${(y - hh).toFixed(0)}" width="${ww.toFixed(0)}" height="${hh.toFixed(0)}" rx="6" fill="${r() < 0.3 ? a : b}" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
    }
  } else if (g === "Adventure") {
    for (let l = 0; l < 4; l++) {
      let d = `M0 ${h}`; const base = h * (0.45 + l * 0.14);
      for (let x = 0; x <= w; x += 40) d += ` L${x} ${(base - r() * 70 + l * 8).toFixed(0)}`;
      d += ` L${w} ${h} Z`;
      s += `<path d="${d}" fill="${l === 0 ? b : a}" opacity="${(0.25 + l * 0.18).toFixed(2)}"/>`;
    }
    s += `<circle cx="${w * 0.75}" cy="${h * 0.25}" r="26" fill="${b}"/>`;
  } else if (g === "Action") {
    for (let i = 0; i < 16; i++) {
      const y = r() * h, x = r() * w * 0.6, len = 80 + r() * 220;
      s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l${len.toFixed(0)} ${(-len * 0.35).toFixed(0)}" stroke="${r() < 0.5 ? a : b}" stroke-width="${(2 + r() * 8).toFixed(1)}" stroke-linecap="round" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`;
    }
  } else if (g === "Story & Romance") {
    for (let i = 0; i < 10; i++) s += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(10 + r() * 60).toFixed(0)}" fill="${r() < 0.5 ? a : b}" opacity="${(0.12 + r() * 0.35).toFixed(2)}"/>`;
    s += `<circle cx="${w * 0.7}" cy="${h * 0.38}" r="40" fill="${b}"/><circle cx="${w * 0.7 + 16}" cy="${h * 0.38 - 8}" r="36" fill="${bg}"/>`;
  } else if (g === "Multiplayer") {
    s += `<circle cx="${w * 0.4}" cy="${h * 0.55}" r="70" fill="${a}" opacity=".55"/><circle cx="${w * 0.6}" cy="${h * 0.5}" r="70" fill="${b}" opacity=".55"/>`;
    for (let i = 0; i < 18; i++) s += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(2 + r() * 4).toFixed(1)}" fill="#fff" opacity=".5"/>`;
  } else {
    for (let i = 0; i < 14; i++) s += `<circle cx="${(r() * w).toFixed(0)}" cy="${(h - r() * h * 0.9).toFixed(0)}" r="${(12 + r() * 34).toFixed(0)}" fill="${r() < 0.5 ? a : b}" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
  }
  const initials = game.title.split(/\s+/).map((x) => x[0]).join("").slice(0, 2);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Generated cover art for ${esc(game.title)}"><rect width="${w}" height="${h}" fill="${bg}"/>${s}<rect width="${w}" height="${h}" fill="url(#vg-${game.slug})"/><defs><linearGradient id="vg-${game.slug}" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="${bg}" stop-opacity="0"/><stop offset="1" stop-color="#0d0e10" stop-opacity=".75"/></linearGradient></defs>${opts.initials === false ? "" : `<text x="20" y="${h - 22}" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="46" fill="#fff" opacity=".92">${esc(initials)}</text>`}</svg>`;
}
function inklingArt(w = 520, h = 260, label = "Inkling cover art (placeholder)") {
  if (ink.cover) return `<img src="${esc(ink.cover)}" alt="Inkling artwork">`;
  let lines = "";
  for (let y = 34; y < h; y += 26) lines += `<path d="M0 ${y}H${w}" stroke="#2b3036" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">
<rect width="${w}" height="${h}" fill="#121417"/>${lines}
<path d="M62 0V${h}" stroke="#ff7a7a" stroke-opacity=".45" stroke-width="2"/>
<circle cx="${w - 70}" cy="60" r="90" fill="#c6ef3a" opacity=".08"/>
<path d="M96 ${h * 0.62} C 130 ${h * 0.2}, 150 ${h * 0.85}, 186 ${h * 0.5} S 240 ${h * 0.25}, 262 ${h * 0.55} S 320 ${h * 0.75}, 352 ${h * 0.42} S 410 ${h * 0.3}, 440 ${h * 0.5}" fill="none" stroke="#c6ef3a" stroke-width="5" stroke-linecap="round" stroke-dasharray="520" stroke-dashoffset="0"/>
<text x="88" y="${h * 0.3}" font-family="Caveat, 'Segoe Print', 'Bradley Hand', cursive" font-size="${Math.round(w / 15)}" fill="#f3f4f0" opacity=".9" transform="rotate(-4 88 ${h * 0.3})">taking shape...</text>
<g transform="translate(${w - 120} ${h - 64}) rotate(-28)"><rect width="110" height="14" rx="7" fill="#c6ef3a"/><path d="M110 0 l18 7 -18 7z" fill="#f3f4f0"/></g>
</svg>`;
}
const ARTICLE_STYLE = {
  "India Gaming Market": ["#17201a", "#c6ef3a"], "Publishing & Distribution": ["#1a1d26", "#7fc8ff"], "Game Localisation": ["#231a20", "#ff9ec4"],
  "Mobile Gaming": ["#1a2320", "#7ee0c3"], "Game Monetisation": ["#23211a", "#ffcf5a"], "Player Behaviour": ["#201a26", "#b79bff"],
  "Game Development": ["#1a2126", "#5ad1ff"], "International Expansion": ["#1d1f17", "#c6ef3a"], "Gaming Regulations": ["#26201a", "#ffb36b"],
};
function articleArt(a, w = 640, h = 360) {
  const [bg, c] = ARTICLE_STYLE[a.category] || ["#1c1f23", "#c6ef3a"];
  const r = rng(hash(a.slug));
  let s = "";
  const variant = hash(a.slug) % 3;
  if (variant === 0) {
    const n = 12; for (let i = 0; i < n; i++) { const bh = 30 + r() * 220; s += `<rect x="${60 + i * 44}" y="${h - 40 - bh}" width="26" height="${bh.toFixed(0)}" rx="5" fill="${c}" opacity="${(0.2 + (i / n) * 0.75).toFixed(2)}"/>`; }
  } else if (variant === 1) {
    for (let k = 0; k < 6; k++) { let d = ""; for (let x = 0; x <= w; x += 20) { const y = h * 0.5 + Math.sin(x / 70 + k) * (30 + k * 10) + (k - 3) * 22; d += (x ? "L" : "M") + x + " " + y.toFixed(1); } s += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${k === 2 ? 4 : 1.5}" opacity="${k === 2 ? 1 : 0.35}"/>`; }
  } else {
    for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h; s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2 + r() * 5).toFixed(1)}" fill="${c}" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`; if (r() < 0.35) s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} L${(r() * w).toFixed(0)} ${(r() * h).toFixed(0)}" stroke="${c}" stroke-opacity=".18"/>`; }
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Abstract cover for ${esc(a.title)}"><rect width="${w}" height="${h}" fill="${bg}"/><g>${s}</g><circle cx="${w - 60}" cy="60" r="140" fill="${c}" opacity=".07"/></svg>`;
}
const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="11" fill="#c6ef3a"/><circle cx="20" cy="20" r="11.5" fill="none" stroke="#0d0e10" stroke-width="3"/><path d="M17 14.5l7.5 5.5-7.5 5.5z" fill="#0d0e10"/><path d="M20 3.5v4M20 32.5v4M3.5 20h4M32.5 20h4" stroke="#0d0e10" stroke-width="2.6" stroke-linecap="round"/></svg>`;

/* ---------------- articles ---------------- */
marked.use({
  gfm: true,
  renderer: {
    heading(text, depth, raw) { const id = slugify(raw); return `<h${depth} id="${id}">${text}</h${depth}>\n`; },
    table(header, body) { return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`; },
    listitem(text, task) { return task ? `<li class="task-list-item">${text}</li>\n` : `<li>${text}</li>\n`; },
    checkbox() { return `<input type="checkbox" aria-label="Checklist item">`; },
    link(href, title, text) { const ext = /^https?:/.test(href || ""); return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`; },
  },
});
const allArticles = fs.readdirSync(ARTICLE_DIR).filter((f) => f.endsWith(".md") && f !== "README.md" && /^---\n/.test(read(path.join(ARTICLE_DIR, f)))).map((f) => {
  const raw = read(path.join(ARTICLE_DIR, f));
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm = yaml.load(m[1]);
  const body = m[2].trim();
  const words = body.split(/\s+/).length;
  let html = marked.parse(body).replace(/<ul>\n<li class="task-list-item">/g, '<ul class="contains-task-list">\n<li class="task-list-item">');
  const toc = [...body.matchAll(/^## (.+)$/gm)].map((x) => ({ text: x[1].replace(/[*_`]/g, ""), id: slugify(x[1]) }));
  return { ...fm, date: (fm.date instanceof Date ? fm.date.toISOString() : String(fm.date)).slice(0, 10), body, html, toc, readMinutes: Math.max(3, Math.round(words / 220)), sources: fm.sources || [], tags: fm.tags || [] };
});
const FEATURED_ARTICLE = "indian-gaming-market-guide";
const articles = allArticles.filter((a) => site.showDrafts || a.status === "published").sort((a, b) => (a.slug === FEATURED_ARTICLE ? -1 : b.slug === FEATURED_ARTICLE ? 1 : b.date.localeCompare(a.date) || a.title.localeCompare(b.title)));
const articleCats = [...new Set(articles.map((a) => a.category))];

/* ---------------- shared layout ---------------- */
const NAV = [
  ["games.html", "Discover Games"],
  ["developers.html", "For Developers"],
  ["partners.html", "For Publishers"],
  ["insights.html", "India Gaming Insights"],
  ["about.html", "About Us"],
  ["contact.html", "Contact"],
];
const pages = []; // for sitemap
function canonical(rel) { const clean = rel.replace(/index\.html$/, "").replace(/\.html$/, ""); return site.url + "/" + clean; }

function layout({ rel, title, description, active = "", body, schema = [], ogType = "website", popup = false }) {
  const depth = rel.split("/").length - 1;
  const P = "../".repeat(depth);
  const L = (p) => P + p;
  const fullTitle = title === site.name ? `${site.name} | Game publishing and distribution, India and beyond` : `${title} | ${site.name}`;
  if (!rel.startsWith("404")) pages.push(rel);
  const navHtml = NAV.map(([href, label]) => `<a href="${L(href)}"${active === href ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const gvConfig = { formEndpoint: site.formEndpoint, email: site.email, inkling: { popupEnabled: !!ink.popupEnabled } };
  const schemas = schema.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n");
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical(rel)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical(rel)}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#0d0e10">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(LOGO.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg"'))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;600&family=Caveat:wght@600&display=swap">
<link rel="stylesheet" href="${L("assets/styles.css")}">
${schemas}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="${L("index.html")}" aria-label="GamerVault home">${LOGO}<b>Gamer<span>Vault</span></b></a>
    <nav class="main-nav" id="main-nav" aria-label="Main">${navHtml}<a class="btn btn-primary mobile-cta" href="${L("submit.html")}">Submit Your Game</a></nav>
    <a class="btn btn-primary btn-sm header-cta" href="${L("submit.html")}">Submit Your Game</a>
    <button class="menu-btn" type="button" aria-controls="main-nav" aria-expanded="false" aria-label="Open menu">${I.menu}</button>
  </div>
</header>
<main id="main">
${body(L)}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="logo" href="${L("index.html")}" aria-label="GamerVault home">${LOGO}<b>Gamer<span>Vault</span></b></a>
        <p>An independent game publishing and distribution company helping global studios succeed in India and Indian game makers reach the world.</p>
        <p class="mono" style="margin-top:16px">${site.locations.join(" · ")}</p>
      </div>
      <div><h3>Company</h3><ul><li><a href="${L("about.html")}">About GamerVault</a></li><li><a href="${L("developers.html")}">Publishing Services</a></li><li><a href="${L("partners.html")}">Distribution Partners</a></li><li><a href="${L("contact.html")}">Contact</a></li></ul></div>
      <div><h3>Explore</h3><ul><li><a href="${L("games.html")}">Discover Games</a></li><li><a href="${L("insights.html")}">India Gaming Insights</a></li><li><a href="${L("submit.html")}">Submit Your Game</a></li></ul></div>
      <div><h3>Get in touch</h3><ul><li><a href="${L("contact.html")}">${site.email}</a></li><li><a href="${L("privacy.html")}">Privacy Policy</a></li><li><a href="${L("terms.html")}">Terms of Use</a></li></ul></div>
    </div>
    <div class="foot-bottom"><span>© ${new Date().getFullYear()} ${site.legalName}. All rights reserved.</span><span>Game artwork on this site is generated placeholder art.</span></div>
  </div>
</footer>
${inklingModal(L)}
${popup && ink.popupEnabled ? inklingPopup() : ""}
<script>window.GV=${JSON.stringify(gvConfig)};</script>
<script src="${L("assets/app.js")}" defer></script>
</body>
</html>`;
}

/* ---------------- Inkling components ---------------- */
function inklingSpecs() {
  return `<div class="ink-specs"><div><small>Format</small><b>${esc(ink.format)}</b></div><div><small>Status</small><b>${esc(ink.status)}</b></div><div><small>Availability</small><b>${esc(ink.availability)}</b></div></div>`;
}
function inklingAction() {
  if (ink.playUrl) return `<a class="btn btn-primary" href="${esc(ink.playUrl)}">Play Inkling ${I.arrow}</a>`;
  return `<button class="btn btn-quiet" type="button" data-coming-soon aria-describedby="ink-soon-note">Coming Soon</button><p class="soon-note muted" id="ink-soon-note" hidden style="font-size:14px;flex-basis:100%">Inkling isn't playable yet. Check back on this page for updates.</p>`;
}
function inklingModal() {
  return `<div class="modal" id="inkling-modal" hidden role="dialog" aria-modal="true" aria-labelledby="ink-modal-title">
  <div class="modal-box">
    <button class="close-x" type="button" data-close aria-label="Close">${I.x}</button>
    <div class="ink-art">${inklingArt()}</div>
    <div class="ink-body">
      <div class="ink-status"><span class="badge badge-wip"><span class="dot pulse"></span>${esc(ink.statusBadge)}</span><span>Not yet published</span></div>
      <h2 id="ink-modal-title">${esc(ink.name)}</h2>
      <p class="kicker">${esc(ink.kicker)}</p>
      <p>${esc(ink.longDescription)}</p>
      ${inklingSpecs()}
      <div class="ink-actions">${inklingAction()}</div>
    </div>
  </div>
</div>`;
}
function inklingPopup() {
  return `<aside class="ink-popup" id="inkling-popup" hidden aria-labelledby="ink-pop-title">
  <button class="close-x" type="button" data-close aria-label="Close Inkling announcement">${I.x}</button>
  <div class="ink-art">${inklingArt(520, 220, "Inkling placeholder artwork")}</div>
  <div class="ink-body">
    <div class="ink-status"><span class="badge badge-wip"><span class="dot pulse"></span>${esc(ink.statusBadge)}</span></div>
    <h2 id="ink-pop-title">${esc(ink.name)}</h2>
    <p class="kicker">${esc(ink.kicker)}</p>
    <p>${esc(ink.description)}</p>
    <div class="ink-actions">${inklingAction().replace('id="ink-soon-note"', 'id="ink-soon-note-pop"').replace('aria-describedby="ink-soon-note"', 'aria-describedby="ink-soon-note-pop"')}</div>
  </div>
</aside>`;
}

/* ---------------- shared components ---------------- */
function gameCard(g, L) {
  const text = [g.title, g.genre, g.short, g.platforms.join(" "), g.origin].join(" ");
  const data = `data-item data-title="${esc(g.title)}" data-genre="${esc(g.genre)}" data-platform="${esc(g.platforms.join("|"))}" data-age="${esc(g.ageRating)}" data-origin="${esc(g.origin)}" data-date="${g.added}" data-featured="${g.featured ? 1 : 0}" data-text="${esc(text)}"`;
  if (g.inkling) {
    return `<button type="button" class="game-card is-inkling" ${data} data-inkling-open aria-label="Inkling, ${esc(ink.format)}, ${esc(ink.status)}. Open details">
  <div class="cover">${inklingArt(400, 250)}<div class="badges"><span class="badge badge-wip"><span class="dot pulse"></span>${esc(ink.statusBadge)}</span><span class="badge badge-demo">GamerVault original</span></div></div>
  <div class="body"><h3>${esc(ink.name)}</h3>
    <div class="meta"><span>${esc(ink.format)}</span><span>${esc(ink.status)}</span><span>${esc(ink.availability)}</span></div>
    <p>${esc(g.short)}</p>
    <div class="foot"><span class="view">See status ${I.arrow}</span><span class="badge badge-demo">Origin: India</span></div></div>
</button>`;
  }
  return `<a class="game-card" href="${L("games/" + g.slug + ".html")}" ${data}>
  <div class="cover">${g.cover ? `<img src="${esc(g.cover)}" alt="">` : gameArt(g)}<div class="badges"><span class="badge badge-cat">${esc(g.genre)}</span>${g.demo ? '<span class="badge badge-demo">Demo</span>' : ""}</div></div>
  <div class="body"><h3>${esc(g.title)}</h3>
    <div class="meta"><span>${esc(g.platforms.join(" · "))}</span><span>Age ${esc(g.ageRating)}</span>${g.demo ? "" : `<span>${esc(g.origin)}</span>`}</div>
    <p>${esc(g.short)}</p>
    <div class="foot"><span class="view">View Game ${I.arrow}</span></div></div>
</a>`;
}
function articleCard(a, L) {
  const text = [a.title, a.excerpt, a.category, a.tags.join(" ")].join(" ");
  return `<a class="art-card" href="${L("insights/" + a.slug + ".html")}" data-item data-title="${esc(a.title)}" data-cat="${esc(a.category)}" data-date="${a.date}" data-featured="0" data-text="${esc(text)}">
  <div class="cover">${articleArt(a)}<div class="badges">${a.status !== "published" ? '<span class="badge badge-draft">Draft</span>' : ""}</div></div>
  <div class="body"><span class="cat">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p>${esc(a.excerpt)}</p>
    <div class="meta"><span class="tabnum">${a.readMinutes} min read · ${fmtDate(a.date)}</span><span class="read">Read Article ${I.arrow}</span></div></div>
</a>`;
}
const protoFlag = () => site.formEndpoint ? "" : `<div class="prototype-flag">${I.info}<span><b>Prototype form.</b> This form is not connected to a submission service yet, so nothing will be sent. Until then, please email <b>${site.email}</b>.</span></div>`;
const hp = () => `<div class="hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></label></div>`;
function field({ id, label, type = "text", required = false, hint = "", full = false, options = null, attrs = "", placeholder = "" }) {
  const req = required ? ' required aria-required="true"' : "";
  let input;
  if (type === "textarea") input = `<textarea id="${id}" name="${id}"${req} ${attrs} placeholder="${esc(placeholder)}"></textarea>`;
  else if (type === "select") input = `<select id="${id}" name="${id}"${req} ${attrs}><option value="">Select one</option>${options.map((o) => `<option>${esc(o)}</option>`).join("")}</select>`;
  else input = `<input id="${id}" name="${id}" type="${type}"${req} ${attrs} placeholder="${esc(placeholder)}">`;
  return `<div class="field${full ? " full" : ""}"><label for="${id}">${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</label>${hint ? `<span class="hint" id="${id}-hint">${hint}</span>` : ""}${input}<span class="err" role="alert"></span></div>`;
}
function checkGroup({ name, legend, options, required = false }) {
  return `<fieldset class="field full" ${required ? "data-required-group" : ""}><legend>${legend}${required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</legend><div class="checks">${options.map((o, i) => `<label class="check" for="${name}-${i}"><input type="checkbox" id="${name}-${i}" name="${name}" value="${esc(o)}"> ${esc(o)}</label>`).join("")}</div><span class="err" role="alert"></span></fieldset>`;
}
function consent(L, id = "consent") {
  return `<div class="field full"><label class="check" for="${id}"><input type="checkbox" id="${id}" name="consent" value="yes" required> <span>I agree that GamerVault may use these details to respond to my enquiry, as described in the <a href="${L("privacy.html")}">Privacy Policy</a>. <span class="req" aria-hidden="true">*</span></span></label><span class="err" role="alert"></span></div>`;
}
function newsletter(L) {
  return `<section class="section-tight"><div class="wrap"><div class="newsletter">
  <div><span class="eyebrow">Newsletter</span><h2 class="h-md">India gaming notes for studios and publishers</h2><p class="muted" style="margin-top:10px">Occasional, practical updates on publishing, localisation and the Indian market. No spam, unsubscribe anytime.</p></div>
  <form data-form="newsletter" novalidate data-success-title="You're subscribed." data-success="Thanks for signing up. We'll be in touch when there's something worth reading.">
    ${protoFlag()}
    <div class="inline"><div class="field" style="flex:1 1 240px"><label class="sr" for="nl-email">Email address</label><input id="nl-email" name="email" type="email" required placeholder="you@studio.com"><span class="err" role="alert"></span></div><button class="btn btn-primary" type="submit">Subscribe</button></div>
    ${consent(L, "nl-consent")}
    ${hp()}
    <div class="form-status" role="status" aria-live="polite"></div>
  </form></div></div></section>`;
}
function finalCta(L) {
  return `<section class="section-tight"><div class="wrap"><div class="final">
  <svg class="bg" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="180" fill="none" stroke="#0d0e10" stroke-width="2" opacity=".2"/><circle cx="200" cy="200" r="120" fill="none" stroke="#0d0e10" stroke-width="2" opacity=".2"/><circle cx="200" cy="200" r="60" fill="none" stroke="#0d0e10" stroke-width="2" opacity=".2"/><path d="M180 160l60 40-60 40z" fill="#0d0e10" opacity=".15"/></svg>
  <h2>Have a Game Worth Taking Further?</h2>
  <p>Whether you're bringing an international game to India or taking an Indian game overseas, let's explore the opportunity.</p>
  <div class="actions"><a class="btn btn-dark" href="${L("submit.html")}">Submit Your Game ${I.arrow}</a><a class="btn btn-outline-dark" href="${L("contact.html")}">Contact GamerVault</a></div>
</div></div></section>`;
}
const PROCESS = [
  ["Discover", "Evaluate and select promising games with a clear fit for the target market."],
  ["Adapt", "Localise language, content, pricing and user experience for new players."],
  ["Launch", "Prepare store listings, publishing and distribution across the right channels."],
  ["Grow", "Run marketing, creator and community programmes to build an audience."],
  ["Operate", "Support updates, optimisation and ongoing performance after launch."],
];
const timeline = () => `<ol class="timeline">${PROCESS.map(([t, d], i) => `<li><span class="node">0${i + 1}</span><h3>${t}</h3><p>${d}</p></li>`).join("")}</ol>`;
const SERVICES = [
  [I.target, "Game selection and evaluation", "We assess finished and near-release games for market fit, quality and commercial potential."],
  [I.lang, "Localisation and cultural adaptation", "India-specific adaptation of language, references, art and tone, done with care rather than literal translation."],
  [I.layers, "Language and market-specific content", "Content and events that make sense for the players and calendar of each market."],
  [I.coins, "Pricing and payment localisation", "Price points and payment flows that suit how players in each market prefer to pay."],
  [I.megaphone, "Marketing and creator partnerships", "Influencer campaigns, creator partnerships and brand collaborations planned around your launch."],
  [I.globe, "Publishing and distribution", "Store presence and distribution planning across app stores and other channels."],
  [I.shield, "Licensing and regulatory coordination", "Coordinating ratings, licensing and market-specific compliance requirements."],
  [I.wrench, "Ongoing operations and support", "Updates, live operations, player support and performance reviews after launch."],
  [I.map, "International expansion for Indian studios", "Helping Indian teams prepare their games for audiences beyond India."],
  [I.handshake, "Commercial partnerships", "Exploring opportunities with platforms, telecom operators, app stores and other distribution channels."],
];

/* ---------------- HOME ---------------- */
function home() {
  const featuredGames = [games.find((g) => g.inkling), ...games.filter((g) => g.demo && g.featured), ...games.filter((g) => g.demo && !g.featured)].filter(Boolean).slice(0, 6);
  const mosaicGames = games.filter((g) => g.demo).slice(0, 9);
  const homeArticles = articles.slice(0, 6);
  layoutWrite("index.html", {
    title: site.name,
    description: "GamerVault is an independent game publisher helping global studios enter India and Indian studios reach international players: localisation, distribution, marketing and live operations.",
    popup: true,
    schema: [
      { "@context": "https://schema.org", "@type": "Organization", name: site.name, legalName: site.legalName, url: site.url, email: site.email, description: "Independent game publishing and distribution company focused on India and international markets.", address: [{ "@type": "PostalAddress", addressLocality: "Bengaluru", addressCountry: "IN" }, { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" }] },
      { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url },
    ],
    body: (L) => `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <span class="eyebrow">Game publishing &amp; distribution</span>
      <h1 class="h-xl">Great Games Deserve a <em>Global Audience.</em></h1>
      <p class="sub">India entry for global studios. Global reach for Indian studios.</p>
      <p class="lead">GamerVault helps game studios publish, localise, distribute, and grow their games across markets, starting with India.</p>
      <div class="hero-actions"><a class="btn btn-primary" href="${L("developers.html#india")}">Publish in India ${I.arrow}</a><a class="btn btn-secondary" href="${L("developers.html#global")}">Take Your Game Global</a></div>
      <div class="hero-note"><span>No upfront fee for studios</span><span>Selective catalogue</span><span>Bengaluru and London</span></div>
    </div>
    <div style="position:relative;padding-bottom:30px">
      <div class="mosaic" aria-hidden="true">${mosaicGames.map((g) => `<div class="tile">${gameArt(g, 300, 400, { initials: false })}<span>${esc(g.genre)}</span></div>`).join("")}</div>
      <div class="route-card"><div class="row"><b>IN</b> Global studios → India</div><div class="line"></div><div class="row"><b>WW</b> Indian studios → World</div></div>
    </div>
  </div>
</section>

<section class="section rule-top" id="discover">
  <div class="wrap">
    <div class="section-head"><div><span class="eyebrow">Discover Games</span><h2 class="h-lg">Discover Games</h2><p class="lead">Explore games across genres, styles, and audiences.</p></div><a class="btn btn-secondary" href="${L("games.html")}">Browse all games ${I.arrow}</a></div>
    <div class="demo-note">${I.info}<span><b style="color:var(--fg)">Demo catalogue.</b> Entries marked "Demo" are sample listings that show how games will appear here. They are not GamerVault titles. Inkling is our own game, currently in development.</span></div>
    <div class="chips" style="margin-bottom:24px">${categories.map((c) => `<a class="chip" href="${L("games.html")}?cat=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</div>
    <div class="games-grid">${featuredGames.map((g) => gameCard(g, L)).join("")}</div>
  </div>
</section>

<section class="section rule-top" id="why-india">
  <div class="wrap india">
    <div>
      <span class="eyebrow">Why India?</span>
      <h2 class="h-lg">India Is a Market Worth Understanding.</h2>
      <p class="lead" style="margin-top:16px">India is large, young and mobile-first, but it rewards studios that adapt. Language, pricing, payments, creators and regulation all work differently here, which is why many international studios choose a local publishing partner.</p>
      <div class="stat-grid" style="margin-top:32px">
        <div class="stat"><b>$1.5B</b><span>Indian video games market, 2025</span><small>CY25 · excludes real-money gaming</small></div>
        <div class="stat"><b>555M</b><span>Gamers in India, 2025</span><small>CY25 · after the 2025 ban</small></div>
        <div class="stat"><b>25%</b><span>Payer conversion</span><small>CY25</small></div>
        <div class="stat"><b>83%</b><span>Prefer UPI or digital wallets</span><small>FY24 survey</small></div>
      </div>
      <p class="source-line">Sources: Lumikai State of India Interactive Media Report 2025, via <a href="https://respawn.outlookindia.com/gaming/gaming-news/lumikai-india-gaming-market-1-5-billion-rmg-ban-2025" target="_blank" rel="noopener">Outlook Respawn</a> (23 Mar 2026); Lumikai FY24 report, via <a href="https://gamesbeat.com/indias-game-market-could-grow-from-3-8b-to-9-2b-by-2029-lumikai/" target="_blank" rel="noopener">GamesBeat</a> (updated 18 Jun 2025).</p>
    </div>
    <div class="factors">
      ${[
        ["Mobile-first audiences", "Most play happens on Android phones in the $200 to $400 range, so size, performance and data use shape what succeeds."],
        ["Language and cultural diversity", "India is many markets in one. Language choices, references and settings need deliberate decisions, not a single translation pass."],
        ["Local pricing and payments", "Players expect familiar payment methods such as UPI and wallets, and price points that feel fair locally."],
        ["Regional marketing and creators", "Creators, communities and regional media drive discovery in ways that differ from Western launch playbooks."],
        ["Platform distribution", "Google Play leads, with alternative Android stores, telecom platforms and browser portals adding reach."],
        ["Market-specific compliance", "The Promotion and Regulation of Online Gaming Act, 2025 banned online money games and recognised e-sports and social games. Classification matters."],
      ].map(([t, d], i) => `<div class="factor"><span class="ix">0${i + 1}</span><div><h3>${t}</h3><p>${d}</p></div></div>`).join("")}
    </div>
  </div>
</section>

<section class="section rule-top" id="process">
  <div class="wrap">
    <div class="section-head"><div><span class="eyebrow">What GamerVault Does</span><h2 class="h-lg">From finished build to live product.</h2><p class="lead">The studio keeps building the game. We manage the publishing journey, in five stages.</p></div></div>
    ${timeline()}
  </div>
</section>

<section class="section rule-top">
  <div class="wrap">
    <div class="section-head"><div><span class="eyebrow">Two-way publishing</span><h2 class="h-lg">Two directions. One publishing partner.</h2></div></div>
    <div class="duo">
      <div class="duo-card" id="india">
        <div class="art" aria-hidden="true"><svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice"><rect width="600" height="400" fill="#141a10"/>${[...Array(9)].map((_, i) => `<circle cx="420" cy="140" r="${30 + i * 34}" fill="none" stroke="#c6ef3a" stroke-opacity="${(0.5 - i * 0.05).toFixed(2)}"/>`).join("")}<circle cx="420" cy="140" r="12" fill="#c6ef3a"/></svg></div>
        <span class="tag"><span class="dot"></span>For global studios</span>
        <h3>Bring Your Game to India</h3>
        <p>Expand into one of the world's most distinctive gaming markets with a publishing partner focused on local adaptation, distribution, and growth.</p>
        <a class="btn btn-primary" href="${L("developers.html#india")}">Explore India Publishing ${I.arrow}</a>
      </div>
      <div class="duo-card" id="global">
        <div class="art" aria-hidden="true"><svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice"><rect width="600" height="400" fill="#10161c"/>${[...Array(7)].map((_, i) => `<ellipse cx="430" cy="150" rx="${170 - i * 24}" ry="170" fill="none" stroke="#7fc8ff" stroke-opacity=".35"/>`).join("")}${[...Array(5)].map((_, i) => `<path d="M260 ${60 + i * 45}H600" stroke="#7fc8ff" stroke-opacity=".2"/>`).join("")}<path d="M120 320 Q 300 120 470 150" fill="none" stroke="#c6ef3a" stroke-width="3" stroke-dasharray="6 8"/><circle cx="120" cy="320" r="8" fill="#c6ef3a"/><circle cx="470" cy="150" r="8" fill="#c6ef3a"/></svg></div>
        <span class="tag"><span class="dot"></span>For Indian studios</span>
        <h3>Take Your Indian Game Global</h3>
        <p>Explore opportunities to bring your game to new audiences through international publishing, distribution, and localisation.</p>
        <a class="btn btn-primary" href="${L("developers.html#global")}">Explore Global Publishing ${I.arrow}</a>
      </div>
    </div>
  </div>
</section>

<section class="section rule-top">
  <div class="wrap">
    <div class="section-head"><div><span class="eyebrow">India Gaming Insights</span><h2 class="h-lg">Inside the Indian Gaming Market</h2><p class="lead">Practical guides for studios and publishers working in and with India.</p></div><a class="btn btn-secondary" href="${L("insights.html")}">All insights ${I.arrow}</a></div>
    <div class="articles-grid">${homeArticles.map((a) => articleCard(a, L)).join("")}</div>
  </div>
</section>

<section class="section rule-top">
  <div class="wrap">
    <div class="section-head"><div><span class="eyebrow">Why GamerVault?</span><h2 class="h-lg">A focused publisher, by design.</h2></div></div>
    <div class="grid-3">
      ${[
        [I.target, "Independent and selective", "We keep the catalogue small on purpose, so every title gets real attention."],
        [I.user, "Senior attention on every title", "Experienced people work directly on your game, not a junior account queue."],
        [I.calendar, "Dedicated launch planning", "Each game gets its own launch plan, built around its audience and market."],
        [I.coins, "Revenue-sharing incentives", "Our proposed model has no upfront fee and shares revenue, so we win when your game does."],
        [I.lang, "Market-specific adaptation", "Localisation, pricing and content shaped for each market, not copied across."],
        [I.layers, "Cross-disciplinary expertise", "Experience across gaming, technology, legal considerations and entertainment."],
      ].map(([ic, t, d]) => `<div class="card"><span class="icon-sq">${ic}</span><h3>${t}</h3><p>${d}</p></div>`).join("")}
    </div>
  </div>
</section>
${finalCta(L)}`,
  });
}

/* ---------------- DISCOVER ---------------- */
function discover() {
  const platforms = [...new Set(games.flatMap((g) => g.platforms))].sort();
  const ages = [...new Set(games.map((g) => g.ageRating))].sort((a, b) => parseInt(a) - parseInt(b));
  const origins = [...new Set(games.map((g) => g.origin))].sort();
  const sel = (key, label, opts) => `<label class="sr" for="f-${key}">${label}</label><select class="select-inline" id="f-${key}" data-filter="${key}"><option value="all">${label}: all</option>${opts.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>`;
  layoutWrite("games.html", {
    title: "Discover Games",
    description: "Browse games by genre, platform, age suitability and origin. GamerVault's catalogue of published and distributed games, starting with a demo catalogue and Inkling.",
    active: "games.html",
    body: (L) => `
<section class="page-hero"><div class="wrap"><span class="eyebrow">Discover Games</span><h1 class="h-lg">Discover Games</h1><p class="lead">Explore games across genres, styles, and audiences. Our verified catalogue will grow as publishing agreements are signed.</p></div></section>
<section class="section-tight" data-filter-root>
  <div class="wrap">
    <div class="demo-note">${I.info}<span><b style="color:var(--fg)">Demo catalogue.</b> Entries marked "Demo" are sample listings created to show how the catalogue works. They are not GamerVault titles and are not playable. Inkling is GamerVault's own H5 game, currently in development.</span></div>
    <div class="toolbar">
      <div class="toolbar-row">
        <div class="search">${I.search}<label class="sr" for="game-search">Search games by name</label><input id="game-search" type="search" placeholder="Search games by name" data-search autocomplete="off"></div>
        ${sel("platform", "Platform", platforms)}
        ${sel("age", "Age", ages)}
        ${sel("origin", "Origin", origins)}
        <label class="sr" for="g-sort">Sort by</label><select class="select-inline" id="g-sort" data-sort><option value="featured">Sort: featured</option><option value="newest">Sort: newest</option><option value="az">Sort: A to Z</option></select>
      </div>
      <div class="chips" role="group" aria-label="Filter by genre"><button class="chip" type="button" data-chip="all" data-key="genre" aria-pressed="true">All genres</button>${categories.map((c) => `<button class="chip" type="button" data-chip="${esc(c)}" data-key="genre" aria-pressed="false">${esc(c)}</button>`).join("")}</div>
    </div>
    <div class="result-line"><span data-count aria-live="polite">${games.length} results</span><button class="chip" type="button" data-reset>Clear filters</button></div>
    <div class="games-grid" data-list data-page="9">${games.map((g) => gameCard(g, L)).join("")}</div>
    <div class="empty" data-empty hidden><h3>No games match those filters</h3><p>Try a different genre or platform, or clear your search.</p><button class="btn btn-secondary" type="button" data-reset>Clear all filters</button></div>
    <div class="loading" data-loading hidden aria-label="Loading more games"><i></i><i></i><i></i></div>
    <div class="load-more"><button class="btn btn-secondary" type="button" data-more>Load more games</button></div>
  </div>
</section>
<section class="section-tight"><div class="wrap"><div class="card" style="flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px"><div><h2 class="h-md">Want your game here?</h2><p style="margin-top:8px">We review finished and near-release games for publishing in India and beyond.</p></div><a class="btn btn-primary" href="${L("submit.html")}">Submit Your Game ${I.arrow}</a></div></div></section>`,
  });

  for (const g of games.filter((x) => !x.inkling)) {
    const related = [...games.filter((x) => x.slug !== g.slug && !x.inkling && x.genre === g.genre), ...games.filter((x) => x.slug !== g.slug && !x.inkling && x.genre !== g.genre)].slice(0, 3);
    const action = g.playUrl ? `<a class="btn btn-primary" href="${esc(g.playUrl)}">Play ${esc(g.title)} ${I.arrow}</a>` : g.storeLinks?.length ? g.storeLinks.map((s) => `<a class="btn btn-secondary" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join("") : "";
    layoutWrite(`games/${g.slug}.html`, {
      title: g.demo ? `${g.title} (demo listing)` : g.title,
      description: g.demo ? `Demonstration listing for a sample ${g.genre.toLowerCase()} game. Not a GamerVault title.` : g.short,
      active: "games.html",
      body: (L) => `
<section class="article-hero"><div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${L("games.html")}">Discover Games</a><span>/</span><span>${esc(g.title)}</span></nav>
  <div class="game-detail">
    <div class="cover">${g.cover ? `<img src="${esc(g.cover)}" alt="${esc(g.title)} artwork">` : gameArt(g, 640, 400)}</div>
    <div style="display:grid;gap:18px">
      <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge badge-cat">${esc(g.genre)}</span>${g.demo ? '<span class="badge badge-demo">Demo listing</span>' : ""}</div>
      <h1 class="h-lg">${esc(g.title)}</h1>
      <p class="lead">${esc(g.short)}</p>
      ${g.demo ? `<div class="prototype-flag">${I.info}<span><b>Demonstration entry.</b> This is sample content showing how a game page will look. It is not a GamerVault title, it is not playable and it is not available for download.</span></div>` : ""}
      <dl class="spec">
        <div><dt>Genre</dt><dd>${esc(g.genre)}</dd></div>
        <div><dt>Platforms</dt><dd>${esc(g.platforms.join(", "))}</dd></div>
        <div><dt>Age rating</dt><dd>${esc(g.ageRating)}</dd></div>
        <div><dt>Origin</dt><dd>${g.demo ? "Sample entry (not applicable)" : esc(g.origin)}</dd></div>
        <div><dt>Status</dt><dd>${esc(g.stage)}</dd></div>
      </dl>
      ${action ? `<div style="display:flex;gap:10px;flex-wrap:wrap">${action}</div>` : ""}
    </div>
  </div>
  <div class="prose" style="margin-top:44px"><h2 id="about">About this listing</h2><p>${esc(g.description)}</p></div>
</div></section>
<section class="section-tight rule-top"><div class="wrap"><div class="section-head"><div><h2 class="h-md">Related games</h2></div><a class="btn btn-secondary" href="${L("games.html")}">Back to Discover Games</a></div><div class="games-grid">${related.map((r) => gameCard(r, L)).join("")}</div></div></section>
${finalCta(L)}`,
    });
  }
}

/* ---------------- DEVELOPERS ---------------- */
function developers() {
  const faq = [
    ["What kind of games does GamerVault publish?", "We evaluate finished or near-release games across genres, including kids and family, casual, puzzle, strategy, adventure, simulation and story-led titles. We are selective, so we focus on games with a clear fit for the target market."],
    ["Does submitting my game guarantee a publishing deal?", "No. Every submission is reviewed, but submitting a game does not guarantee acceptance or a publishing agreement. If there is a potential fit, we will arrange a conversation to learn more."],
    ["Do you charge studios an upfront fee?", "No. Our proposed model has no upfront fee for studios. Revenue sharing starts at 50:50 and is adjusted as the game grows. Terms are agreed case by case, so not every game receives identical terms."],
    ["Who pays for marketing?", "Marketing expenditure is discussed openly for each game, according to the campaign objectives and scale. It is agreed in writing before any spend begins."],
    ["Do we keep ownership of our game?", "The studio develops the game and owns its intellectual property. A publishing agreement covers the rights needed to publish in agreed territories and platforms, for an agreed period."],
    ["Do you help with development?", "The studio remains responsible for developing its game. We manage the publishing journey from a finished build to a live product, including localisation coordination, launch and operations."],
    ["How long does a review take?", "It depends on the game and the volume of submissions. We aim to acknowledge every submission and will tell you if we need a build, a video or more information."],
  ];
  layoutWrite("developers.html", {
    title: "Publish your game in India and beyond",
    description: "GamerVault publishes finished and near-release games: India entry for international studios and international publishing for Indian studios. No upfront fee, revenue-share model.",
    active: "developers.html",
    schema: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }],
    body: (L) => `
<section class="page-hero"><div class="wrap"><span class="eyebrow">For Developers</span><h1 class="h-lg" style="max-width:18ch">You Build the Game. We Help It Reach the Right Market.</h1><p class="lead">GamerVault evaluates finished or near-release games and manages the publishing journey: adaptation, launch, growth and operations.</p><div class="actions"><a class="btn btn-primary" href="${L("submit.html")}">Publish Your Game in India ${I.arrow}</a><a class="btn btn-secondary" href="${L("submit.html")}?path=global">Take Your Game Global</a></div></div></section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><div><span class="eyebrow">The challenge</span><h2 class="h-lg">A great game is only half the launch.</h2><p class="lead">Studios that enter a new market alone usually hit the same walls.</p></div></div>
    <div class="grid-3">
      ${[
        ["Not knowing the audience", "What players expect, which genres travel and how they discover games varies by market."],
        ["Localisation beyond translation", "Language, cultural references, characters, UI and tone all need care to feel native."],
        ["Pricing and payments", "Local price points and preferred payment methods affect conversion directly."],
        ["Distribution relationships", "Stores, platforms, telecom operators and portals each have their own path to reach players."],
        ["Marketing and creators", "Launch playbooks that work in one market can fall flat in another."],
        ["Running operations remotely", "Updates, events, support and compliance need someone on the ground."],
      ].map(([t, d], i) => `<div class="card"><span class="num">0${i + 1}</span><h3>${t}</h3><p>${d}</p></div>`).join("")}
    </div>
  </div>
</section>

<section class="section rule-top">
  <div class="wrap">
    <div class="section-head"><div><span class="eyebrow">Two pathways</span><h2 class="h-lg">How we work with studios</h2></div></div>
    <div class="duo">
      <div class="card" id="india" style="padding:32px;gap:14px"><span class="badge badge-cat" style="align-self:flex-start">International studios</span><h3 style="font-size:28px">Bring your game to India</h3><p>You have a game that works in Korea, Japan, Southeast Asia, Europe or North America. We help you assess its fit for India, adapt it, and run the local publishing operation, so you don't have to build one.</p>
        <ul class="ticks"><li><span>Market-fit assessment for Indian audiences</span></li><li><span>Localisation, pricing and payment adaptation</span></li><li><span>Distribution, marketing and creator partnerships</span></li><li><span>Local operations and commercial partnerships</span></li></ul>
        <a class="btn btn-primary" style="align-self:flex-start;margin-top:8px" href="${L("submit.html")}?path=india">Publish Your Game in India ${I.arrow}</a></div>
      <div class="card" id="global" style="padding:32px;gap:14px"><span class="badge badge-cat" style="align-self:flex-start">Indian studios</span><h3 style="font-size:28px">Take your game global</h3><p>You have built a strong game in India and want to reach players overseas. We help you explore international publishing, prepare the game for new markets and find the right channels.</p>
        <ul class="ticks"><li><span>Market prioritisation and readiness review</span></li><li><span>Localisation for target regions</span></li><li><span>Publishing partnerships and distribution</span></li><li><span>Marketing planning for new audiences</span></li></ul>
        <a class="btn btn-primary" style="align-self:flex-start;margin-top:8px" href="${L("submit.html")}?path=global">Take Your Game Global ${I.arrow}</a></div>
    </div>
  </div>
</section>

<section class="section rule-top">
  <div class="wrap">
    <div class="section-head"><div><span class="eyebrow">Services</span><h2 class="h-lg">What we offer</h2></div></div>
    <div class="grid-3">${SERVICES.map(([ic, t, d]) => `<div class="card"><span class="icon-sq">${ic}</span><h3>${t}</h3><p>${d}</p></div>`).join("")}</div>
  </div>
</section>

<section class="section rule-top"><div class="wrap"><div class="section-head"><div><span class="eyebrow">Process</span><h2 class="h-lg">Five stages, one partner</h2></div></div>${timeline()}</div></section>

<section class="section rule-top">
  <div class="wrap two-col">
    <div><span class="eyebrow">Commercial model</span><h2 class="h-lg">Aligned incentives, agreed upfront.</h2><p class="lead" style="margin-top:16px">This is our proposed publishing model. Final terms depend on the game and are agreed in writing with each studio.</p></div>
    <div class="grid-2" style="gap:14px">
      <div class="card"><span class="num">No upfront fee</span><h3>Studios pay nothing to start</h3><p>We invest our time and publishing effort and are rewarded through revenue share.</p></div>
      <div class="card"><span class="num">50:50 to begin</span><h3>Revenue sharing</h3><p>Revenue share initially structured at 50:50 and adjusted as the game grows.</p></div>
      <div class="card"><span class="num">Case by case</span><h3>Marketing spend</h3><p>Discussed according to campaign objectives and scale, and agreed before spend begins.</p></div>
      <div class="card"><span class="num">Studio-owned</span><h3>Your game stays yours</h3><p>You keep developing and owning your game. We handle the publishing journey.</p></div>
    </div>
  </div>
</section>

<section class="section rule-top">
  <div class="wrap two-col">
    <div><span class="eyebrow">FAQ</span><h2 class="h-lg">Questions studios ask</h2></div>
    <div class="faq">${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
  </div>
</section>

<section class="section-tight"><div class="wrap"><div class="cta-box" style="max-width:none"><h2>Ready to share your game?</h2><p>Tell us about your game, its stage and the markets you are interested in. Submitting a game does not guarantee acceptance or a publishing agreement.</p><div class="actions"><a class="btn btn-primary" href="${L("submit.html")}">Submit Your Game ${I.arrow}</a><a class="btn btn-secondary" href="${L("contact.html")}">Ask a question first</a></div></div></div></section>`,
  });
}

/* ---------------- SUBMIT ---------------- */
function submit() {
  layoutWrite("submit.html", {
    title: "Submit Your Game",
    description: "Submit your game to GamerVault for publishing in India or international markets. Tell us about your studio, game, stage and target markets.",
    active: "",
    body: (L) => `
<section class="page-hero"><div class="wrap"><span class="eyebrow">Submit Your Game</span><h1 class="h-lg">Submit Your Game</h1><p class="lead">Share the essentials and we will review your game for publishing opportunities. Submitting a game does not guarantee acceptance or a publishing agreement.</p></div></section>
<section class="section-tight"><div class="wrap narrow" style="max-width:920px">
  <form class="form form-card" data-form="game-submission" novalidate data-success-title="Thank you. Your game has been submitted." data-success="We review every submission and will reply to the email you provided. Submission does not guarantee acceptance.">
    ${protoFlag()}
    <fieldset class="field full" data-required-group><legend>What are you looking for? <span class="req" aria-hidden="true">*</span></legend>
      <div class="path-pick" style="margin-top:8px">
        <label for="path-india"><input type="radio" id="path-india" name="pathway" value="Publish in India (international studio)"><span><b>Publish my game in India</b><small>I'm an international studio seeking Indian publishing.</small></span></label>
        <label for="path-global"><input type="radio" id="path-global" name="pathway" value="International publishing (Indian studio)"><span><b>Take my Indian game global</b><small>I'm an Indian studio seeking international publishing.</small></span></label>
      </div><span class="err" role="alert"></span>
    </fieldset>
    <h2 class="h-sm">Studio</h2>
    <div class="form-grid">
      ${field({ id: "studio", label: "Studio or company name", required: true, attrs: 'autocomplete="organization"' })}
      ${field({ id: "contact_name", label: "Contact person's name", required: true, attrs: 'autocomplete="name"' })}
      ${field({ id: "email", label: "Business email", type: "email", required: true, attrs: 'autocomplete="email"', placeholder: "name@studio.com" })}
      ${field({ id: "country", label: "Country", required: true, attrs: 'autocomplete="country-name"' })}
      ${field({ id: "website", label: "Studio website", type: "url", placeholder: "https://", full: true })}
    </div>
    <h2 class="h-sm">Game</h2>
    <div class="form-grid">
      ${field({ id: "game_title", label: "Game title", required: true })}
      ${field({ id: "genre", label: "Game genre", type: "select", required: true, options: [...categories, "Other"] })}
      ${field({ id: "stage", label: "Current development stage", type: "select", required: true, options: ["Concept", "In Development", "Beta", "Completed", "Already Published"] })}
      ${field({ id: "timeline", label: "Expected launch timeline", type: "select", options: ["Already live", "Within 3 months", "3 to 6 months", "6 to 12 months", "More than 12 months", "Not decided"] })}
      ${checkGroup({ name: "platforms", legend: "Target platform", options: ["Android", "iOS", "Web (H5)", "PC", "Console"], required: true })}
      ${field({ id: "availability", label: "Current countries of availability", hint: "Where can players get the game today? Write 'None yet' if unreleased.", full: true })}
      ${checkGroup({ name: "markets", legend: "Markets of interest", options: ["India", "Southeast Asia", "East Asia", "Europe", "North America", "Middle East", "Other"], required: true })}
      ${field({ id: "description", label: "Game description", type: "textarea", required: true, full: true, hint: "What is the game, who is it for, and what makes it stand out?", attrs: 'minlength="40"' })}
      ${field({ id: "store_url", label: "Store listing or gameplay video URL", type: "url", placeholder: "https://" })}
      ${field({ id: "build_url", label: "Game build or demo URL", type: "url", placeholder: "https://", hint: "Share an access link only. Never send passwords here." })}
      ${checkGroup({ name: "requirements", legend: "Publishing requirements", options: ["Localisation", "Pricing and payments", "Marketing and creators", "Distribution", "Licensing and compliance", "Live operations"] })}
      ${field({ id: "additional", label: "Additional information", type: "textarea", full: true })}
      ${consent(L)}
    </div>
    ${hp()}
    <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center"><button class="btn btn-primary" type="submit">Submit Your Game</button><span class="muted" style="font-size:14px">Fields marked <span class="req" style="color:var(--lime)">*</span> are required.</span></div>
    <div class="form-status" role="status" aria-live="polite"></div>
  </form>
</div></section>
<script>try{var p=new URLSearchParams(location.search).get("path");if(p){var r=document.getElementById(p==="global"?"path-global":"path-india");if(r)r.checked=true;}}catch(e){}</script>`,
  });
}

/* ---------------- INSIGHTS ---------------- */
function insights() {
  const [feat, ...rest] = articles;
  layoutWrite("insights.html", {
    title: "India Gaming Insights",
    description: "Practical, India-focused gaming insights for studios and publishers: market structure, localisation, monetisation, publishing deals and international expansion.",
    active: "insights.html",
    body: (L) => `
<section class="page-hero"><div class="wrap"><span class="eyebrow">India Gaming Insights</span><h1 class="h-lg">Inside the Indian Gaming Market</h1><p class="lead">Guides for studios and publishers on entering India, growing here, and taking Indian games to the world.</p></div></section>
<section class="section-tight" data-filter-root>
  <div class="wrap">
    ${feat ? `<a class="featured-article" href="${L("insights/" + feat.slug + ".html")}"><div class="cover">${articleArt(feat, 800, 500)}</div><div class="body"><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge badge-cat">Featured</span>${feat.status !== "published" ? '<span class="badge badge-draft">Draft</span>' : ""}</div><span class="mono" style="color:var(--lime)">${esc(feat.category)}</span><h2>${esc(feat.title)}</h2><p>${esc(feat.excerpt)}</p><span class="muted tabnum" style="font-size:14px">${feat.readMinutes} min read · ${fmtDate(feat.date)}</span><span class="btn btn-primary" style="align-self:flex-start">Read Article ${I.arrow}</span></div></a>` : ""}
    <div class="toolbar">
      <div class="toolbar-row"><div class="search">${I.search}<label class="sr" for="art-search">Search articles</label><input id="art-search" type="search" placeholder="Search articles" data-search autocomplete="off"></div><label class="sr" for="a-sort">Sort by</label><select class="select-inline" id="a-sort" data-sort><option value="newest">Sort: newest</option><option value="az">Sort: A to Z</option></select></div>
      <div class="chips" role="group" aria-label="Filter by topic"><button class="chip" type="button" data-chip="all" data-key="cat" aria-pressed="true">All topics</button>${articleCats.map((c) => `<button class="chip" type="button" data-chip="${esc(c)}" data-key="cat" aria-pressed="false">${esc(c)}</button>`).join("")}</div>
    </div>
    <div class="result-line"><span data-count aria-live="polite">${rest.length} results</span><button class="chip" type="button" data-reset>Clear filters</button></div>
    <div class="articles-grid" data-list data-page="9">${rest.map((a) => articleCard(a, L)).join("")}</div>
    <div class="empty" data-empty hidden><h3>No articles match your search</h3><p>Try another topic or clear the search box.</p><button class="btn btn-secondary" type="button" data-reset>Clear all filters</button></div>
    <div class="loading" data-loading hidden aria-label="Loading more articles"><i></i><i></i><i></i></div>
    <div class="load-more"><button class="btn btn-secondary" type="button" data-more>Load more articles</button></div>
  </div>
</section>
${newsletter(L)}`,
  });

  for (const a of articles) {
    const related = [...articles.filter((x) => x.slug !== a.slug && x.category === a.category), ...articles.filter((x) => x.slug !== a.slug && x.category !== a.category)].slice(0, 3);
    const url = canonical(`insights/${a.slug}.html`);
    const schema = a.status === "published" ? [{ "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.excerpt, datePublished: a.date, author: { "@type": "Organization", name: a.author }, publisher: { "@type": "Organization", name: site.name }, mainEntityOfPage: url }] : [];
    layoutWrite(`insights/${a.slug}.html`, {
      title: a.seoTitle || a.title,
      description: a.seoDescription || a.excerpt,
      active: "insights.html",
      ogType: "article",
      schema,
      body: (L) => `
<article>
<section class="article-hero"><div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${L("insights.html")}">India Gaming Insights</a><span>/</span><span>${esc(a.category)}</span></nav>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px"><span class="badge badge-cat">${esc(a.category)}</span>${a.status !== "published" ? '<span class="badge badge-draft">Draft</span>' : ""}</div>
  <h1 class="h-lg" style="max-width:22ch">${esc(a.title)}</h1>
  <p class="lead" style="margin-top:16px">${esc(a.excerpt)}</p>
  <div class="article-meta"><span>By ${esc(a.author)}</span><span>${fmtDate(a.date)}</span><span>${a.readMinutes} min read</span></div>
</div></section>
<div class="wrap"><div class="article-cover">${articleArt(a, 1260, 480)}</div></div>
<section class="section-tight"><div class="wrap article-layout">
  <div>
    ${a.status !== "published" ? `<div class="draft-banner">${I.info}<span><b>Draft article.</b> This piece is awaiting editorial review before final publication. Figures are taken from the sources listed at the end.</span></div>` : ""}
    <div class="prose">${a.html}</div>
    ${a.sources.length ? `<section class="refs" aria-labelledby="refs-h"><h2 id="refs-h">Sources</h2><ol>${a.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>${s.date ? `, ${esc(s.date)}` : ""}</li>`).join("")}</ol></section>` : ""}
    <div class="share"><span>Share</span><button class="btn btn-quiet btn-sm" type="button" data-copy-text="${url}">Copy link</button><a class="btn btn-quiet btn-sm" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener">LinkedIn</a><a class="btn btn-quiet btn-sm" href="https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(a.title)}" target="_blank" rel="noopener">X</a><a class="btn btn-quiet btn-sm" href="https://wa.me/?text=${encodeURIComponent(a.title + " " + url)}" target="_blank" rel="noopener">WhatsApp</a></div>
    <div class="cta-box"><h2>Thinking about India, or beyond it?</h2><p>GamerVault helps international studios publish in India and Indian studios reach new markets. Tell us about your game.</p><div class="actions"><a class="btn btn-primary" href="${L("submit.html")}">Submit Your Game ${I.arrow}</a><a class="btn btn-secondary" href="${L("developers.html")}">How we work</a></div></div>
  </div>
  ${a.toc.length > 2 ? `<aside class="toc" aria-label="On this page"><span class="mono muted">On this page</span><nav>${a.toc.map((t) => `<a href="#${t.id}">${esc(t.text)}</a>`).join("")}</nav></aside>` : ""}
</div></section>
</article>
<section class="section-tight rule-top"><div class="wrap"><div class="section-head"><div><h2 class="h-md">Related reading</h2></div><a class="btn btn-secondary" href="${L("insights.html")}">All insights ${I.arrow}</a></div><div class="articles-grid">${related.map((r) => articleCard(r, L)).join("")}</div></div></section>
${newsletter(L)}`,
    });
  }
}

/* ---------------- ABOUT ---------------- */
function about() {
  layoutWrite("about.html", {
    title: "About GamerVault",
    description: "GamerVault is an independent game publishing company connecting great games with new markets: global studios in India and Indian studios worldwide.",
    active: "about.html",
    body: (L) => `
<section class="page-hero"><div class="wrap"><span class="eyebrow">About Us</span><h1 class="h-lg" style="max-width:16ch">Connecting Great Games With New Markets.</h1><p class="lead">GamerVault is an independent game publishing company helping global studios succeed in India and Indian game makers reach international audiences.</p></div></section>
<section class="section"><div class="wrap two-col">
  <div><span class="eyebrow">Our role</span><h2 class="h-lg">A film distributor, but for games.</h2><p class="lead" style="margin-top:16px">We identify promising finished games, adapt them for the target market, manage publishing and marketing, and share revenue with the original studio. The studio remains responsible for developing its game.</p></div>
  <ul class="ticks" style="font-size:17px">
    <li><span><b>Selecting suitable games</b> with a clear fit for the market.</span></li>
    <li><span><b>Adapting them for local audiences</b>, from language to pricing.</span></li>
    <li><span><b>Preparing market entry</b> and launch plans.</span></li>
    <li><span><b>Coordinating publishing and distribution</b> across channels.</span></li>
    <li><span><b>Supporting marketing</b> with creators, communities and brands.</span></li>
    <li><span><b>Managing ongoing publishing operations</b> after launch.</span></li>
  </ul>
</div></section>
<section class="section rule-top"><div class="wrap two-col">
  <div><span class="eyebrow">A Focused Publishing Model</span><h2 class="h-lg">Fewer games. More attention.</h2></div>
  <div style="display:grid;gap:18px"><p class="lead">GamerVault deliberately keeps a selective catalogue. Every title receives senior attention and a dedicated launch plan, rather than competing for resources inside a large portfolio.</p><p class="lead">That focus means we say no more often than we say yes, and that each game we take on gets the care it needs to succeed in a new market.</p></div>
</div></section>
<section class="section rule-top"><div class="wrap">
  <div class="section-head"><div><span class="eyebrow">Mission</span><h2 class="h-lg">"To help global studios succeed in India and Indian game makers sell to the world."</h2></div></div>
  <div class="grid-2">
    <div class="card"><span class="icon-sq">${I.map}</span><h3>Bengaluru, India</h3><p>Our home base for publishing in India.</p></div>
    <div class="card"><span class="icon-sq">${I.globe}</span><h3>London, United Kingdom</h3><p>Our base for international partnerships.</p></div>
  </div>
</div></section>
${finalCta(L)}`,
  });
}

/* ---------------- PARTNERS ---------------- */
function partners() {
  const cats = ["Mobile app stores", "Alternative Android distribution platforms", "Telecom operators", "Cloud gaming providers", "Browser gaming portals", "Hospitality and in-room entertainment", "Gaming communities", "Creators and influencers", "Publishers and game studios"];
  layoutWrite("partners.html", {
    title: "Distribution partners and publishers",
    description: "Partner with GamerVault to distribute games in India and beyond: app stores, telecom operators, cloud gaming, browser portals, hospitality, creators and publishers.",
    active: "partners.html",
    body: (L) => `
<section class="page-hero"><div class="wrap"><span class="eyebrow">For Publishers &amp; Partners</span><h1 class="h-lg" style="max-width:18ch">Distribution partnerships that bring games to players.</h1><p class="lead">GamerVault is exploring and developing distribution opportunities across a range of channels. If you reach players, or publish games, let's talk.</p><div class="actions"><a class="btn btn-primary" href="#enquiry">Discuss a Distribution Partnership ${I.arrow}</a></div></div></section>
<section class="section"><div class="wrap">
  <div class="section-head"><div><span class="eyebrow">Partner categories</span><h2 class="h-lg">Who we want to work with</h2><p class="lead">These are categories we are actively exploring. We do not list any company as a partner without a confirmed agreement and its approval.</p></div></div>
  <div class="grid-3">${cats.map((c, i) => `<div class="card"><span class="num">0${i + 1}</span><h3>${c}</h3></div>`).join("")}</div>
</div></section>
<section class="section rule-top" id="enquiry"><div class="wrap two-col">
  <div><span class="eyebrow">Partner enquiry</span><h2 class="h-lg">Discuss a Distribution Partnership</h2><p class="lead" style="margin-top:16px">Tell us about your platform or business and the opportunity you have in mind. We reply to every serious enquiry.</p></div>
  <form class="form form-card" data-form="partner-enquiry" novalidate data-success-title="Thank you. Your enquiry has been received." data-success="We will review it and reply to your business email.">
    ${protoFlag()}
    <div class="form-grid">
      ${field({ id: "p_company", label: "Company name", required: true, attrs: 'autocomplete="organization"' })}
      ${field({ id: "p_name", label: "Contact name", required: true, attrs: 'autocomplete="name"' })}
      ${field({ id: "p_email", label: "Business email", type: "email", required: true, attrs: 'autocomplete="email"' })}
      ${field({ id: "p_website", label: "Company website", type: "url", placeholder: "https://" })}
      ${field({ id: "p_country", label: "Country", required: true })}
      ${field({ id: "p_category", label: "Partnership category", type: "select", required: true, options: [...cats, "Other"] })}
      ${field({ id: "p_message", label: "Description of the opportunity", type: "textarea", required: true, full: true, attrs: 'minlength="30"' })}
      ${consent(L, "p-consent")}
    </div>
    ${hp()}
    <button class="btn btn-primary" type="submit" style="justify-self:start">Discuss a Distribution Partnership</button>
    <div class="form-status" role="status" aria-live="polite"></div>
  </form>
</div></section>`,
  });
}

/* ---------------- CONTACT ---------------- */
function contact() {
  const types = [
    [I.mail, "General business enquiries", "Questions about GamerVault and what we do.", "General business enquiry"],
    [I.game, "Game submission", "Share your game for review.", null],
    [I.globe, "International publishing enquiries", "Indian studios seeking global reach, or global studios eyeing India.", "International publishing enquiry"],
    [I.handshake, "Distribution partnership enquiries", "Platforms, operators, portals and partners.", null],
    [I.pen, "Media and editorial enquiries", "Press, interviews and contributions to Insights.", "Media and editorial enquiry"],
  ];
  layoutWrite("contact.html", {
    title: "Contact GamerVault",
    description: "Contact GamerVault about game submissions, international publishing, distribution partnerships, media or general business enquiries. Bengaluru and London.",
    active: "contact.html",
    body: (L) => `
<section class="page-hero"><div class="wrap"><span class="eyebrow">Contact</span><h1 class="h-lg">Let's talk about your game.</h1><p class="lead">Choose the topic that fits best, or send us a message below.</p>
<p class="copy-line" style="margin-top:22px">${I.mail.replace("<svg", '<svg width="20" height="20"')} <span>${site.email}</span> <button class="copy-btn" type="button" data-copy-text="${site.email}">Copy</button></p>
<p class="mono muted" style="margin-top:10px">${site.locations.join(" | ")}</p></div></section>
<section class="section-tight"><div class="wrap">
  <div class="contact-tiles">${types.map(([ic, t, d, val]) => `<a class="card" style="text-decoration:none;color:var(--fg)" href="${val ? "#message" : t.startsWith("Game") ? L("submit.html") : L("partners.html#enquiry")}"><span class="icon-sq">${ic}</span><h3 style="font-size:18px">${t}</h3><p>${d}</p></a>`).join("")}</div>
</div></section>
<section class="section-tight" id="message"><div class="wrap two-col">
  <div><span class="eyebrow">Send a message</span><h2 class="h-lg">Write to us</h2><p class="lead" style="margin-top:16px">We read every message and reply by email. For game reviews, the <a href="${L("submit.html")}">submission form</a> gives us everything we need in one go.</p></div>
  <form class="form form-card" data-form="contact" novalidate data-success-title="Thank you. Your message has been received." data-success="We will reply to your email as soon as we can.">
    ${protoFlag()}
    <div class="form-grid">
      ${field({ id: "c_type", label: "Enquiry type", type: "select", required: true, options: ["General business enquiry", "Game submission", "International publishing enquiry", "Distribution partnership enquiry", "Media and editorial enquiry"] })}
      ${field({ id: "c_name", label: "Your name", required: true, attrs: 'autocomplete="name"' })}
      ${field({ id: "c_email", label: "Email", type: "email", required: true, attrs: 'autocomplete="email"' })}
      ${field({ id: "c_company", label: "Company", attrs: 'autocomplete="organization"' })}
      ${field({ id: "c_message", label: "Message", type: "textarea", required: true, full: true, attrs: 'minlength="20"' })}
      ${consent(L, "c-consent")}
    </div>
    ${hp()}
    <button class="btn btn-primary" type="submit" style="justify-self:start">Send message</button>
    <div class="form-status" role="status" aria-live="polite"></div>
  </form>
</div></section>`,
  });
}

/* ---------------- LEGAL + 404 ---------------- */
function legal() {
  const upd = fmtDate(TODAY);
  layoutWrite("privacy.html", {
    title: "Privacy Policy",
    description: "How GamerVault collects, uses and protects personal information submitted through this website.",
    body: (L) => `<section class="page-hero"><div class="wrap"><span class="eyebrow">Legal</span><h1 class="h-lg">Privacy Policy</h1><p class="muted" style="margin-top:12px">Last updated ${upd}</p></div></section>
<section class="section-tight"><div class="wrap"><div class="prose">
<p>This policy explains how ${site.legalName} ("GamerVault", "we") handles personal information collected through this website.</p>
<h2 id="what">What we collect</h2><ul><li>Details you submit in our forms: name, business email, company, country, website and information about your game or enquiry.</li><li>Your email address if you subscribe to our newsletter.</li><li>Basic technical information that our hosting provider records automatically, such as IP address and browser type, for security and reliability.</li></ul>
<h2 id="use">How we use it</h2><ul><li>To review game submissions and respond to enquiries.</li><li>To send the newsletter you asked for. You can unsubscribe at any time.</li><li>To keep the website secure and working.</li></ul><p>We do not sell personal information.</p>
<h2 id="cookies">Cookies and storage</h2><p>This website does not use advertising or tracking cookies. It uses your browser's session storage only to remember that you have closed the Inkling announcement during your visit.</p>
<h2 id="sharing">Sharing</h2><p>We use trusted service providers to host the website and receive form submissions. They process data on our behalf and only as needed to provide their service.</p>
<h2 id="retention">Retention</h2><p>We keep enquiries and submissions only as long as needed to respond and to pursue any resulting business discussion, unless the law requires longer.</p>
<h2 id="rights">Your rights</h2><p>You can ask to access, correct or delete your personal information, or withdraw consent, by emailing <b>${site.email}</b>. We handle requests in line with applicable law, including India's Digital Personal Data Protection Act, 2023 and, where relevant, UK data protection law.</p>
<h2 id="contact">Contact</h2><p>Questions about this policy: <b>${site.email}</b>.</p>
</div></div></section>`,
  });
  layoutWrite("terms.html", {
    title: "Terms of Use",
    description: "Terms governing the use of the GamerVault website.",
    body: (L) => `<section class="page-hero"><div class="wrap"><span class="eyebrow">Legal</span><h1 class="h-lg">Terms of Use</h1><p class="muted" style="margin-top:12px">Last updated ${upd}</p></div></section>
<section class="section-tight"><div class="wrap"><div class="prose">
<p>By using this website you agree to these terms. If you do not agree, please do not use the site.</p>
<h2 id="info">Information only</h2><p>Content on this site, including India Gaming Insights articles, is general information. It is not legal, financial or investment advice. Draft articles are marked as such and may change.</p>
<h2 id="catalogue">Game catalogue</h2><p>Entries labelled "Demo" are sample content created to demonstrate the catalogue. They are not games published or distributed by GamerVault and are not available to play or download. Inkling is in development and has not been released.</p>
<h2 id="submissions">Submissions</h2><p>Submitting a game or enquiry does not create a publishing agreement or any obligation for either party. Any publishing relationship is subject to a separate written agreement. Please do not send confidential material, passwords or credentials through this website.</p>
<h2 id="ip">Intellectual property</h2><p>The GamerVault name, logo and site content belong to ${site.legalName}. Games and trademarks of other companies belong to their owners.</p>
<h2 id="links">Links</h2><p>We link to third-party sources for reference. We are not responsible for their content.</p>
<h2 id="liability">Liability</h2><p>The site is provided as is. To the extent permitted by law, we are not liable for losses arising from its use.</p>
<h2 id="law">Governing law</h2><p>These terms are governed by the laws of India, with courts in Bengaluru having jurisdiction.</p>
<h2 id="contact">Contact</h2><p><b>${site.email}</b></p>
</div></div></section>`,
  });
  layoutWrite("404.html", {
    title: "Page not found",
    description: "This page could not be found.",
    body: (L) => `<section class="section"><div class="wrap notice-404"><div style="display:grid;gap:16px;justify-items:center"><span class="mono" style="color:var(--lime)">Error 404</span><h1 class="h-lg">This level doesn't exist.</h1><p class="lead">The page may have moved. Try the home page or browse games and insights.</p><div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center"><a class="btn btn-primary" href="${L("index.html")}">Go home</a><a class="btn btn-secondary" href="${L("games.html")}">Discover Games</a><a class="btn btn-secondary" href="${L("insights.html")}">Insights</a></div></div></div></section>`,
  });
}

/* ---------------- run ---------------- */
function layoutWrite(rel, opts) { write(rel, layout({ rel, ...opts })); }
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.copyFileSync(find("src/styles.css", "styles.css"), path.join(OUT, "assets/styles.css"));
fs.copyFileSync(find("src/app.js", "app.js"), path.join(OUT, "assets/app.js"));
if (fs.existsSync(path.join(ROOT, "public"))) fs.cpSync(path.join(ROOT, "public"), OUT, { recursive: true });
home(); discover(); developers(); submit(); insights(); about(); partners(); contact(); legal();
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${canonical(p)}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
console.log(`Built ${pages.length} pages into dist/ (${articles.length} articles, ${games.length} games).`);
