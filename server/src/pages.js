/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

export function createPages(config) {
const shell = (title, body, { wide = false, hero = false } = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(config.siteName)} is a Discord client mod with hundreds of plugins, a theme builder and its own cloud.">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<meta name="theme-color" content="#070a12">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,300;1,400&display=swap" rel="stylesheet">
<style>
:root{--bg:#070a12;--bg2:#0b1020;--card:rgba(255,255,255,.035);--card-border:rgba(255,255,255,.08);--fg:#f4f6fb;--muted:#9aa3b8;--accent:#8ab4ff;--accent-2:#5b8cff;--accent-3:#a78bfa;--ok:#4ade80;--warn:#fbbf24}
*{box-sizing:border-box}
html{color-scheme:dark;scroll-behavior:smooth}
body{margin:0;min-height:100vh;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.55;color:var(--fg);background:var(--bg);overflow-x:hidden}
body::before{content:"";position:fixed;inset:0;z-index:-2;background:
 radial-gradient(900px 520px at 18% -10%,rgba(91,140,255,.22),transparent 60%),
 radial-gradient(700px 480px at 85% 10%,rgba(167,139,250,.14),transparent 60%),
 radial-gradient(900px 700px at 50% 110%,rgba(91,140,255,.10),transparent 60%),
 linear-gradient(180deg,#0a0f1e 0%,var(--bg) 40%,#05070d 100%)}
body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.35;background-image:radial-gradient(rgba(255,255,255,.08) 1px,transparent 1px);background-size:26px 26px;mask-image:radial-gradient(ellipse at 50% 0%,#000 0%,transparent 70%)}
a{color:var(--fg);text-decoration:none;transition:color .15s}
a:hover{color:var(--accent)}
main{max-width:${wide ? "1180px" : "860px"};margin:0 auto;padding:0 20px 80px}
nav{position:sticky;top:14px;z-index:10;display:flex;align-items:center;gap:6px;margin:14px auto 0;max-width:900px;padding:8px 10px 8px 12px;border-radius:999px;background:rgba(10,14,26,.72);border:1px solid var(--card-border);backdrop-filter:blur(18px) saturate(140%);box-shadow:0 10px 40px rgba(0,0,0,.35)}
nav img{width:30px;height:30px;border-radius:9px}
nav .brand{font-weight:700;font-size:.98rem;margin-right:14px;letter-spacing:-.01em}
nav .links{display:flex;gap:4px;flex:1}
nav .links a{padding:7px 12px;border-radius:999px;font-size:.88rem;color:var(--muted);font-weight:500}
nav .links a:hover{color:var(--fg);background:rgba(255,255,255,.06)}
nav .cta{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid var(--card-border);font-size:.88rem;font-weight:600}
nav .cta:hover{background:rgba(255,255,255,.14);color:#fff}
h1{font-size:clamp(2.4rem,6vw,4.2rem);line-height:1.04;letter-spacing:-.035em;margin:0 0 14px;font-weight:800}
h1 em{font-style:italic;font-weight:300;letter-spacing:-.02em}
.hl{background:linear-gradient(90deg,#9ec1ff,#6f9bff 60%,#b9a7ff);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 40px rgba(111,155,255,.35)}
h2{font-size:clamp(1.7rem,3.6vw,2.4rem);letter-spacing:-.03em;line-height:1.1;margin:0 0 10px;font-weight:800}
h3{font-size:1.05rem;margin:0 0 6px;font-weight:700;letter-spacing:-.01em}
.eyebrow{font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
p{color:var(--muted);margin:0 0 12px}
.lead{font-size:1.12rem;max-width:620px}
.center{text-align:center}
.center .lead{margin-left:auto;margin-right:auto}
.hero{padding:96px 0 60px;text-align:center}
.hero .lead{font-size:1.2rem;margin-left:auto;margin-right:auto}
.hero .row,.cta-band .row{justify-content:center}
.row{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}
.center .row{justify-content:center}
.btn{display:inline-flex;align-items:center;gap:9px;padding:13px 22px;border-radius:999px;border:1px solid var(--card-border);background:rgba(255,255,255,.06);font-weight:600;font-size:.98rem;transition:.18s;backdrop-filter:blur(10px)}
.btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.18)}
.btn.primary{background:#fff;color:#0b1020;border-color:#fff}
.btn.primary:hover{background:#e9efff;color:#0b1020}
.btn svg{width:18px;height:18px}
.stats{color:var(--muted);font-size:1rem;margin-top:26px}
.stats b{color:var(--fg)}
.section{padding:70px 0 10px}
.section-head{text-align:center;max-width:620px;margin:0 auto 34px}
.icon-ring{width:76px;height:76px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 30% 30%,rgba(138,180,255,.35),rgba(138,180,255,.06));border:1px solid rgba(138,180,255,.25);box-shadow:0 0 50px rgba(91,140,255,.25)}
.icon-ring svg{width:32px;height:32px;color:#cfe0ff}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}
.grid.three{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.card{position:relative;background:var(--card);border:1px solid var(--card-border);border-radius:20px;padding:24px;transition:.2s;overflow:hidden}
.card:hover{border-color:rgba(138,180,255,.35);transform:translateY(-2px);box-shadow:0 20px 60px rgba(0,0,0,.35)}
.card .ico{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.06);border:1px solid var(--card-border);margin-bottom:16px}
.card .ico svg{width:20px;height:20px;color:#dbe6ff}
.card.tint-green{background:linear-gradient(160deg,rgba(29,185,84,.14),var(--card) 55%)}
.card.tint-blue{background:linear-gradient(160deg,rgba(91,140,255,.16),var(--card) 55%)}
.card.tint-purple{background:linear-gradient(160deg,rgba(167,139,250,.16),var(--card) 55%)}
.card.tint-pink{background:linear-gradient(160deg,rgba(244,114,182,.14),var(--card) 55%)}
.card.tint-amber{background:linear-gradient(160deg,rgba(251,191,36,.12),var(--card) 55%)}
.card.tint-cyan{background:linear-gradient(160deg,rgba(34,211,238,.12),var(--card) 55%)}
.card b{color:var(--fg)}
.k-green{color:#4ade80}.k-blue{color:#8ab4ff}.k-purple{color:#c4b5fd}.k-pink{color:#f9a8d4}.k-amber{color:#fcd34d}.k-cyan{color:#67e8f9}
.split{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;padding:60px 0}
.split.flip > :first-child{order:2}
@media (max-width:820px){.split{grid-template-columns:1fr}.split.flip > :first-child{order:0}}
.mock{background:#0d1222;border:1px solid var(--card-border);border-radius:18px;padding:16px;box-shadow:0 30px 80px rgba(0,0,0,.45)}
.mock .bar{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.mock .bar img{width:34px;height:34px;border-radius:50%}
.mock .bar b{font-size:.92rem}
.mock .app{font-size:.62rem;font-weight:700;padding:1px 6px;border-radius:5px;background:#5b8cff;color:#fff;margin-left:6px}
.mock .bar span{color:var(--muted);font-size:.78rem}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tile{background:#121a30;border:1px solid var(--card-border);border-radius:12px;padding:12px}
.tile small{display:block;color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.08em}
.tile strong{font-size:1.35rem;letter-spacing:-.02em;color:#cfe0ff}
.bars{margin-top:8px;display:flex;flex-direction:column;gap:6px}
.bar-row{display:flex;align-items:center;gap:8px;font-size:.78rem;color:var(--muted)}
.bar-row i{flex:1;height:8px;border-radius:999px;background:linear-gradient(90deg,#5b8cff,#a78bfa);display:block;opacity:.9}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid var(--card-border);color:var(--muted)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 10px var(--ok)}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em}
pre{background:#0a0e1a;border:1px solid var(--card-border);border-radius:14px;padding:14px 16px;overflow:auto;color:#e6ecff}
code{background:rgba(255,255,255,.06);border:1px solid var(--card-border);border-radius:6px;padding:1px 6px}
input[type=search]{width:100%;padding:14px 16px;border-radius:999px;border:1px solid var(--card-border);background:rgba(255,255,255,.05);color:var(--fg);font:inherit;outline:none}
input[type=search]:focus{border-color:var(--accent)}
.plugin{display:flex;flex-direction:column;gap:6px}
.plugin small{color:var(--muted)}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.cta-band{margin-top:70px;text-align:center;padding:60px 24px;border-radius:28px;border:1px solid var(--card-border);background:radial-gradient(600px 300px at 50% 0%,rgba(91,140,255,.25),transparent 70%),var(--card)}
footer{margin-top:60px;color:var(--muted);font-size:.85rem;text-align:center}
footer a{color:var(--muted)}
.reveal{opacity:0;transform:translateY(14px);animation:rise .7s ease forwards}
@keyframes rise{to{opacity:1;transform:none}}
@media (max-width:600px){nav .links{display:none}nav{margin-top:10px}.hero{padding:64px 0 40px}}
</style>
</head>
<body>
<main>
<nav>
<img src="/assets/icon.svg" alt="">
<a class="brand" href="/">${escapeHtml(config.siteName)}</a>
<div class="links"><a href="/plugins">Plugins</a><a href="/dashboard">Dashboard</a><a href="/accounts">Accounts</a><a href="/download">Download</a><a href="/privacy">Privacy</a><a href="/status">Status</a><a href="https://github.com/${escapeHtml(config.githubRepo)}">GitHub</a></div>
<a class="cta" href="/dashboard" style="margin-right:6px;background:transparent">Log in</a>
<a class="cta" href="/download"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>Download</a>
</nav>
${body}
<footer>${escapeHtml(config.siteName)} is built on <a href="https://github.com/Equicord/Equicord">Equicord</a> and <a href="https://github.com/Vendicated/Vencord">Vencord</a>. Not affiliated with Discord. · <a href="/privacy">Privacy</a> · <a href="https://github.com/${escapeHtml(config.githubRepo)}">Source</a></footer>
</main>
</body>
</html>`;

const page = (title, body) => shell(`${title} · ${config.siteName}`, `<h1>${escapeHtml(title)}</h1>${body}`);

const liveWidget = () => `
<div class="card" id="live-card" style="margin-top:18px">
<h3 style="font-size:1.1rem"><span class="dot" id="live-dot" style="display:inline-block;vertical-align:middle;margin-right:8px"></span>Online now · <span id="live-count">…</span></h3>
<div id="live-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><span class="badge">connecting…</span></div>
</div>
<script>
(() => {
  const dot = document.getElementById("live-dot"), count = document.getElementById("live-count"), list = document.getElementById("live-list");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const ago = t => { const s = Math.floor((Date.now() - t) / 1000); return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + " min" : Math.floor(s / 3600) + " h"; };
  function render(p) {
    count.textContent = p.count + (p.viewers ? " · " + p.viewers + " watching" : "");
    list.innerHTML = p.online.length ? p.online.map(u => '<span class="badge"><span class="dot"></span>' + esc(u.username) + ' <span style="opacity:.6">' + ago(u.since) + '</span></span>').join("") : '<span class="badge">nobody online right now</span>';
  }
  let retry = 1000;
  function connect() {
    const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/v1/live");
    ws.onopen = () => { retry = 1000; dot.style.background = "var(--ok)"; };
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.type === "hello" || m.type === "presence") render(m); };
    ws.onclose = () => { dot.style.background = "var(--muted)"; setTimeout(connect, retry = Math.min(retry * 2, 30000)); };
    setInterval(() => { if (ws.readyState === 1) ws.send("ping"); }, 25000);
  }
  connect();
})();
</script>`;

const svg = {
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 .4-9A7 7 0 0 0 4.3 12.5 3.5 3.5 0 0 0 5.5 19Z"/></svg>',
    plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6m6-6v6M5 8h14l-1 5a6 6 0 0 1-12 0Z"/><path d="M12 19v3"/></svg>',
    brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 4 6 6-8.5 8.5a3 3 0 0 1-4.2 0L5.5 16.7a3 3 0 0 1 0-4.2Z"/><path d="M4 21c2-1 2.5-2 3-4"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2 5.5L19.5 10 14 12l-2 5.5L10 12l-5.5-2L10 8.5Z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z"/><path d="M10 21h4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
};

const fmt = n => Number(n || 0).toLocaleString("en-US");

const landing = ({ userCount, pluginCount = 0 }) => shell(config.siteName, `
<section class="hero reveal">
<h1><em>${escapeHtml(config.siteName)}</em> <img src="/assets/icon.svg" alt="" style="width:.9em;height:.9em;vertical-align:-.12em;border-radius:22%"> is Discord's<br><span class="hl">cozy all-in-one</span> client.</h1>
<p class="lead">Hundreds of plugins, a theme builder, dev cards, 24/7 voice, ghost ping logs and your own cloud. Everything your Discord was missing, in one install.</p>
<div class="row">
<a class="btn primary" href="/download">${svg.download}Download for Windows</a>
<a class="btn" href="/plugins">Browse plugins <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></a>
</div>
<p class="stats">Powering <b>${fmt(userCount)}</b> connected account${userCount === 1 ? "" : "s"} with <b>${fmt(pluginCount)}</b> plugins · <b id="hero-online">…</b> online right now</p>
</section>

<section class="section">
<div class="section-head">
<div class="icon-ring">${svg.plug}</div>
<h2><span class="hl">Features</span> that go deep</h2>
<p class="lead">Look at what you already use in Discord, then add the parts that were missing.</p>
</div>
<div class="grid three">
<div class="card tint-blue"><div class="ico">${svg.cloud}</div><h3>Your own cloud</h3><p>Settings, QuickCSS and plugin data <b class="k-blue">sync between every device</b>, with live presence so you can see who is online.</p></div>
<div class="card tint-purple"><div class="ico">${svg.brush}</div><h3>Theme Builder</h3><p>Pick colors, fonts, corner radius, glass blur and a wallpaper. <b class="k-purple">Preview live</b>, then save or share the theme.</p></div>
<div class="card tint-green"><div class="ico">${svg.mic}</div><h3>24/7 voice</h3><p>Sit in a voice channel around the clock, <b class="k-green">muted and deafened</b>, and rejoin automatically after any disconnect.</p></div>
<div class="card tint-pink"><div class="ico">${svg.bell}</div><h3>Ghost ping log</h3><p>Every deleted or edited ping gets logged to a <b class="k-pink">.txt file</b> with who, where and what they said.</p></div>
<div class="card tint-amber"><div class="ico">${svg.eye}</div><h3>Private mode</h3><p>One hotkey blurs <b class="k-amber">names, avatars and messages</b> so you can stream or screenshot safely.</p></div>
<div class="card tint-cyan"><div class="ico">${svg.sparkle}</div><h3>Dev cards</h3><p>Click any plugin author to see their <b class="k-cyan">badges, bio, connections</b> and every plugin they wrote.</p></div>
</div>
</section>

<section class="split">
<div>
<div class="eyebrow">Dashboard</div>
<h2>Advanced <span class="hl">statistics</span>, built right in</h2>
<p class="lead">${escapeHtml(config.siteName)} tracks messages, pings, voice time and uptime locally, then shows it as clean tiles inside Discord's settings, right next to one click switches for every feature.</p>
<div class="chips"><span class="badge">Messages sent</span><span class="badge">Time in voice</span><span class="badge">Busiest channels</span><span class="badge">Online on cloud</span></div>
</div>
<div class="mock">
<div class="bar"><img src="/assets/icon.png" alt=""><b>${escapeHtml(config.siteName)}<span class="app">APP</span></b><span>Dashboard</span></div>
<div class="tiles">
<div class="tile"><small>Messages sent</small><strong>41.6K</strong></div>
<div class="tile"><small>Time in voice</small><strong>128h</strong></div>
<div class="tile"><small>Plugins on</small><strong>97 / 356</strong></div>
</div>
<div class="bars">
<div class="bar-row">#general <i style="max-width:100%"></i> 21.4K</div>
<div class="bar-row">#dev-talk <i style="max-width:62%"></i> 11.2K</div>
<div class="bar-row">#memes <i style="max-width:38%"></i> 5.9K</div>
</div>
</div>
</section>

<section class="split flip">
<div>
<div class="eyebrow">Cloud</div>
<h2>A cloud that <span class="hl">actually goes live</span></h2>
<p class="lead">Connect once with Discord login. From then on your setup follows you to every machine, and the Online now list below updates the second someone opens Discord.</p>
<div class="row"><a class="btn" href="/accounts">See who's connected</a></div>
</div>
<div>${liveWidget()}</div>
</section>

<section class="section">
<div class="section-head">
<div class="icon-ring">${svg.bolt}</div>
<h2>Countless <span class="hl">more features</span></h2>
<p class="lead">Never worry about needing another client mod. ${escapeHtml(config.siteName)} covers the tools you actually use.</p>
</div>
<div class="grid three">
<div class="card"><div class="ico">${svg.shield}</div><h3>Moderation shortcuts</h3><p>Quick Warn fills in a user's id and sends your bot's warn command. Snipe shows the last deleted message with <code>/snipe</code>.</p></div>
<div class="card"><div class="ico">${svg.chart}</div><h3>Auto everything</h3><p>Away replies while idle, GIF auto responses for chosen friends, animated status, reminders that jump back to a message.</p></div>
<div class="card"><div class="ico">${svg.moon}</div><h3>Looks the part</h3><p>3D status orbs, a redesigned settings panel, window opacity, always on top, and streamer mode that hides your hardware.</p></div>
</div>
</section>

<section class="cta-band reveal">
<h2>Ready when you are.</h2>
<p class="lead">One launcher. Picks your Discord, installs ${escapeHtml(config.siteName)}, keeps it updated, and starts Discord with it.</p>
<div class="row" style="justify-content:center">
<a class="btn primary" href="/release/SnoreClientLauncher.exe">${svg.download}SnoreClient Launcher</a>
<a class="btn" href="/download">All downloads</a>
</div>
<p style="font-size:.85rem">Windows, Linux, macOS and an unsigned iOS IPA. Unsigned on Windows, so SmartScreen may ask once.</p>
</section>
<script>
(async () => { try { const r = await fetch("/v1/live.json"); const d = await r.json(); const el = document.getElementById("hero-online"); if (el) el.textContent = d.count; } catch { } })();
</script>`, { wide: true });

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

const accounts = list => page("Connected accounts", `
<p class="lead">${list.length} account${list.length === 1 ? "" : "s"} connected to this ${escapeHtml(config.siteName)} cloud, most recently active first.</p>
${list.length ? `<div class="grid">${list.map(a => `
<div class="card">
<h2>${escapeHtml(a.username)}</h2>
<p><code>${escapeHtml(a.id)}</code></p>
<p>Connected ${escapeHtml(new Date(a.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }))}<br>
Last sync ${escapeHtml(new Date(a.last_seen_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }))}<br>
${a.data_count} synced ${a.data_count === 1 ? "entry" : "entries"}</p>
</div>`).join("")}</div>` : "<div class=\"card\"><p>No accounts yet, or this instance keeps its account list private.</p></div>"}
<p style="margin-top:18px">Raw data: <a href="/v1/accounts"><code>GET /v1/accounts</code></a> · live: <a href="/v1/live.json"><code>GET /v1/live.json</code></a> · <code>wss://${escapeHtml(new URL(config.publicUrl).host)}/v1/live</code></p>
${liveWidget()}`);

const dashboard = user => shell(`Dashboard · ${config.siteName}`, `
<style>
.dash{display:grid;grid-template-columns:260px 1fr;gap:20px;margin-top:28px}
@media (max-width:820px){.dash{grid-template-columns:1fr}}
.side{position:sticky;top:90px;align-self:start}
.side .card{padding:18px}
.side nav-item,.side .item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;color:var(--muted);font-weight:500;cursor:pointer}
.side .item:hover,.side .item.active{background:rgba(255,255,255,.06);color:var(--fg)}
.side .item svg{width:18px;height:18px}
.me{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.me img{width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,.12)}
.me b{display:block}
.me small{color:var(--muted)}
.panel{display:none}
.panel.active{display:block}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:14px 0 20px}
.kpi{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:16px}
.kpi small{display:block;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.08em}
.kpi strong{font-size:1.5rem;letter-spacing:-.02em;color:#cfe0ff}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--card-border)}
th{color:var(--muted);font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em}
.pill-ok{color:var(--ok)}.pill-off{color:var(--muted)}
.danger{border-color:rgba(244,114,182,.35)}
.btn.danger{background:rgba(244,114,182,.12);border-color:rgba(244,114,182,.4);color:#fbcfe8}
.vc-ctl{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--card-border)}
.vc-ctl:last-child{border-bottom:0}
.vc-ctl small{color:var(--muted)}
.sw{position:relative;width:46px;height:26px;flex-shrink:0}
.sw input{opacity:0;width:0;height:0}
.sw span{position:absolute;inset:0;border-radius:999px;background:rgba(255,255,255,.12);transition:.2s;cursor:pointer}
.sw span::before{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.2s}
.sw input:checked+span{background:var(--accent-2)}
.sw input:checked+span::before{transform:translateX(20px)}
.pl{display:flex;align-items:center;gap:12px;padding:10px 14px}
.pl .t{flex:1;min-width:0}
.pl .t small{color:var(--muted);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar-col{flex:1;background:linear-gradient(180deg,#8ab4ff,#5b8cff);border-radius:4px 4px 0 0;min-height:2px;opacity:.9}
.bar-col:hover{opacity:1;filter:brightness(1.2)}
.btn.danger:hover{background:rgba(244,114,182,.22);color:#fff}
</style>
<div class="dash">
<aside class="side">
<div class="card">
<div class="me"><img id="me-avatar" src="/assets/icon.png" alt=""><div><b id="me-name">${escapeHtml(user.username)}</b><small>@${escapeHtml(user.username)}</small></div></div>
<div class="item active" data-panel="overview">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><rect x='3' y='3' width='8' height='8' rx='2'/><rect x='13' y='3' width='8' height='5' rx='2'/><rect x='13' y='10' width='8' height='11' rx='2'/><rect x='3' y='13' width='8' height='8' rx='2'/></svg>"}Overview</div>
<div class="item" data-panel="data">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M17.5 19a4.5 4.5 0 0 0 .4-9A7 7 0 0 0 4.3 12.5 3.5 3.5 0 0 0 5.5 19Z'/></svg>"}Cloud data</div>
<div class="item" data-panel="stats">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M4 20V10m6 10V4m6 16v-7m4 7H2'/></svg>"}Statistics</div>
<div class="item" data-panel="controls">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z'/></svg>"}Controls</div>
<div class="item" data-panel="plugins">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M9 2v6m6-6v6M5 8h14l-1 5a6 6 0 0 1-12 0Z'/><path d='M12 19v3'/></svg>"}Plugins</div>
<div class="item" data-panel="devices">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><rect x='3' y='4' width='18' height='12' rx='2'/><path d='M8 20h8M12 16v4'/></svg>"}Devices</div>
<div class="item" data-panel="notifications">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z'/><path d='M10 21h4'/></svg>"}Notifications</div>
<div class="item" data-panel="ghost">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M5 21V11a7 7 0 0 1 14 0v10l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2Z'/><circle cx='9.5' cy='11' r='1'/><circle cx='14.5' cy='11' r='1'/></svg>"}Ghost pings</div>
<div class="item" data-panel="servers">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'/></svg>"}Servers</div>
<div class="item" data-panel="alerts">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M12 3v2M12 19v2M4 12H2M22 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4'/><circle cx='12' cy='12' r='4'/></svg>"}Alerts</div>
<div class="item" data-panel="snippets">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M8 7h8M8 12h8M8 17h5'/><rect x='4' y='3' width='16' height='18' rx='2'/></svg>"}Snippets</div>
<div class="item" data-panel="css">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16'/></svg>"}Quick CSS</div>
<div class="item" data-panel="backups">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M12 8v4l3 2'/><path d='M3 12a9 9 0 1 0 3-6.7'/><path d='M3 4v5h5'/></svg>"}Backups</div>
<div class="item" data-panel="activity">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><rect x='3' y='3' width='4' height='4'/><rect x='10' y='3' width='4' height='4'/><rect x='17' y='3' width='4' height='4'/><rect x='3' y='10' width='4' height='4'/><rect x='10' y='10' width='4' height='4'/><rect x='17' y='10' width='4' height='4'/><rect x='3' y='17' width='4' height='4'/><rect x='10' y='17' width='4' height='4'/></svg>"}Activity</div>
<div class="item" data-panel="news">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M4 5h16v14H4Z'/><path d='M8 9h8M8 13h5'/></svg>"}What's new</div>
<div class="item" data-panel="security">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z'/><path d='m9 12 2 2 4-4'/></svg>"}Security</div>
<div class="item" data-panel="messages">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M4 5h16v11H8l-4 4Z'/><path d='M8 9h8M8 12h5'/></svg>"}Message log</div>
<div class="item" data-panel="account">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><circle cx='12' cy='8' r='4'/><path d='M4 21a8 8 0 0 1 16 0'/></svg>"}Account</div>
<div style="border-top:1px solid var(--card-border);margin:10px 0"></div>
<a class="item" href="/logout">${"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M10 17l5-5-5-5M15 12H3M21 3v18'/></svg>"}Log out</a>
</div>
</aside>
<section>
<div class="panel active" id="panel-overview">
<div class="eyebrow">Dashboard</div><h2>Welcome back, <span class="hl" id="hello-name">${escapeHtml(user.username)}</span></h2>
<p>Your ${escapeHtml(config.siteName)} cloud at a glance.</p>
<div class="kpis">
<div class="kpi"><small>Status</small><strong id="k-online">…</strong></div>
<div class="kpi"><small>Last sync</small><strong id="k-sync">…</strong></div>
<div class="kpi"><small>Synced entries</small><strong id="k-entries">…</strong></div>
<div class="kpi"><small>Cloud storage</small><strong id="k-size">…</strong></div>
<div class="kpi"><small>Connected since</small><strong id="k-since">…</strong></div>
</div>
<div class="card" style="margin-bottom:14px"><h3>Last 30 days</h3><p style="font-size:.85rem">Messages sent per day, from the Statistics plugin.</p><div id="chart" style="display:flex;align-items:flex-end;gap:4px;height:120px"></div><div id="chart-labels" style="display:flex;justify-content:space-between;color:var(--muted);font-size:.72rem;margin-top:4px"></div></div>
${liveWidget()}
</div>
<div class="panel" id="panel-data">
<div class="eyebrow">Cloud data</div><h2>What's <span class="hl">synced</span></h2>
<p>Each entry is an opaque blob uploaded by your client. Versions go up on every change.</p>
<div class="card" style="padding:6px 0"><table><thead><tr><th>Key</th><th>Version</th><th>Size</th><th>Updated</th></tr></thead><tbody id="data-rows"><tr><td colspan="4">Loading…</td></tr></tbody></table></div>
<div class="row"><a class="btn" id="dl-json" href="#">Download as JSON</a></div>
</div>
<div class="panel" id="panel-stats">
<div class="eyebrow">Statistics</div><h2>Your <span class="hl">numbers</span></h2>
<p id="stats-note">Statistics are published by the SnoreClient app every few minutes while Cloud Integration is on.</p>
<div class="kpis" id="stats-kpis"></div>
<div class="card" id="stats-channels" style="display:none"><h3>Busiest channels</h3><div class="bars" id="stats-bars"></div></div>
</div>
<div class="panel" id="panel-controls">
<div class="eyebrow">Remote controls</div><h2>Control your <span class="hl">client</span> from here</h2>
<p>Changes are picked up by the SnoreClient app within two minutes. <span id="ctl-state" class="badge">…</span></p>
<div class="card" style="margin-top:10px">
<div class="vc-ctl"><div><b>Snore Discoverable</b><br><small>Show me in the Online now lists.</small></div><label class="sw"><input type="checkbox" id="ctl-discoverable"><span></span></label></div>
<div class="vc-ctl"><div><b>Private Mode</b><br><small>Blur names, avatars and messages in the app.</small></div><label class="sw"><input type="checkbox" id="ctl-private"><span></span></label></div>
<div class="vc-ctl"><div><b>Away Reply</b><br><small>Auto answer DMs while idle or on Do Not Disturb.</small></div><label class="sw"><input type="checkbox" id="ctl-away"><span></span></label></div>
<div class="vc-ctl" style="flex-direction:column;align-items:stretch"><b>Away message</b><div class="row" style="margin:8px 0 0"><input type="search" id="ctl-away-msg" placeholder="I'm away right now…" style="flex:1;border-radius:12px"><a class="btn" id="ctl-away-save" href="#">Save</a></div></div>
</div>
</div>
<div class="panel" id="panel-plugins">
<div class="eyebrow">Plugins</div><h2>Plugin <span class="hl">manager</span></h2>
<p id="pl-note">Toggle plugins from the web. The app applies changes within two minutes; plugins with patches need a Discord restart.</p>
<div class="row" style="margin:10px 0"><input type="search" id="pl-search" placeholder="Search plugins…" style="max-width:420px"><span class="badge" id="pl-count"></span></div>
<div id="pl-list" class="grid" style="grid-template-columns:1fr;gap:8px"><div class="card"><p>Loading…</p></div></div>
</div>
<div class="panel" id="panel-devices">
<div class="eyebrow">Devices</div><h2>Where you're <span class="hl">signed in</span></h2>
<p>Each client that syncs reports itself here.</p>
<div id="dev-list" class="grid"><div class="card"><p>Loading…</p></div></div>
<div class="card" style="margin-top:14px"><h3>Friends on SnoreClient online now</h3><div id="dev-online" class="chips"></div></div>
</div>
<div class="panel" id="panel-notifications">
<div class="eyebrow">Notification center</div><h2>Everything that <span class="hl">happened</span></h2>
<p id="nt-note">Mirrors the app's notification center: pings, keywords, friend changes, kicks, roles, and more.</p>
<div id="nt-list" class="grid" style="grid-template-columns:1fr;gap:8px"><div class="card"><p>Loading…</p></div></div>
</div>
<div class="panel" id="panel-ghost">
<div class="eyebrow">Ghost pings</div><h2>Who <span class="hl">ghost pinged</span> you</h2>
<p id="gp-note">Logged by the GhostPingLog plugin.</p>
<div class="card" style="padding:6px 0"><table><thead><tr><th>When</th><th>User</th><th>Where</th><th>How</th><th>Message</th></tr></thead><tbody id="gp-rows"><tr><td colspan="5">Loading…</td></tr></tbody></table></div>
</div>
<div class="panel" id="panel-messages">
<div class="eyebrow">Message log</div><h2>Deleted &amp; <span class="hl">edited</span> messages</h2>
<p id="ml-note">Logged by the MessageLogger plugin and uploaded by your client every five minutes. Turn it off under CloudPresence settings in the app.</p>
<div class="row" style="margin:10px 0"><input type="search" id="ml-search" placeholder="Filter by user, channel or text…" style="max-width:420px"><span class="badge" id="ml-count"></span></div>
<div id="ml-list" class="grid" style="grid-template-columns:1fr;gap:10px"><div class="card"><p>Loading…</p></div></div>
</div>
<div class="panel" id="panel-servers">
<div class="eyebrow">Servers</div><h2>Your <span class="hl">servers</span></h2>
<p id="sv-note">Reported by the app. Search, sort, and spot the ones you own.</p>
<div class="row" style="margin:10px 0"><input type="search" id="sv-search" placeholder="Search servers…" style="max-width:420px"><span class="badge" id="sv-count"></span></div>
<div id="sv-list" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px"><div class="card"><p>Loading…</p></div></div>
</div>
<div class="panel" id="panel-alerts">
<div class="eyebrow">Alerts</div><h2>Notifier <span class="hl">keywords</span> &amp; webhook</h2>
<p>Edit what the Notifier plugin watches for. Saved to the app within two minutes.</p>
<div class="card">
<b>Keywords</b><br><small style="color:var(--muted)">Comma separated words or phrases. Any message containing one notifies you.</small>
<div class="row" style="margin:8px 0 14px"><input type="search" id="al-keywords" placeholder="snore, my name, giveaway" style="flex:1;border-radius:12px"></div>
<b>Webhook URL</b><br><small style="color:var(--muted)">Every event is also posted to this Discord webhook. Leave empty to turn off. The current value is never shown here.</small>
<div class="row" style="margin:8px 0 14px"><input type="search" id="al-webhook" placeholder="https://discord.com/api/webhooks/…" style="flex:1;border-radius:12px"><span class="badge" id="al-webhook-state"></span></div>
<div class="row"><a class="btn" id="al-save" href="#">Save alerts</a><a class="btn" id="al-clear-webhook" href="#" style="background:transparent">Remove webhook</a></div>
</div>
</div>
<div class="panel" id="panel-snippets">
<div class="eyebrow">Snippets</div><h2>Text <span class="hl">snippets</span></h2>
<p>One per line as <code>trigger = replacement</code>. The TextSnippets plugin expands them before a message is sent.</p>
<div class="card"><textarea id="sn-text" rows="12" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.04);border:1px solid var(--card-border);border-radius:12px;color:var(--fg);padding:12px;font-family:ui-monospace,monospace;font-size:.85rem" placeholder=";shrug = ¯\_(ツ)_/¯"></textarea>
<div class="row" style="margin-top:10px"><a class="btn" id="sn-save" href="#">Save snippets</a><span class="badge" id="sn-count"></span></div></div>
</div>
<div class="panel" id="panel-css">
<div class="eyebrow">Quick CSS</div><h2>Edit your <span class="hl">Quick CSS</span></h2>
<p id="css-note">Changes are synced to the app within two minutes and applied live.</p>
<div class="card"><textarea id="css-text" rows="18" spellcheck="false" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.04);border:1px solid var(--card-border);border-radius:12px;color:var(--fg);padding:12px;font-family:ui-monospace,monospace;font-size:.85rem" placeholder="/* your css */"></textarea>
<div class="row" style="margin-top:10px"><a class="btn" id="css-save" href="#">Save CSS</a><a class="btn" id="css-download" href="#" style="background:transparent">Download</a><span class="badge" id="css-state"></span></div></div>
</div>
<div class="panel" id="panel-backups">
<div class="eyebrow">Backups</div><h2>Settings <span class="hl">history</span></h2>
<p>The last eight versions of your synced settings are kept. Restore one and the app picks it up within two minutes.</p>
<div class="card" style="padding:6px 0"><table><thead><tr><th>Saved</th><th>Version</th><th>Size</th><th>Checksum</th><th></th></tr></thead><tbody id="bk-rows"><tr><td colspan="5">Loading…</td></tr></tbody></table></div>
<div class="row"><a class="btn" id="bk-download" href="#">Download current settings</a></div>
</div>
<div class="panel" id="panel-activity">
<div class="eyebrow">Activity</div><h2>When you're <span class="hl">most active</span></h2>
<p>Messages sent per hour of the day, from the Statistics plugin.</p>
<div class="card"><div id="hm" style="display:grid;grid-template-columns:repeat(24,1fr);gap:4px"></div><div style="display:flex;justify-content:space-between;color:var(--muted);font-size:.72rem;margin-top:6px"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div><p id="hm-note" style="margin:10px 0 0"></p></div>
<div class="kpis" id="act-kpis"></div>
</div>
<div class="panel" id="panel-news">
<div class="eyebrow">What's new</div><h2>Latest <span class="hl">release</span></h2>
<div id="news" class="card"><p>Loading…</p></div>
</div>
<div class="panel" id="panel-security">
<div class="eyebrow">Security</div><h2>Keep it <span class="hl">locked down</span></h2>
<div class="card"><h3>Public profile</h3><p>Show a public page at <code id="pp-url"></code> with your name, avatar, client version and plugin count. Off by default.</p>
<div class="vc-ctl"><div><b>Public profile page</b><br><small>Anyone with the link can see it.</small></div><label class="sw"><input type="checkbox" id="sec-public"><span></span></label></div></div>
<div class="card" style="margin-top:14px"><h3>Sessions</h3><p>Dashboard sessions last 30 days. Logging out here only affects this browser.</p><div class="row"><a class="btn" href="/logout">Log out of this browser</a></div></div>
<div class="card danger" style="margin-top:14px"><h3>Rotate cloud secret</h3><p>Signs every device out of the cloud. Your data stays. Reconnect from the app under Cloud → Authenticate with Cloud.</p><div class="row"><a class="btn danger" id="sec-rotate" href="#">Rotate secret</a></div></div>
</div>
<div class="panel" id="panel-account">
<div class="eyebrow">Account</div><h2>Manage your <span class="hl">account</span></h2>
<div class="card"><h3>Discord</h3><p>User id <code id="acc-id">${escapeHtml(user.id)}</code>. Sessions on this website last 30 days.</p></div>
<div class="card danger" style="margin-top:14px"><h3>Danger zone</h3><p>Deleting cloud data removes every synced entry but keeps the account connected. Disconnecting removes everything and signs every device out of the cloud.</p>
<div class="row"><a class="btn danger" id="btn-delete" href="#">Delete cloud data</a><a class="btn danger" id="btn-disconnect" href="#">Disconnect account</a></div></div>
</div>
</section>
</div>
<script>
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmtDate = t => t ? new Date(t).toLocaleString() : "never";
  const ago = t => { if (!t) return "never"; const s = Math.floor((Date.now() - t) / 1000); return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + " min ago" : s < 86400 ? Math.floor(s / 3600) + " h ago" : Math.floor(s / 86400) + " d ago"; };
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : n > 1024 ? (n / 1024).toFixed(1) + " KB" : n + " B";
  const hms = s => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + "h " + m + "m" : m + "m"; };
  document.querySelectorAll(".item[data-panel]").forEach(el => el.addEventListener("click", () => {
    document.querySelectorAll(".item[data-panel]").forEach(i => i.classList.toggle("active", i === el));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + el.dataset.panel));
  }));
  let me = null;
  async function load() {
    const r = await fetch("/v1/me"); if (r.status === 401) { location.href = "/login"; return; }
    me = await r.json();
    const u = me.user;
    if (u.avatar) $("me-avatar").src = "https://cdn.discordapp.com/avatars/" + u.id + "/" + u.avatar + ".png?size=96";
    $("me-name").textContent = u.global_name || u.username; $("hello-name").textContent = u.global_name || u.username;
    $("k-online").innerHTML = me.online ? '<span class="pill-ok">Online</span>' : '<span class="pill-off">Offline</span>';
    $("k-sync").textContent = ago(u.last_seen_at);
    $("k-entries").textContent = me.entries.length + (me.legacy ? " + legacy" : "");
    $("k-size").textContent = kb(me.entries.reduce((a, e) => a + e.size, 0) + (me.legacy ? me.legacy.size : 0));
    $("k-since").textContent = new Date(u.created_at).toLocaleDateString();
    $("data-rows").innerHTML = me.entries.map(e => "<tr><td><code>" + esc(e.key) + "</code></td><td>v" + e.version + "</td><td>" + kb(e.size) + "</td><td>" + esc(fmtDate(e.updated_at)) + "</td></tr>").join("") + (me.legacy ? "<tr><td><code>settings (v1)</code></td><td>–</td><td>" + kb(me.legacy.size) + "</td><td>" + esc(fmtDate(me.legacy.written)) + "</td></tr>" : "") || "<tr><td colspan='4'>Nothing synced yet. Turn on Settings Sync in the app.</td></tr>";
    const s = me.stats;
    if (s) {
      $("stats-note").textContent = "Last published " + ago(s.updatedAt) + ".";
      const num = n => Number(n || 0).toLocaleString();
      const tiles = [[num(s.sent), "Messages sent"], [num(s.received), "Messages seen"], [num(s.mentions), "Times pinged"], [hms(s.voiceSeconds || 0), "Time in voice"], [hms(s.uptimeSeconds || 0), "Discord open"], [s.sessions, "Sessions"], [s.pluginsEnabled, "Plugins on"]];
      $("stats-kpis").innerHTML = tiles.map(([v, l]) => "<div class='kpi'><strong>" + esc(v ?? 0) + "</strong><small>" + l + "</small></div>").join("");
      const top = Object.entries(s.busiestChannels || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (top.length) { $("stats-channels").style.display = ""; const max = top[0][1]; $("stats-bars").innerHTML = top.map(([n, c]) => "<div class='bar-row'>" + esc(n) + " <i style='max-width:" + Math.round(c / max * 100) + "%'></i> " + num(c) + "</div>").join(""); }
    } else {
      $("stats-kpis").innerHTML = "<div class='kpi'><strong>–</strong><small>No statistics yet</small></div>";
    }
    renderLog();
    renderPlugins();
    renderDevices();
    renderNotifications();
    renderGhost();
    renderChart();
    renderControls();
    renderServers();
    renderAlerts();
    renderSnippets();
    renderActivity();
    loadBackups();
    loadCss();
    loadNews();
    $("pp-url").textContent = location.origin + "/u/" + u.id;
    $("sec-public").checked = !!((me.remote && "publicProfile" in me.remote) ? me.remote.publicProfile : me.device && me.device.publicProfile);
  }
  function renderServers() {
    const list = (me.device && me.device.guilds) || [];
    const q = ($("sv-search").value || "").toLowerCase();
    const rows = list.filter(g => !q || g.name.toLowerCase().includes(q)).sort((a, b) => (b.owner - a.owner) || a.name.localeCompare(b.name));
    $("sv-count").textContent = list.length + " servers · " + list.filter(g => g.owner).length + " owned";
    $("sv-list").innerHTML = rows.length ? rows.map(g => "<div class='card' style='padding:12px 14px;display:flex;gap:10px;align-items:center'>" + (g.icon ? "<img src='https://cdn.discordapp.com/icons/" + esc(g.id) + "/" + esc(g.icon) + ".png?size=64' style='width:36px;height:36px;border-radius:10px'>" : "<div style='width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.08);display:grid;place-items:center'><b>" + esc(g.name.slice(0, 1)) + "</b></div>") + "<div style='min-width:0'><b style='display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + esc(g.name) + "</b><small style='color:var(--muted)'>" + (g.owner ? "owner · " : "") + esc(g.id) + "</small></div></div>").join("") : "<div class='card'><p>" + (list.length ? "No matches." : "The app hasn't reported your servers yet.") + "</p></div>";
  }
  $("sv-search").addEventListener("input", renderServers);
  function renderAlerts() {
    const d = me.device || {}, r = me.remote || {};
    $("al-keywords").value = "keywords" in r ? r.keywords : (d.keywords || "");
    $("al-webhook-state").textContent = ("webhook" in r ? r.webhook : d.webhook) ? "webhook set" : "no webhook";
  }
  $("al-save").addEventListener("click", e => { e.preventDefault(); const patch = { keywords: $("al-keywords").value }; if ($("al-webhook").value.trim()) patch.webhook = $("al-webhook").value.trim(); sendRemote(patch).then(() => { $("al-webhook").value = ""; renderAlerts(); }); });
  $("al-clear-webhook").addEventListener("click", e => { e.preventDefault(); sendRemote({ webhook: "" }).then(renderAlerts); });
  function renderSnippets() {
    const d = me.device || {}, r = me.remote || {};
    const v = "snippets" in r ? r.snippets : (d.snippets || "");
    $("sn-text").value = v;
    $("sn-count").textContent = v.split("\n").filter(l => l.includes("=")).length + " snippets";
  }
  $("sn-text").addEventListener("input", () => { $("sn-count").textContent = $("sn-text").value.split("\n").filter(l => l.includes("=")).length + " snippets"; });
  $("sn-save").addEventListener("click", e => { e.preventDefault(); sendRemote({ snippets: $("sn-text").value }); });
  function renderActivity() {
    const h = (me.stats && me.stats.hourly) || [];
    const max = Math.max(1, ...h);
    $("hm").innerHTML = Array.from({ length: 24 }, (_, i) => { const v = h[i] || 0; return "<div title='" + String(i).padStart(2, "0") + ":00 · " + v + " sent' style='height:34px;border-radius:6px;background:rgba(139,180,255," + (0.08 + 0.92 * v / max).toFixed(2) + ")'></div>"; }).join("");
    const peak = h.length ? h.indexOf(Math.max(...h)) : -1;
    $("hm-note").textContent = h.some(Boolean) ? "Peak hour: " + String(peak).padStart(2, "0") + ":00 with " + h[peak] + " messages." : "No hourly data yet. Keep the Statistics plugin on.";
    const daily = (me.stats && me.stats.daily) || {};
    const days = Object.entries(daily).sort();
    const week = days.slice(-7).reduce((a, [, v]) => a + (v.sent || 0), 0);
    const best = days.reduce((b, d) => (d[1].sent || 0) > (b[1].sent || 0) ? d : b, ["–", { sent: 0 }]);
    const streak = (() => { let n = 0; for (let i = 0; i < 60; i++) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); if ((daily[d] || {}).sent > 0) n++; else if (i > 0) break; } return n; })();
    $("act-kpis").innerHTML = [[week, "Sent this week"], [best[0].slice(5), "Busiest day"], [best[1].sent || 0, "Messages that day"], [streak + "d", "Active streak"]].map(([v, l]) => "<div class='kpi'><strong>" + esc(v) + "</strong><small>" + l + "</small></div>").join("");
  }
  async function loadBackups() {
    const r = await fetch("/v1/me/backups").then(r => r.json()).catch(() => ({ backups: [] }));
    const list = r.backups || [];
    $("bk-rows").innerHTML = list.length ? list.map(b => "<tr><td>" + esc(fmtDate(b.saved_at)) + "</td><td>v" + b.version + "</td><td>" + kb(b.size) + "</td><td><code>" + esc(b.checksum) + "</code></td><td><a class='btn' href='#' data-restore='" + b.id + "' style='padding:6px 12px'>Restore</a></td></tr>").join("") : "<tr><td colspan='5'>No previous versions yet. A backup is kept every time your settings change.</td></tr>";
    $("bk-rows").querySelectorAll("[data-restore]").forEach(a => a.addEventListener("click", async e => { e.preventDefault(); if (!confirm("Restore this version? The app applies it within 2 min.")) return; await post("/v1/me/restore", { id: Number(a.dataset.restore) }); load(); }));
  }
  $("bk-download").addEventListener("click", async e => { e.preventDefault(); const r = await fetch("/v1/me/key/settings").then(r => r.json()); const b = new Blob([r.value || "{}"], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "snoreclient-settings.json"; a.click(); });
  async function loadCss() {
    const r = await fetch("/v1/me/key/quickCss").then(r => r.json()).catch(() => ({}));
    $("css-text").value = r.value || "";
    $("css-state").textContent = r.value == null ? "nothing synced yet" : "v" + r.version + " · " + kb(r.value.length);
  }
  $("css-save").addEventListener("click", async e => { e.preventDefault(); $("css-state").textContent = "saving…"; await fetch("/v1/me/key/quickCss", { method: "PUT", headers: { "Content-Type": "text/css" }, body: $("css-text").value }); $("css-state").textContent = "saved, the app applies it within 2 min"; });
  $("css-download").addEventListener("click", e => { e.preventDefault(); const b = new Blob([$("css-text").value], { type: "text/css" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "quickCss.css"; a.click(); });
  async function loadNews() {
    const r = await fetch("/releases/client").then(r => r.json()).catch(() => null);
    if (!r || !r.tag_name) { $("news").innerHTML = "<p>No release information available.</p>"; return; }
    const mine = me.device && me.device.hash;
    $("news").innerHTML = "<h3>" + esc(r.name || r.tag_name) + " <span class='badge'>" + esc(r.tag_name) + "</span></h3><p style='color:var(--muted);font-size:.85rem'>Published " + esc(fmtDate(Date.parse(r.published_at))) + (mine ? " · you are on " + esc(mine) : "") + "</p><pre style='white-space:pre-wrap;font-family:inherit;font-size:.92rem;line-height:1.6'>" + esc(r.body || "No notes.") + "</pre>" + (r.html_url ? "<div class='row'><a class='btn' href='" + esc(r.html_url) + "'>Open on GitHub</a></div>" : "");
  }
  $("sec-public").addEventListener("change", e => sendRemote({ publicProfile: e.target.checked }));
  $("sec-rotate").addEventListener("click", async e => { e.preventDefault(); if (!confirm("Rotate the cloud secret? Every device will need to reconnect.")) return; await fetch("/v1/me/rotate", { method: "POST" }); alert("Done. Reconnect from the app's Cloud tab."); });
  function post(path, body) { return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()); }
  async function sendRemote(patch) {
    $("ctl-state").textContent = "sending…";
    const r = await post("/v1/me/remote", patch);
    me.remote = r.remote;
    $("ctl-state").textContent = "queued, the app applies it within 2 min";
  }
  function renderControls() {
    const d = me.device || {}, r = me.remote || {};
    const val = (k, dk) => (k in r ? r[k] : d[dk ?? k]);
    $("ctl-discoverable").checked = !(val("ghostMode") ?? false);
    $("ctl-private").checked = !!val("privateMode");
    $("ctl-away").checked = !!val("awayReply");
    $("ctl-away-msg").value = val("awayMessage") || "";
    $("ctl-state").textContent = d.updatedAt ? "app last reported " + ago(d.updatedAt) : "waiting for the app to report in";
  }
  $("ctl-discoverable").addEventListener("change", e => sendRemote({ ghostMode: !e.target.checked }));
  $("ctl-private").addEventListener("change", e => sendRemote({ privateMode: e.target.checked }));
  $("ctl-away").addEventListener("change", e => sendRemote({ awayReply: e.target.checked }));
  $("ctl-away-save").addEventListener("click", e => { e.preventDefault(); sendRemote({ awayMessage: $("ctl-away-msg").value }); });
  function renderPlugins() {
    const list = (me.device && me.device.plugins) || [];
    const q = ($("pl-search").value || "").toLowerCase();
    const pending = (me.remote && me.remote.plugins) || {};
    const rows = list.filter(p => !q || (p.name + " " + p.description).toLowerCase().includes(q));
    $("pl-count").textContent = list.filter(p => p.enabled).length + " on / " + list.length;
    $("pl-list").innerHTML = rows.length ? rows.map(p => { const on = p.name in pending ? pending[p.name] : p.enabled; return "<div class='card pl'><div class='t'><b>" + esc(p.name) + "</b>" + (p.required ? " <span class='badge'>required</span>" : "") + (p.name in pending && pending[p.name] !== p.enabled ? " <span class='badge'>pending</span>" : "") + "<small>" + esc(p.description) + "</small></div>" + (p.required ? "" : "<label class='sw'><input type='checkbox' data-plugin='" + esc(p.name) + "'" + (on ? " checked" : "") + "><span></span></label>") + "</div>"; }).join("") : "<div class='card'><p>" + (list.length ? "No matches." : "The app hasn't reported its plugin list yet. Open Discord with Cloud Integration on.") + "</p></div>";
    $("pl-list").querySelectorAll("input[data-plugin]").forEach(i => i.addEventListener("change", () => sendRemote({ plugins: { [i.dataset.plugin]: i.checked } })));
  }
  $("pl-search").addEventListener("input", renderPlugins);
  function renderDevices() {
    const d = me.device;
    $("dev-list").innerHTML = d ? "<div class='card'><h3>" + esc(d.platform) + "</h3><p>" + esc(d.os || "") + "<br>v" + esc(d.version) + " · " + esc(d.hash) + " · " + esc(d.channel || "stable") + " channel<br>" + (d.plugins ? d.plugins.filter(p => p.enabled).length + " plugins on" : "") + "<br><span class='badge'><span class='dot' style='" + (me.online ? "" : "background:var(--muted);box-shadow:none") + "'></span>" + (me.online ? "online now" : "last seen " + ago(d.updatedAt)) + "</span></p></div>" : "<div class='card'><p>No device has reported yet.</p></div>";
    const others = (me.onlineUsers || []).filter(u => u.id !== me.user.id);
    $("dev-online").innerHTML = others.length ? others.map(u => "<span class='badge'><span class='dot'></span>" + esc(u.username) + "</span>").join("") : "<span class='badge'>nobody else online right now</span>";
  }
  function renderNotifications() {
    const list = (me.notifications && me.notifications.entries) || [];
    if (me.notifications && me.notifications.updatedAt) $("nt-note").textContent = "Last upload " + ago(me.notifications.updatedAt) + ".";
    $("nt-list").innerHTML = list.length ? list.map(n => "<div class='card' style='padding:12px 16px;display:flex;gap:12px;align-items:center'><div style='width:36px;height:36px;border-radius:9px;flex-shrink:0;background:" + esc(n.color || "#5b8cff") + ";display:grid;place-items:center;overflow:hidden'>" + (n.icon ? "<img src='" + esc(n.icon) + "' style='width:36px;height:36px'>" : "<b>i</b>") + "</div><div style='flex:1;min-width:0'><i>" + esc((n.title || "").replace(/^SnoreClient \| /, "")) + (n.body ? " | " + esc(n.body) : "") + "</i><br><small style='color:var(--muted)'>" + ago(n.at) + "</small></div></div>").join("") : "<div class='card'><p>No notifications uploaded yet.</p></div>";
  }
  function renderGhost() {
    const list = ((me.ghostPings && me.ghostPings.entries) || []).slice().reverse();
    if (me.ghostPings && me.ghostPings.updatedAt) $("gp-note").textContent = "Last upload " + ago(me.ghostPings.updatedAt) + ". Logged by the GhostPingLog plugin.";
    $("gp-rows").innerHTML = list.length ? list.map(g => "<tr><td>" + esc(fmtDate(g.at)) + "</td><td><b>" + esc(g.author) + "</b><br><small style='color:var(--muted)'>" + esc(g.authorId) + "</small></td><td>" + esc(g.guild) + " #" + esc(g.channel) + "</td><td>" + esc(g.how) + "</td><td>" + esc(g.content) + "</td></tr>").join("") : "<tr><td colspan='5'>No ghost pings logged. Enable the GhostPingLog plugin in the app.</td></tr>";
  }
  function renderChart() {
    const daily = (me.stats && me.stats.daily) || {};
    const days = []; for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); days.push([d, daily[d] || { sent: 0, received: 0 }]); }
    const max = Math.max(1, ...days.map(([, v]) => v.sent));
    $("chart").innerHTML = days.map(([d, v]) => "<div class='bar-col' title='" + d + ": " + v.sent + " sent, " + v.received + " seen' style='height:" + Math.max(2, Math.round(v.sent / max * 100)) + "%'></div>").join("");
    $("chart-labels").innerHTML = "<span>" + days[0][0].slice(5) + "</span><span>" + days[15][0].slice(5) + "</span><span>today</span>";
  }
  function renderLog() {
    const log = (me.messageLog && me.messageLog.entries) || [];
    const q = ($("ml-search").value || "").toLowerCase();
    const rows = log.filter(e => !q || [e.author, e.channel, e.guild, e.content, e.before].join(" ").toLowerCase().includes(q));
    $("ml-count").textContent = rows.length + " of " + log.length;
    if (me.messageLog && me.messageLog.updatedAt) $("ml-note").textContent = "Last upload " + ago(me.messageLog.updatedAt) + ". Logged by the MessageLogger plugin; turn uploads off under CloudPresence settings in the app.";
    $("ml-list").innerHTML = rows.length ? rows.map(e => "<div class='card' style='padding:14px 18px'>" +
      "<div style='display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px'><span class='badge' style='color:" + (e.type === "deleted" ? "#f9a8d4" : "#fcd34d") + "'>" + e.type + "</span><b>" + esc(e.author) + "</b><span style='color:var(--muted);font-size:.85rem'>" + esc(e.guild) + " · " + esc(e.channel) + " · " + esc(fmtDate(e.at)) + "</span></div>" +
      (e.type === "edited" ? "<p style='margin:0 0 4px'><span style='color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em'>Before</span><br>" + esc(e.before) + "</p><p style='margin:0'><span style='color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em'>After</span><br>" + esc(e.content) + "</p>"
        : "<p style='margin:0;color:var(--fg)'>" + (esc(e.content) || "<i style='color:var(--muted)'>(no text)</i>") + (e.attachments ? " <span class='badge'>" + e.attachments + " attachment" + (e.attachments === 1 ? "" : "s") + "</span>" : "") + "</p>") +
      "</div>").join("") : "<div class='card'><p>" + (log.length ? "No matches." : "Nothing logged yet. Enable the MessageLogger plugin in the app and keep CloudPresence uploads on.") + "</p></div>";
  }
  $("ml-search").addEventListener("input", renderLog);
  $("dl-json").addEventListener("click", e => { e.preventDefault(); const b = new Blob([JSON.stringify(me, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "snoreclient-cloud.json"; a.click(); });
  $("btn-delete").addEventListener("click", async e => { e.preventDefault(); if (!confirm("Delete all synced data from the cloud?")) return; await fetch("/v1/me/delete", { method: "POST" }); load(); });
  $("btn-disconnect").addEventListener("click", async e => { e.preventDefault(); if (!confirm("Disconnect this account and delete everything?")) return; await fetch("/v1/me/disconnect", { method: "POST" }); location.href = "/"; });
  load();
})();
</script>`, { wide: true });

const status = ({ runtime, users, dbMs = 0, live = false, liveMs = 0, online = 0, uptime }) => page("Status", `
<div class="eyebrow">Status</div><h2>All systems <span class="hl">${live || runtime === "node" ? "operational" : "degraded"}</span></h2>
<p>Live checks against this ${escapeHtml(config.siteName)} instance, run when you loaded this page.</p>
<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
<div class="card"><h3>API</h3><p><span class="badge"><span class="dot"></span>up</span><br>${escapeHtml(runtime === "cloudflare" ? "Cloudflare Workers" : "Node")}${uptime ? ` · up ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m` : ""}</p></div>
<div class="card"><h3>Database</h3><p><span class="badge"><span class="dot"></span>up</span><br>${users} connected accounts · ${dbMs} ms</p></div>
<div class="card"><h3>Live presence</h3><p><span class="badge"><span class="dot"${live ? "" : " style=\"background:var(--muted);box-shadow:none\""}></span>${live ? "up" : runtime === "node" ? "n/a" : "down"}</span><br>${live ? `${online} online · ${liveMs} ms` : "WebSocket hub not reachable"}</p></div>
<div class="card"><h3>Releases</h3><p><span class="badge"><span class="dot"></span>GitHub</span><br><a href="/releases/client">/releases/client</a></p></div>
</div>
<p style="margin-top:18px;color:var(--muted);font-size:.85rem">Machine readable: <code>/health</code> and <code>/v1/live.json</code>.</p>`);

const profile = ({ user, profile, device, online }) => {
    const name = profile?.global_name || user.username;
    const avatar = profile?.avatar ? `https://cdn.discordapp.com/avatars/${escapeHtml(user.id)}/${escapeHtml(profile.avatar)}.png?size=256` : "/assets/icon.png";
    const plugins = device?.plugins ? device.plugins.filter(p => p.enabled).length : null;
    return page(name, `
<div class="card" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
<img src="${avatar}" alt="" style="width:96px;height:96px;border-radius:50%;border:3px solid rgba(255,255,255,.12)">
<div style="flex:1;min-width:200px"><div class="eyebrow">SnoreClient user</div><h2 style="margin:0">${escapeHtml(name)}</h2><p style="margin:4px 0 10px;color:var(--muted)">@${escapeHtml(user.username)}</p>
<div class="chips"><span class="badge"><span class="dot"${online ? "" : " style=\"background:var(--muted);box-shadow:none\""}></span>${online ? "online now" : "offline"}</span>
<span class="badge">since ${new Date(user.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
${device ? `<span class="badge">${escapeHtml(device.platform || "")} · v${escapeHtml(device.version || "")}</span>` : ""}
${plugins !== null ? `<span class="badge">${plugins} plugins on</span>` : ""}
${device?.guilds ? `<span class="badge">${device.guilds.length} servers</span>` : ""}</div></div></div>
<p style="margin-top:18px;color:var(--muted);font-size:.85rem">This page is shown because its owner turned on <b>Public profile</b> in their dashboard. <a href="/download">Get SnoreClient</a>.</p>`);
};

return { page, landing, privacy, download, plugins, plugin, accounts, dashboard, status, profile };
}
