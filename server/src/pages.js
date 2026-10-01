/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

export function createPages(config) {
const shell = (title, body, { wide = false } = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<meta name="theme-color" content="#120f23">
<style>
:root{--bg:#0f0d1a;--card:#17142a;--border:#2a2444;--fg:#f3f0ff;--muted:#a8a1c7;--accent:#a78bfa;--accent-2:#7c6cf6;--ok:#4ade80;--warn:#fbbf24}
*{box-sizing:border-box}
html{color-scheme:dark}
body{margin:0;min-height:100vh;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Ubuntu,sans-serif;line-height:1.55;color:var(--fg);background:radial-gradient(1100px 520px at 15% -10%,#2b2250 0%,var(--bg) 55%) fixed}
a{color:var(--fg);text-decoration:none;border-bottom:1px solid var(--border);transition:.15s}
a:hover{color:var(--accent);border-color:var(--accent)}
main{max-width:${wide ? "1100px" : "760px"};margin:0 auto;padding:48px 16px 64px}
nav{display:flex;align-items:center;gap:14px;margin-bottom:40px}
nav img{width:40px;height:40px;border-radius:11px;box-shadow:0 8px 24px rgb(124 108 246 / 35%)}
nav .brand{font-weight:800;font-size:1.25rem;letter-spacing:-.02em;border:0}
nav .links{margin-left:auto;display:flex;gap:18px;font-size:.95rem}
nav .links a{border:0;color:var(--muted)}
nav .links a:hover{color:var(--fg)}
h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.1;letter-spacing:-.03em;margin:0 0 12px;background:linear-gradient(90deg,#fff 0%,var(--accent) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
h2{font-size:.9rem;text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin:0 0 10px}
p{color:var(--muted);margin:0 0 12px}
.lead{font-size:1.15rem}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 24px;margin:16px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:12px;border:1px solid var(--border);background:var(--card);font-weight:600;transition:.15s}
.btn:hover{transform:translateY(-1px);border-color:var(--accent);color:var(--fg)}
.btn.primary{background:linear-gradient(135deg,var(--accent-2),var(--accent));border-color:transparent;color:#fff}
.btn.primary:hover{filter:brightness(1.08);color:#fff}
.row{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}
pre{background:#0b0914;border:1px solid var(--border);border-radius:12px;padding:14px 16px;overflow:auto;color:#e9e4ff}
code{background:#0b0914;border:1px solid var(--border);border-radius:6px;padding:1px 6px}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;padding:4px 10px;border-radius:999px;background:#1f1a36;border:1px solid var(--border);color:var(--muted)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 10px var(--ok)}
input[type=search]{width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--fg);font:inherit;outline:none}
input[type=search]:focus{border-color:var(--accent)}
.plugin{display:flex;flex-direction:column;gap:6px}
.plugin b{font-size:1.02rem}
.plugin small{color:var(--muted)}
.tags{display:flex;flex-wrap:wrap;gap:6px}
footer{margin-top:48px;color:var(--muted);font-size:.85rem;text-align:center}
@media (max-width:600px){nav .links{display:none}}
</style>
</head>
<body>
<main>
<nav>
<img src="/assets/icon.svg" alt="">
<a class="brand" href="/">${escapeHtml(config.siteName)}</a>
<div class="links"><a href="/plugins">Plugins</a><a href="/download">Download</a><a href="/privacy">Privacy</a><a href="https://github.com/${escapeHtml(config.githubRepo)}">GitHub</a></div>
</nav>
${body}
<footer>${escapeHtml(config.siteName)} is a fork of <a href="https://github.com/Equicord/Equicord">Equicord</a> and <a href="https://github.com/Vendicated/Vencord">Vencord</a>. Not affiliated with Discord.</footer>
</main>
</body>
</html>`;

const page = (title, body) => shell(`${title} · ${config.siteName}`, `<h1>${escapeHtml(title)}</h1>${body}`);

const landing = ({ userCount }) => shell(config.siteName, `
<span class="badge"><span class="dot"></span> cloud online · ${userCount} connected account${userCount === 1 ? "" : "s"}</span>
<h1 style="margin-top:14px">Discord, but cozier.</h1>
<p class="lead">${escapeHtml(config.siteName)} is a Discord client mod with hundreds of plugins, custom themes, and its own self hosted cloud so your settings follow you everywhere.</p>
<div class="row">
<a class="btn primary" href="/download">Download</a>
<a class="btn" href="/plugins">Browse plugins</a>
<a class="btn" href="https://github.com/${escapeHtml(config.githubRepo)}">Source code</a>
</div>
<div class="grid">
<div class="card"><h2>Cloud sync</h2><p>Settings, QuickCSS and plugin data sync between every device you use, stored on this server and nowhere else.</p></div>
<div class="card"><h2>Hundreds of plugins</h2><p>Everything from Equicord and Vencord, ready to toggle from the settings panel with no extra downloads.</p></div>
<div class="card"><h2>Yours to run</h2><p>This instance runs on a single Node process with an SQLite file. Point your own build at it with one environment variable.</p></div>
</div>
<div class="card">
<h2>Connect this server</h2>
<p>In Discord open <b>Settings → ${escapeHtml(config.siteName)} → Cloud</b>, paste the URL below as the backend and turn on Cloud Integration.</p>
<pre>${escapeHtml(config.publicUrl)}/</pre>
</div>`);

const privacy = () => page("Privacy", `
<div class="card">
<h2>What this server stores</h2>
<p>When you connect through Discord OAuth, the server stores your Discord user id and username plus a random secret that your client uses to authenticate. No access tokens are kept. The token is revoked immediately after your profile is fetched.</p>
<p>When settings sync is on, the server stores the data your client uploads: your ${escapeHtml(config.siteName)} settings, QuickCSS and plugin data. It is stored as opaque blobs and never inspected or shared.</p>
</div>
<div class="card">
<h2>Deleting your data</h2>
<p>Open <b>Settings → ${escapeHtml(config.siteName)} → Cloud</b> and use <b>Delete Cloud Settings</b> or <b>Delete Cloud Account</b>. Both remove everything tied to your account from this server instantly.</p>
</div>
<div class="card">
<h2>Logs</h2>
<p>The server logs request paths and status codes for troubleshooting. It does not log request bodies or authorization headers.</p>
</div>`);

const download = () => page("Download", `
<div class="card">
<h2>Desktop</h2>
<p>Grab the latest build from GitHub, then run the installer or copy the <code>desktop.asar</code> into your Discord install using the instructions in the README.</p>
<div class="row"><a class="btn primary" href="https://github.com/${escapeHtml(config.githubRepo)}/releases/latest">Latest release</a><a class="btn" href="/release/desktop.asar">desktop.asar</a><a class="btn" href="/release/equibop.asar">equibop.asar</a></div>
</div>
<div class="card">
<h2>Browser</h2>
<div class="row"><a class="btn" href="/release/browser.zip">Chromium extension (zip)</a><a class="btn" href="/release/browser.xpi">Firefox extension (xpi)</a><a class="btn" href="/release/SnoreClient.user.js">Userscript</a></div>
</div>
<div class="card">
<h2>Build it yourself</h2>
<pre>git clone https://github.com/${escapeHtml(config.githubRepo)}
cd SnoreClient
pnpm install --frozen-lockfile
SNORECLIENT_SERVER_URL=${escapeHtml(config.publicUrl)} pnpm build
pnpm inject</pre>
</div>`);

const plugins = list => shell(`Plugins · ${config.siteName}`, `
<h1>Plugins</h1>
<p class="lead">${list.length} plugins ship with ${escapeHtml(config.siteName)}. Search by name, description, or author.</p>
<input type="search" id="q" placeholder="Search plugins…" autofocus>
<div class="grid" id="list" style="margin-top:18px"></div>
<script>
const plugins = ${JSON.stringify(list.map(p => ({ name: p.name, description: p.description, authors: (p.authors ?? []).map(a => a.name), tags: p.tags ?? [], target: p.target })))};
const list = document.getElementById("list"), q = document.getElementById("q");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function render() {
    const needle = q.value.trim().toLowerCase();
    const rows = plugins.filter(p => !needle || [p.name, p.description, ...p.authors].join(" ").toLowerCase().includes(needle));
    list.innerHTML = rows.map(p => \`<a class="card plugin" href="/plugins/\${encodeURIComponent(p.name)}" style="border-bottom:1px solid var(--border)"><b>\${esc(p.name)}</b><span style="color:var(--muted)">\${esc(p.description)}</span><small>by \${esc(p.authors.join(", "))}\${p.target ? " · " + esc(p.target) : ""}</small></a>\`).join("") || '<p>No plugins match.</p>';
}
q.addEventListener("input", render);
const initial = new URLSearchParams(location.search).get("q"); if (initial) q.value = initial;
render();
</script>`, { wide: true });

const plugin = p => page(p.name, `
<p class="lead">${escapeHtml(p.description)}</p>
<div class="card">
<h2>Authors</h2>
<p>${escapeHtml((p.authors ?? []).map(a => a.name).join(", ") || "Unknown")}</p>
${p.target ? `<h2>Platform</h2><p>${escapeHtml(p.target)}</p>` : ""}
${p.tags?.length ? `<h2>Tags</h2><div class="tags">${p.tags.map(t => `<span class="badge">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
</div>
<div class="card">
<h2>How to enable</h2>
<p>Open <b>Settings → ${escapeHtml(config.siteName)} → Plugins</b> and search for <code>${escapeHtml(p.name)}</code>.</p>
</div>
<p><a href="/plugins">← All plugins</a></p>`);

return { page, landing, privacy, download, plugins, plugin };
}
