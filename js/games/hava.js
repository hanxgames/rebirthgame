/* ReBirth — mini oyun: Hava Harekâtı / Air Strike (id "hava").
 * Tarsel haritası üzerinde Gölge Cephesi hedeflerine hava vuruşu; sivil bölgeleri korurken skor topla.
 * Sözleşme: js/games/CONTRACT.md (düz ES2019, harici kütüphane yok). */
(function () {
  "use strict";
  window.RBGames = window.RBGames || {};

  var TAU = Math.PI * 2, MAP_W = 2100, MAP_H = 1400;
  var ROUND = 75, AMMO_MAX = 3, RECHARGE = 1.1, COMBO_WIN = 2.5, TRAIL = 1.1, MTRAIL = 0.5, JN = 80, MN = 28;
  /* parçacık türleri: < 5 normal karışım, >= 5 toplamalı (ışık) */
  var K_SMOKE = 0, K_PUFF = 1, K_DUST = 2, K_DEBRIS = 3, K_BALLR = 4, K_FIRE = 5, K_SPARK = 6, K_EMBER = 7, K_FLASH = 8, K_BALL = 9;
  var C = { bg: "#191817", bg2: "#252423", cream: "#ece4d0", ink: "#201d1b", accent: "#f1ad2a", bad: "#db4738",
    good: "#66b86b", text: "#f2ebd9", muted: "#a8a091" };
  var CAPS = "'Barlow Condensed', 'Arial Narrow', sans-serif", DISP = "Anton, Impact, sans-serif";
  var STAR = "M12 2.6l2.85 6.05 6.6.78-4.88 4.52 1.3 6.55L12 17.2l-5.87 3.3 1.3-6.55-4.88-4.52 6.6-.78z";
  var ICON = {
    cell: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5" fill="#201d1b"/><circle cx="8" cy="6" r="2.2" fill="#db4738"/><path d="M3.9 12.2Q4 8.9 8 8.9Q12 8.9 12.1 12.2z" fill="#db4738"/></svg>',
    convoy: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x=".5" y="4.5" width="9.5" height="7" rx="1" fill="#201d1b"/><rect x="10.5" y="6" width="5" height="5.5" rx="1" fill="#db4738"/></svg>',
    hq: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="14" height="14" rx="2.5" fill="#201d1b"/><path d="M3.5 11a4.5 4.5 0 0 1 9 0z" fill="#db4738"/><rect x="5.5" y="8.6" width="5" height="1.2" fill="#201d1b"/></svg>'
  };
  /* map_tarsel.json yüklenemezse: merkez x, y, nüfus, komşular, arazi */
  var FALLBACK = [[1008, 686, 220, [2, 3, 4, 5, 6, 9, 11], "vadi"], [315, 1057, 60, [2, 3, 4, 13], "kıyı"], [703.5, 840, 55, [0, 1, 3, 4], "nehir"],
    [630, 560, 40, [0, 1, 2, 11, 12, 13], "ova"], [850.5, 1155, 30, [0, 1, 2, 5], "bozkır"], [1228.5, 1043, 35, [0, 4, 6, 7], "ova"],
    [1543.5, 917, 32, [0, 5, 7, 8, 9], "göl"], [1827, 1078, 22, [5, 6, 8], "tepe"], [1701, 637, 28, [6, 7, 9, 10], "tepe"],
    [1365, 399, 14, [0, 6, 8, 10, 11], "boğaz"], [1806, 301, 9, [8, 9], "dağ"], [1081.5, 280, 12, [0, 3, 9, 12], "plato"],
    [598.5, 245, 15, [3, 11, 13], "orman"], [241.5, 427, 18, [1, 3, 12], "sınır"]];
  var FB_NAMES = ["Tarsel", "Velora", "Karvan", "Elmira", "Zerkan", "Miraval", "Neril", "Dorvan", "Termena", "Kastra", "Vargul", "Selvan", "Kordin", "Ashkar"];

  var STR = {
    tr: {
      title: "Hava Harekâtı", titleU: "HAVA HAREKÂTI", order: "HAREKÂT EMRİ · TARSEL", cls: "GİZLİ",
      how1: "Gölge Cephesi hedeflerine dokun: jet dalar, füzeyi hedefe kilitler.",
      how2: "Krem halkalı sivil bölgeleri vurma: her sivil kayıp meşruiyetten 20 götürür.",
      note: "Önce siviller!", cell: "HÜCRE", convoy: "KONVOY", hq: "KARARGÂH",
      start: "BAŞLA", again: "TEKRAR", best: "EN İYİ SKOR", loading: "HARİTA YÜKLENİYOR",
      score: "SKOR", legit: "MEŞRUİYET", time: "SÜRE", combo: "COMBO", ammo: "FÜZE", reload: "DOLDURULUYOR",
      civ: "SİVİL KAYIP", miss: "ISKA", fast: "HIZLI", dmg: "HASAR · 1/2",
      hqDown: "KARARGÂH İMHA EDİLDİ", hqEsc: "KARARGÂH KAÇTI", hqSpot: "KARARGÂH TESPİT EDİLDİ", hqSub: "2 VURUŞ GEREKİR · 600 PUAN",
      go: "HAREKÂT BAŞLADI", goSub: "75 SANİYE · 3 FÜZE · SİVİLLERİ KORU", last10: "SON 10 SANİYE",
      timeUp: "SÜRE DOLDU", legitOut: "MEŞRUİYET TÜKENDİ", civZone: "SİVİL BÖLGE",
      report: "HAREKÂT RAPORU · TARSEL", won: "GÖREV TAMAMLANDI", lost: "MİSYON BAŞARISIZ",
      kills: "İmha edilen hedef", acc: "İsabet oranı", civs: "Sivil kayıp", bestCombo: "En yüksek combo",
      legitB: "Meşruiyet bonusu", accB: "İsabet bonusu", newBest: "Yeni rekor!",
      live: "CANLI", feed: "TARSEL · HAVA GÖZETLEME", enemy: "GÖLGE CEPHESİ", sep: "."
    },
    en: {
      title: "Air Strike", titleU: "AIR STRIKE", order: "OPERATION ORDER · TARSEL", cls: "CLASSIFIED",
      how1: "Tap Shadow Front targets: a jet dives in and locks a missile on.",
      how2: "Never hit the cream-ringed civilian zones: each casualty costs 20 legitimacy.",
      note: "Civilians first!", cell: "CELL", convoy: "CONVOY", hq: "HQ",
      start: "START", again: "AGAIN", best: "BEST SCORE", loading: "LOADING MAP",
      score: "SCORE", legit: "LEGITIMACY", time: "TIME", combo: "COMBO", ammo: "MISSILES", reload: "RELOADING",
      civ: "CIVILIAN CASUALTIES", miss: "MISS", fast: "QUICK", dmg: "DAMAGED · 1/2",
      hqDown: "HQ DESTROYED", hqEsc: "HQ ESCAPED", hqSpot: "HQ DETECTED", hqSub: "NEEDS 2 HITS · 600 POINTS",
      go: "OPERATION STARTED", goSub: "75 SECONDS · 3 MISSILES · PROTECT CIVILIANS", last10: "FINAL 10 SECONDS",
      timeUp: "TIME UP", legitOut: "LEGITIMACY LOST", civZone: "CIVILIAN ZONE",
      report: "MISSION REPORT · TARSEL", won: "MISSION COMPLETE", lost: "MISSION FAILED",
      kills: "Targets destroyed", acc: "Accuracy", civs: "Civilian casualties", bestCombo: "Best combo",
      legitB: "Legitimacy bonus", accB: "Accuracy bonus", newBest: "New best!",
      live: "LIVE", feed: "TARSEL · AIR SURVEILLANCE", enemy: "SHADOW FRONT", sep: ","
    }
  };

  var FC = "var(--f-caps,'Barlow Condensed','Arial Narrow',sans-serif)", FD = "var(--f-display,Anton,Impact,sans-serif)",
    FB = "var(--f-body,Barlow,system-ui,sans-serif)", FS = "var(--f-script,Caveat,cursive)";
  var CSS = [
    ".rbg-hava{position:absolute;inset:0;overflow:hidden;background:#191817;color:#f2ebd9;font-family:" + FB + ";-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;contain:layout paint;--k:1}",
    ".rbg-hava *{box-sizing:border-box}",
    ".rbg-hava-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;outline:none}",
    ".rbg-hava-play .rbg-hava-cv{cursor:none}",
    /* üst çubuk */
    ".rbg-hava-hud{position:absolute;left:0;right:0;top:0;height:calc(46px*var(--k));display:flex;background:linear-gradient(180deg,rgba(25,24,23,.93),rgba(25,24,23,.8));border-bottom:1px solid rgba(242,230,199,.14);box-shadow:0 8px 24px rgba(0,0,0,.3);pointer-events:none;transform:translateY(-105%);transition:transform .5s cubic-bezier(.2,.7,.1,1)}",
    ".rbg-hava-hudon .rbg-hava-hud{transform:none}",
    ".rbg-hava-hud:before{content:'';flex:0 0 4px;background:#f1ad2a}",
    ".rbg-hava-c{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:calc(4px*var(--k));padding:0 calc(12px*var(--k));border-right:1px solid rgba(242,230,199,.08)}",
    ".rbg-hava-c:last-child{border-right:0}",
    ".rbg-hava-c b{font:700 calc(11px*var(--k))/1 " + FC + ";letter-spacing:.1em;color:#a8a091;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".rbg-hava-c span{display:inline-block;font:400 calc(21px*var(--k))/1 " + FD + ";letter-spacing:.03em;color:#f2ebd9;white-space:nowrap;font-variant-numeric:tabular-nums;transform-origin:0 60%}",
    ".rbg-hava-leg{flex:1.6 1 0}",
    ".rbg-hava-row{display:flex;align-items:center;gap:calc(8px*var(--k))}",
    ".rbg-hava-bar{flex:1;height:calc(7px*var(--k));border-radius:4px;background:rgba(242,230,199,.12);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.3)}",
    ".rbg-hava-bar i{display:block;height:100%;background:#66b86b;transform-origin:0 50%;transition:transform .4s cubic-bezier(.2,.7,.1,1),background-color .3s}",
    ".rbg-hava-hot span{color:#db4738}.rbg-hava-amb span{color:#f1ad2a}",
    ".rbg-hava-hit{animation:rbg-hava-hit .6s ease-out}",
    "@keyframes rbg-hava-hit{0%{background:rgba(219,71,56,.6)}100%{background:rgba(219,71,56,0)}}",
    ".rbg-hava-tick span{animation:rbg-hava-tick .35s ease-out}",
    "@keyframes rbg-hava-tick{0%{transform:scale(1.4)}100%{transform:scale(1)}}",
    /* kart katmanı */
    ".rbg-hava-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;background:radial-gradient(ellipse at 50% 45%,rgba(25,24,23,.2),rgba(25,24,23,.82));opacity:0;visibility:hidden;transition:opacity .4s,visibility 0s .4s}",
    ".rbg-hava-ov.rbg-hava-on{opacity:1;visibility:visible;transition:opacity .4s}",
    ".rbg-hava-load{display:flex;flex-direction:column;align-items:center;gap:12px;font:700 calc(13px*var(--k))/1 " + FC + ";letter-spacing:.18em;color:#a8a091}",
    ".rbg-hava-load i{display:block;position:relative;width:120px;height:2px;overflow:hidden;background:rgba(242,230,199,.12)}",
    ".rbg-hava-load i:after{content:'';position:absolute;left:0;top:0;bottom:0;width:40%;background:#f1ad2a;animation:rbg-hava-ld 1.1s ease-in-out infinite}",
    "@keyframes rbg-hava-ld{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}",
    ".rbg-hava-card{position:relative;width:min(410px,100%);max-height:100%;overflow-y:auto;padding:calc(18px*var(--k)) calc(22px*var(--k));color:#201d1b;background-color:#ece4d0;background-image:radial-gradient(ellipse at 18% 0%,rgba(255,255,255,.5),transparent 55%),radial-gradient(ellipse at 100% 100%,rgba(97,89,79,.22),transparent 60%),repeating-linear-gradient(0deg,rgba(32,29,27,.04) 0 1px,transparent 1px 24px);border-radius:3px;box-shadow:inset 0 4px 0 #f1ad2a,0 30px 70px rgba(0,0,0,.6),0 0 0 1px rgba(32,29,27,.3);transform:rotate(-.5deg);animation:rbg-hava-in .6s cubic-bezier(.2,.7,.1,1) both}",
    "@keyframes rbg-hava-in{0%{opacity:0;transform:translateY(-18px) rotate(-2.5deg) scale(.97)}100%{opacity:1;transform:rotate(-.5deg)}}",
    ".rbg-hava-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(4px*var(--k)) 0 calc(8px*var(--k));border-bottom:1.5px dashed rgba(32,29,27,.32);font:700 calc(12px*var(--k))/1 " + FC + ";letter-spacing:.14em;color:#61594f}",
    ".rbg-hava-cls{padding:3px 6px 2px;border:1.5px solid #b53a2d;border-radius:2px;color:#b53a2d;font-weight:800;letter-spacing:.12em;transform:rotate(3deg)}",
    ".rbg-hava-t{margin:calc(12px*var(--k)) 0 calc(8px*var(--k));font:400 calc(44px*var(--k))/.95 " + FD + ";letter-spacing:.01em}",
    ".rbg-hava-p{display:flex;gap:9px;margin:0 0 calc(6px*var(--k));font:500 calc(15px*var(--k))/1.32 " + FB + ";color:#3a342f}",
    ".rbg-hava-p:before{content:'';flex:0 0 7px;height:7px;margin-top:.45em;background:#f1ad2a;transform:rotate(45deg);box-shadow:0 0 0 1px rgba(32,29,27,.35)}",
    ".rbg-hava-lg{display:flex;flex-wrap:wrap;gap:6px;margin-top:calc(10px*var(--k))}",
    ".rbg-hava-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 8px 4px;border:1px solid rgba(32,29,27,.22);border-radius:3px;background:rgba(255,255,255,.28);font:700 calc(12px*var(--k))/1 " + FC + ";letter-spacing:.07em}",
    ".rbg-hava-chip svg{width:15px;height:15px;flex:0 0 15px}.rbg-hava-chip em{font-style:normal;color:#b53a2d}",
    ".rbg-hava-note{margin:calc(4px*var(--k)) 6px 0 0;text-align:right;font:calc(25px*var(--k))/1 " + FS + ";color:#b53a2d;transform:rotate(-4deg)}",
    ".rbg-hava-ft{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:calc(14px*var(--k));padding-top:calc(12px*var(--k));border-top:1px solid rgba(32,29,27,.14)}",
    ".rbg-hava-best{font:700 calc(11px*var(--k))/1.1 " + FC + ";letter-spacing:.12em;color:#61594f}",
    ".rbg-hava-best strong{display:block;margin-top:4px;font:400 calc(24px*var(--k))/1 " + FD + ";letter-spacing:.03em;color:#201d1b}",
    ".rbg-hava-nb{display:inline-block;margin-left:8px;font:calc(21px*var(--k))/1 " + FS + ";letter-spacing:0;color:#b53a2d;transform:rotate(-5deg)}",
    ".rbg-hava-btn{flex:0 0 auto;min-height:48px;min-width:136px;padding:0 26px;border:0;border-radius:3px;background:#f1ad2a;color:#201d1b;font:800 calc(17px*var(--k))/1 " + FC + ";letter-spacing:.16em;cursor:pointer;box-shadow:0 3px 0 #b37a1a,0 10px 22px rgba(179,122,26,.35);transition:transform .12s,background-color .15s,box-shadow .12s;touch-action:manipulation}",
    ".rbg-hava-btn:hover{background:#ffc247}.rbg-hava-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #b37a1a,0 4px 10px rgba(179,122,26,.3)}",
    ".rbg-hava-btn:focus-visible{outline:2px solid #201d1b;outline-offset:3px}",
    /* bitiş kartı */
    ".rbg-hava-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:calc(12px*var(--k))}",
    ".rbg-hava-res{display:inline-block;padding:6px 12px 4px;border:3px solid currentColor;border-radius:4px;font:400 calc(28px*var(--k))/1 " + FD + ";letter-spacing:.04em;color:#3f8a45;opacity:.92;transform:rotate(-4deg);animation:rbg-hava-stamp .45s .2s cubic-bezier(.3,1.6,.5,1) both}",
    ".rbg-hava-res.rbg-hava-lost{color:#b53a2d}",
    "@keyframes rbg-hava-stamp{0%{opacity:0;transform:rotate(-14deg) scale(2.3)}100%{opacity:.92;transform:rotate(-4deg) scale(1)}}",
    ".rbg-hava-stars{display:flex;gap:4px}",
    ".rbg-hava-stars svg{width:calc(30px*var(--k));height:calc(30px*var(--k));fill:rgba(32,29,27,.12);stroke:rgba(32,29,27,.4);stroke-width:1.5}",
    ".rbg-hava-stars svg.rbg-hava-son{fill:#f1ad2a;stroke:#b37a1a;animation:rbg-hava-star .5s cubic-bezier(.3,1.7,.5,1) both}",
    "@keyframes rbg-hava-star{0%{transform:scale(0) rotate(-40deg)}100%{transform:scale(1) rotate(0)}}",
    ".rbg-hava-sc{margin:calc(10px*var(--k)) 0 calc(6px*var(--k));font:700 calc(11px*var(--k))/1 " + FC + ";letter-spacing:.14em;color:#61594f}",
    ".rbg-hava-sc strong{display:block;margin-top:4px;font:400 calc(46px*var(--k))/1 " + FD + ";letter-spacing:.02em;color:#201d1b;font-variant-numeric:tabular-nums}",
    ".rbg-hava-rows{margin:0;padding:0}",
    ".rbg-hava-rows div{display:flex;justify-content:space-between;gap:10px;padding:calc(5px*var(--k)) 0;border-bottom:1px dotted rgba(32,29,27,.25);font:500 calc(14px*var(--k))/1.2 " + FB + ";color:#3a342f;animation:rbg-hava-row .4s both}",
    ".rbg-hava-rows dt,.rbg-hava-rows dd{margin:0}",
    ".rbg-hava-rows dd{font:700 calc(15px*var(--k))/1.2 " + FC + ";letter-spacing:.05em;color:#201d1b}",
    ".rbg-hava-rows .rbg-hava-bad dd{color:#b53a2d}",
    "@keyframes rbg-hava-row{0%{opacity:0;transform:translateX(-8px)}100%{opacity:1;transform:none}}",
    ".rbg-hava-compact .rbg-hava-lg,.rbg-hava-compact .rbg-hava-note,.rbg-hava-compact .rbg-hava-opt{display:none}",
    "@media (prefers-reduced-motion:reduce){.rbg-hava-card,.rbg-hava-res,.rbg-hava-rows div,.rbg-hava-stars svg.rbg-hava-son{animation-duration:.01s}}"
  ].join("\n");

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeBack(t) { var c = 1.9; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function segD2(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy, k = l ? clamp(((px - ax) * vx + (py - ay) * vy) / l, 0, 1) : 0;
    var dx = ax + vx * k - px, dy = ay + vy * k - py;
    return dx * dx + dy * dy;
  }
  function fmt(n, sep) {
    n = Math.round(n);
    var s = String(Math.abs(n)), o = "";
    while (s.length > 3) { o = sep + s.slice(-3) + o; s = s.slice(0, -3); }
    return (n < 0 ? "-" : "") + s + o;
  }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function house(c, x, y, s) {
    c.moveTo(x - s * 0.5, y + s * 0.45); c.lineTo(x - s * 0.5, y - s * 0.05); c.lineTo(x - s * 0.62, y - s * 0.05);
    c.lineTo(x, y - s * 0.6); c.lineTo(x + s * 0.62, y - s * 0.05); c.lineTo(x + s * 0.5, y - s * 0.05);
    c.lineTo(x + s * 0.5, y + s * 0.45); c.closePath();
  }
  function pool(n, make) { var a = []; for (var i = 0; i < n; i++) { var o = make(); o.on = false; a.push(o); } return a; }
  function free(a) { for (var i = 0; i < a.length; i++) if (!a[i].on) return a[i]; return null; }

  function create(el, ctx) {
    var L = STR[ctx && ctx.lang === "en" ? "en" : "tr"];
    var A = (ctx && ctx.assets) || "assets/";
    var doc = el.ownerDocument || document, win = doc.defaultView || window;
    var dead = false, paused = false, ready = false, raf = 0, last = 0, loadTimer = 0, frameN = 0;

    /* ---------- DOM ---------- */
    var style = doc.createElement("style");
    style.textContent = CSS;
    var root = doc.createElement("div");
    root.className = "rbg-hava";
    root.setAttribute("lang", ctx.lang === "en" ? "en" : "tr");
    root.innerHTML =
      '<canvas class="rbg-hava-cv" role="img" aria-label="' + L.title + '"></canvas>' +
      '<div class="rbg-hava-hud">' +
        '<div class="rbg-hava-c"><b>' + L.score + '</b><span>0</span></div>' +
        '<div class="rbg-hava-c rbg-hava-leg"><b>' + L.legit + '</b><div class="rbg-hava-row"><div class="rbg-hava-bar"><i></i></div><span>100</span></div></div>' +
        '<div class="rbg-hava-c"><b>' + L.time + '</b><span>' + ROUND + '</span></div>' +
        '<div class="rbg-hava-c"><b>' + L.combo + '</b><span>×1</span></div>' +
      '</div>' +
      '<div class="rbg-hava-ov rbg-hava-on"><div class="rbg-hava-load">' + L.loading + '<i></i></div></div>';
    el.appendChild(style);
    el.appendChild(root);
    var cv = root.querySelector("canvas"), g = cv.getContext("2d", { alpha: false });
    var cells = root.querySelectorAll(".rbg-hava-c"), spans = root.querySelectorAll(".rbg-hava-c span");
    var elScore = spans[0], elLegit = spans[1], elTime = spans[2], elCombo = spans[3];
    var elBar = root.querySelector(".rbg-hava-bar i"), ov = root.querySelector(".rbg-hava-ov");
    var hasLS = "letterSpacing" in g;
    function setLS(c, v) { if (hasLS) c.letterSpacing = v; }
    function sfx(n, v) { try { if (ctx.sfx) ctx.sfx(n, v); } catch (e) { /* ses isteğe bağlı */ } }
    function say(k, force) {
      if (!force && T - lastVoice < 4) return;
      lastVoice = T;
      try { if (ctx.voice) ctx.voice(k); } catch (e) { /* seslendirme isteğe bağlı */ }
    }
    function kick(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

    /* ---------- durum ---------- */
    var W = 1, H = 1, dpr = 1, u = 1, UU = 1, kc = 1, hudH = 46, portrait = false;
    var cam = { x: 1050, y: 700, s: 0.5 }, shx = 0, shy = 0, trauma = 0, T = 0, SX = 0, SY = 0;
    var state = 0; /* 0 yükleniyor, 1 giriş, 2 oyun, 3 bitiyor, 4 bitti */
    var districts = [], zones = [], pairs = [], cand = [], decals = [];
    var img = null, imgFull = false, upgrading = false, layer = doc.createElement("canvas"), lg = layer.getContext("2d");
    var layerS = 0.5, bakeAt = -1, bakedS = 1;
    var gt = 0, score = 0, dispScore = 0, legit = 100, civ = 0, shots = 0, hitShots = 0, kills = 0, hitsTotal = 0;
    var combo = 0, bestCombo = 0, lastHit = -9, punch = 9, ammo = AMMO_MAX, ammoShake = 0, spawnT = 0, hqT = 0, lastVoice = -99;
    var flash = 0, dmg = 0, slowT = 0, endT = 0, endWon = false, last10 = false, flyT = 1.5, wind = 10, stampAt = 0;
    var hover = { on: false, x: 0, y: 0 }, hoverBad = false, LX = 0, LY = 0;
    var R = { x0: 0, y0: 0, x1: 0, y1: 0 }, SPOT = { x: 0, y: 0 };
    var hc = { s: -1, l: -1, t: -1, c: -1, lc: "" }, countEl = null, countTo = 0, countT = 0;
    var BAN = { on: false, t: 0, life: 1.6, s: "", sub: "", c: C.accent, k: 1 };
    var LIVE_S = L.live + " · ", F = {}, vig = null, vigRed = null, feedW = 0, liveW = 0, comboStr = "", comboShown = 0, gox = 0, goy = 0;
    var DASH = [6, 5], DASH2 = [4, 4], DASH3 = [4, 4], NODASH = [];

    /* ---------- havuzlar (karede bellek ayırma yok) ---------- */
    var NP = 720, P = [], pc = 0, i;
    for (i = 0; i < NP; i++) P.push({ on: false, k: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 1, s0: 1, s1: 1, a: 1, rot: 0, vr: 0, drag: 0 });
    function emit(k, x, y, vx, vy, life, s0, s1, a) {
      var p = P[pc];
      pc = pc + 1 === NP ? 0 : pc + 1;
      p.on = true; p.k = k; p.x = x; p.y = y; p.z = 0; p.vx = vx; p.vy = vy; p.vz = 0; p.t = 0; p.life = life;
      p.s0 = s0; p.s1 = s1; p.a = a; p.rot = 0; p.vr = 0; p.drag = 0;
      return p;
    }
    var EM = pool(28, function () { return { x: 0, y: 0, t: 0, life: 1, rate: 7, acc: 0, p: 1, fire: false }; });
    var SH = pool(18, function () { return { x: 0, y: 0, t: 0, life: 1, r: 1, w: 1, a: 1, c: "#fff" }; });
    var TX = pool(24, function () { return { x: 0, y: 0, t: 0, life: 1, s: "", c: "#fff", f: 0 }; });
    var QX = pool(16, function () { return { t: 0, x: 0, y: 0, p: 1, wr: -99 }; });
    var TG = pool(12, function () {
      return { type: 0, x: 0, y: 0, age: 0, life: 1, st: 0, state: 0, hp: 1, hurt: 0, seed: 0,
        ax: 0, ay: 0, dx: 1, dy: 0, len: 0, v: 0, sp: 0, d: 0, dustT: 0 };
    });
    var ST = pool(8, function () {
      return { flyby: false, tx: 0, ty: 0, t: 0, jx: 0, jy: 0, ja: 0, jv: 0, jT: 0.4, turn: 0, jOn: false, rel: false, hit: false,
        mOn: false, mt: 0, mT: 0.3, m0x: 0, m0y: 0, mcx: 0, mcy: 0, mx: 0, my: 0, mdx: 1, mdy: 0, puff: 0,
        jh: new Float32Array(JN * 5), jn: 0, jw: 0, mh: new Float32Array(MN * 3), mn: 0, mw: 0, lastS: 0 };
    });

    /* ---------- hazır çizilmiş sprite'lar ---------- */
    function sprite(size, fn) { var c = doc.createElement("canvas"); c.width = c.height = size; fn(c.getContext("2d"), size); return c; }
    function radial(stops) {
      return function (c, s) {
        var gr = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        for (var j = 0; j < stops.length; j += 2) gr.addColorStop(stops[j], stops[j + 1]);
        c.fillStyle = gr; c.fillRect(0, 0, s, s);
      };
    }
    var SPR = {
      fire: sprite(128, radial([0, "rgba(255,252,232,1)", 0.16, "rgba(255,222,130,1)", 0.4, "rgba(250,140,45,.85)", 0.68, "rgba(205,55,25,.42)", 1, "rgba(120,20,10,0)"])),
      fireR: sprite(96, radial([0, "rgba(255,172,64,.95)", 0.35, "rgba(228,92,32,.85)", 0.7, "rgba(150,36,20,.45)", 1, "rgba(80,20,12,0)"])),
      glow: sprite(64, radial([0, "rgba(255,242,205,1)", 0.3, "rgba(255,190,90,.55)", 1, "rgba(255,140,40,0)"])),
      smoke: sprite(64, radial([0, "rgba(46,42,39,.92)", 0.45, "rgba(50,46,42,.55)", 1, "rgba(50,46,42,0)"])),
      puff: sprite(48, radial([0, "rgba(238,232,218,.9)", 0.5, "rgba(222,214,198,.45)", 1, "rgba(222,214,198,0)"])),
      dust: sprite(48, radial([0, "rgba(190,164,124,.8)", 0.5, "rgba(172,147,108,.38)", 1, "rgba(172,147,108,0)"])),
      spark: sprite(32, radial([0, "rgba(255,255,240,1)", 0.25, "rgba(255,212,122,.9)", 1, "rgba(255,120,30,0)"])),
      scorch: sprite(128, function (c, s) {
        radial([0, "rgba(14,11,9,.88)", 0.32, "rgba(22,18,14,.62)", 0.7, "rgba(40,32,24,.2)", 1, "rgba(40,32,24,0)"])(c, s);
        c.strokeStyle = "rgba(14,11,9,.38)"; c.lineCap = "round";
        for (var j = 0; j < 24; j++) {
          var a = Math.random() * TAU, r0 = s * 0.12, r1 = s * (0.3 + Math.random() * 0.19);
          c.lineWidth = 1 + Math.random() * 2.5;
          c.beginPath(); c.moveTo(s / 2 + Math.cos(a) * r0, s / 2 + Math.sin(a) * r0); c.lineTo(s / 2 + Math.cos(a) * r1, s / 2 + Math.sin(a) * r1); c.stroke();
        }
      }),
      grain: sprite(128, function (c, s) {
        var im = c.createImageData(s, s), d = im.data;
        for (var j = 0; j < d.length; j += 4) { var v = Math.random() < 0.5 ? 0 : 255; d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = Math.random() * 90; }
        c.putImageData(im, 0, 0);
      })
    };
    var grainPat = g.createPattern(SPR.grain, "repeat");
    var JET = win.Path2D ? (function () {
      var p = new win.Path2D(), pts = [0.52, 0, 0.30, -0.05, 0.06, -0.08, -0.12, -0.46, -0.22, -0.46, -0.16, -0.09, -0.36, -0.08,
        -0.47, -0.22, -0.53, -0.22, -0.5, -0.05], j;
      p.moveTo(pts[0], pts[1]);
      for (j = 2; j < pts.length; j += 2) p.lineTo(pts[j], pts[j + 1]);
      for (j = pts.length - 2; j >= 2; j -= 2) p.lineTo(pts[j], -pts[j + 1]);
      p.closePath();
      return p;
    })() : null;

    /* ---------- veri ---------- */
    function upper(s) { try { return s.toLocaleUpperCase(ctx.lang === "en" ? "en-US" : "tr-TR"); } catch (e) { return s.toUpperCase(); } }
    function setupData(js) {
      var src = js && js.districts && js.districts.length >= 11 ? js.districts : FALLBACK.map(function (f, j) {
        return { id: j, name: FB_NAMES[j], terrain: f[4], pop: f[2], c: [f[0], f[1]], n: f[3] };
      });
      var byId = {};
      districts = src.map(function (d) {
        var o = { id: d.id, name: String(d.name || ""), x: +d.c[0], y: +d.c[1], pop: +d.pop || 20, n: d.n || [], zr: 0, path: null,
          mtn: d.id === 10 || /dağ|tepe|plato|boğaz|orman/.test(d.terrain || "") };
        if (d.d && win.Path2D) { try { o.path = new win.Path2D(d.d); } catch (e) { o.path = null; } }
        if (d.id !== 10) { o.zr = 34 + Math.sqrt(o.pop) * 3.6; zones.push({ x: o.x, y: o.y, r: o.zr, flash: 0, hot: 0 }); }
        byId[o.id] = o;
        return o;
      });
      districts.forEach(function (d) {
        d.n.forEach(function (nid) { if (nid > d.id && byId[nid]) pairs.push([d, byId[nid]]); });
      });
    }

    /* ---------- statik harita katmanı: görüntü + renk + ızgara + sınırlar + adlar + yanık izleri ---------- */
    function baseS() { return Math.max(W / MAP_W, H / MAP_H); }
    function bake() {
      bakeAt = -1;
      var ls = imgFull ? 1 : 0.5, lw = Math.round(MAP_W * ls), lh = Math.round(MAP_H * ls), c = lg, x, y;
      if (layer.width !== lw || layer.height !== lh) { layer.width = lw; layer.height = lh; }
      layerS = ls;
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
      if (img) {
        c.drawImage(img, 0, 0, lw, lh);
        c.globalCompositeOperation = "saturation"; c.fillStyle = "rgba(128,128,128,0.24)"; c.fillRect(0, 0, lw, lh);
        c.globalCompositeOperation = "multiply"; c.fillStyle = "#e3d9c6"; c.fillRect(0, 0, lw, lh);
        c.globalCompositeOperation = "source-over";
      } else {
        c.fillStyle = "#3a4332"; c.fillRect(0, 0, lw, lh);
      }
      c.setTransform(ls, 0, 0, ls, 0, 0);
      var U = u / (baseS() * 1.075);
      if (!img) districts.forEach(function (d, j) { if (d.path) { c.fillStyle = j % 2 ? "#46503b" : "#3f4935"; c.fill(d.path); } });
      c.lineWidth = U; c.strokeStyle = "rgba(242,230,199,0.07)"; c.beginPath();
      for (x = 0; x <= MAP_W; x += 150) { c.moveTo(x, 0); c.lineTo(x, MAP_H); }
      for (y = 0; y <= MAP_H; y += 150) { c.moveTo(0, y); c.lineTo(MAP_W, y); }
      c.stroke();
      c.strokeStyle = "rgba(242,230,199,0.24)"; c.beginPath();
      for (x = 300; x < MAP_W; x += 300) for (y = 300; y < MAP_H; y += 300) {
        c.moveTo(x - 6 * U, y); c.lineTo(x + 6 * U, y); c.moveTo(x, y - 6 * U); c.lineTo(x, y + 6 * U);
      }
      c.stroke();
      c.setLineDash([7 * U, 5 * U]); c.lineWidth = 1.3 * U; c.strokeStyle = "rgba(242,230,199,0.26)";
      districts.forEach(function (d) { if (d.path) c.stroke(d.path); });
      c.setLineDash(NODASH);
      c.font = "700 " + (12 * U).toFixed(2) + "px " + CAPS; if (hasLS) c.letterSpacing = "0.12em";
      c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
      districts.forEach(function (d) {
        var ly = d.y + (d.zr || 30) + 13 * U, nm = upper(d.name);
        c.lineWidth = 3.2 * U; c.strokeStyle = "rgba(20,18,16,0.7)"; c.strokeText(nm, d.x, ly);
        c.fillStyle = d.id === 10 ? "rgba(244,150,128,0.95)" : "rgba(242,235,217,0.82)"; c.fillText(nm, d.x, ly);
        if (d.id === 10) {
          c.font = "700 " + (9.5 * U).toFixed(2) + "px " + CAPS;
          c.strokeText(L.enemy, d.x, ly + 13 * U); c.fillStyle = "rgba(219,71,56,0.95)"; c.fillText(L.enemy, d.x, ly + 13 * U);
          c.font = "700 " + (12 * U).toFixed(2) + "px " + CAPS;
        }
      });
      if (hasLS) c.letterSpacing = "0px";
      for (var j = 0; j < decals.length; j++) stampDecal(decals[j]);
      bakedS = baseS();
    }
    function stampDecal(dc) {
      var c = lg;
      c.setTransform(layerS, 0, 0, layerS, 0, 0);
      c.translate(dc.x, dc.y); c.rotate(dc.rot);
      if (dc.k === 0) { c.globalAlpha = 0.9; c.drawImage(SPR.scorch, -dc.r, -dc.r, dc.r * 2, dc.r * 2); }
      else {
        c.globalAlpha = 0.95; c.fillStyle = "#1a1714"; c.fillRect(-dc.r, -dc.r * 0.45, dc.r * 2, dc.r * 0.9);
        c.fillStyle = "#3d2b1e"; c.fillRect(dc.r * 0.35, -dc.r * 0.38, dc.r * 0.55, dc.r * 0.76);
      }
      c.globalAlpha = 1; c.setTransform(1, 0, 0, 1, 0, 0);
    }
    function addDecal(k, x, y, r, rot) {
      var dc = { k: k, x: x, y: y, r: r, rot: rot };
      decals.push(dc);
      if (decals.length > 90) decals.shift();
      stampDecal(dc);
    }

    /* ---------- boyut ve kamera ---------- */
    function r1(v) { return v.toFixed(1); }
    function onResize() {
      if (dead) return;
      var w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      W = w; H = h; dpr = Math.min(2, win.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
      u = clamp(Math.sqrt(W * H) / 720, 0.82, 1.35);
      kc = clamp(Math.min(W / 520, H / 420), 0.86, 1.15);
      root.style.setProperty("--k", kc.toFixed(3));
      root.classList.toggle("rbg-hava-compact", H < 430);
      hudH = 46 * kc; portrait = W / H < 1.25;
      F.capsS = "700 " + r1(11 * u) + "px " + CAPS; F.capsM = "800 " + r1(14 * u) + "px " + CAPS;
      F.info = "800 " + r1(15 * u) + "px " + CAPS; F.num = r1(26 * u) + "px " + DISP; F.warn = r1(24 * u) + "px " + DISP;
      F.big = r1(48 * u) + "px " + DISP; F.ban = r1(34 * u) + "px " + DISP;
      g.font = F.capsS; setLS(g, "0.14em");
      feedW = g.measureText(L.feed).width; liveW = g.measureText(LIVE_S).width;
      vig = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.3, W / 2, H / 2, Math.sqrt(W * W + H * H) * 0.6);
      vig.addColorStop(0, "rgba(12,11,10,0)"); vig.addColorStop(1, "rgba(12,11,10,0.62)");
      vigRed = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.25, W / 2, H / 2, Math.sqrt(W * W + H * H) * 0.6);
      vigRed.addColorStop(0, "rgba(219,71,56,0)"); vigRed.addColorStop(0.6, "rgba(219,71,56,0.08)"); vigRed.addColorStop(1, "rgba(219,71,56,0.6)");
      updateCam();
      if (ready) {
        if (Math.abs(baseS() / bakedS - 1) > 0.12) bakeAt = T + 0.25;
        if (!imgFull && img && cam.s * dpr > 0.75) upgrade();
        if (!raf) { if (bakeAt >= 0) bake(); render(); }
      }
    }
    function upgrade() {
      if (upgrading || imgFull) return;
      upgrading = true;
      loadImg(A + "img/map/tarsel_gun.webp").then(function (im) {
        if (dead || !im) return;
        img = im; imgFull = true;
        if (raf) bakeAt = T; else { bake(); render(); }
      });
    }
    function updateCam() {
      var z = 1.075 + 0.03 * Math.sin(T * 0.05), s = baseS() * z;
      var hw = W / 2 / s, hh = H / 2 / s, m = 18 / s;
      var fx = (portrait ? 1180 : 1050) + Math.sin(T * 0.037) * 55, fy = 700 + Math.cos(T * 0.029) * 40;
      cam.s = s;
      cam.x = hw + m < MAP_W - hw - m ? clamp(fx, hw + m, MAP_W - hw - m) : MAP_W / 2;
      cam.y = hh + m < MAP_H - hh - m ? clamp(fy, hh + m, MAP_H - hh - m) : MAP_H / 2;
    }
    function w2s(x, y) { SX = (x - cam.x) * cam.s + W / 2 + shx; SY = (y - cam.y) * cam.s + H / 2 + shy; }
    function s2wx(x) { return (x - W / 2 - shx) / cam.s + cam.x; }
    function s2wy(y) { return (y - H / 2 - shy) / cam.s + cam.y; }
    function blastPx() { return Math.max(24, 27 * u); }

    /* ---------- hedef üretimi ---------- */
    function calcRect() {
      var s = cam.s, m = 20 / s;
      R.x0 = cam.x + (W * 0.06 - W / 2) / s + m; R.x1 = cam.x + (W * 0.94 - W / 2) / s - m;
      R.y0 = cam.y + (hudH + H * 0.06 - H / 2) / s + m; R.y1 = cam.y + (H - Math.max(H * 0.1, 64 * u) - H / 2) / s - m;
    }
    function inRect(x, y) { return x >= R.x0 && x <= R.x1 && y >= R.y0 && y <= R.y1; }
    function zoneClear(x, y, extra) {
      for (var j = 0; j < zones.length; j++) { var z = zones[j], rr = z.r + extra; if (d2(x, y, z.x, z.y) < rr * rr) return false; }
      return true;
    }
    function targetClear(x, y, md) {
      var m2 = md * md;
      for (var j = 0; j < TG.length; j++) {
        var t = TG[j];
        if (!t.on || t.state === 1) continue;
        if (t.type === 1 ? segD2(x, y, t.ax, t.ay, t.ax + t.dx * t.len, t.ay + t.dy * t.len) < m2 : d2(x, y, t.x, t.y) < m2) return false;
      }
      return true;
    }
    function screenFree(x, y) { w2s(x, y); return !(SX > W - 130 * u && SY < hudH + 95 * u); }
    function visDistricts(mtn) {
      cand.length = 0;
      for (var j = 0; j < districts.length; j++) {
        var d = districts[j];
        if (mtn && !d.mtn) continue;
        if (d.x > R.x0 - 260 && d.x < R.x1 + 260 && d.y > R.y0 - 260 && d.y < R.y1 + 260) cand.push(d);
      }
      return cand;
    }
    function clearance() { return blastPx() / cam.s * 1.25 + 12 * u / cam.s; }
    function findSpot(list, tries) {
      var extra = clearance(), md = 66 * u / cam.s, x, y;
      for (var j = 0; j < tries; j++) {
        if (list.length && j < tries - 6) {
          var d = list[(Math.random() * list.length) | 0], a = Math.random() * TAU;
          var rr = d.zr ? d.zr + extra + Math.random() * 130 : Math.random() * 70;
          x = d.x + Math.cos(a) * rr; y = d.y + Math.sin(a) * rr;
        } else { x = rnd(R.x0, R.x1); y = rnd(R.y0, R.y1); }
        if (!inRect(x, y) || !zoneClear(x, y, extra) || !targetClear(x, y, md) || !screenFree(x, y)) continue;
        SPOT.x = x; SPOT.y = y;
        return true;
      }
      return false;
    }
    function newTarget(type) {
      var t = free(TG);
      if (!t) return null;
      t.on = true; t.type = type; t.age = 0; t.state = 0; t.st = 0; t.hp = type === 2 ? 2 : 1; t.hurt = 0;
      t.seed = Math.random(); t.dustT = 0;
      sfx("ui_tik", 0.12);
      return t;
    }
    function spawnCell(prog) {
      if (!findSpot(visDistricts(false), 22)) return false;
      var t = newTarget(0);
      if (!t) return false;
      t.x = SPOT.x; t.y = SPOT.y; t.life = 5.6 - 1.7 * prog + Math.random() * 0.6;
      return true;
    }
    /* konvoy: komşu iki bölge merkezi arasındaki düz yolda bir kasabadan çıkıp ötekine kaçar;
       kasaba halkası içindeyken vurmak sivil kayıp demektir, aradaki açık yol vuruş penceresidir */
    var VIS = new Uint8Array(31);
    function spawnConvoy(prog) {
      if (!pairs.length) return false;
      var safe = blastPx() / cam.s * 0.7 + 14 * u / cam.s, md = 60 * u / cam.s, minWin = 70 * u / cam.s, N = 30, k;
      for (var tr = 0; tr < 12; tr++) {
        var pr = pairs[(Math.random() * pairs.length) | 0], rev = Math.random() < 0.5;
        var a = rev ? pr[1] : pr[0], b = rev ? pr[0] : pr[1];
        var ex = b.x - a.x, ey = b.y - a.y, sl = Math.sqrt(ex * ex + ey * ey);
        if (sl < 1) continue;
        var ux = ex / sl, uy = ey / sl, s0 = a.zr ? a.zr * 0.8 : 24, span = sl - (b.zr ? b.zr * 0.8 : 24) - s0;
        if (span < minWin * 1.5) continue;
        var bs = -1, bl = 0, cs = -1;
        for (k = 0; k <= N; k++) {
          var dd = s0 + span * k / N, x = a.x + ux * dd, y = a.y + uy * dd, vis = inRect(x, y) && screenFree(x, y);
          VIS[k] = vis ? 1 : 0;
          if (vis && zoneClear(x, y, safe) && targetClear(x, y, md)) {
            if (cs < 0) cs = k;
            if (k - cs + 1 > bl) { bl = k - cs + 1; bs = cs; }
          } else cs = -1;
        }
        if (bs < 0 || (bl - 1) / N * span < minWin) continue;
        var k0 = bs, k1 = bs + bl - 1;
        while (k0 > 0 && VIS[k0 - 1]) k0--;
        while (k1 < N && VIS[k1 + 1]) k1++;
        var r0 = s0 + span * k0 / N, len = span * (k1 - k0) / N;
        var sp = 17 * u / cam.s, v = (26 + 14 * prog) * u / cam.s, travel = len - 2 * sp;
        if (travel <= 0) continue;
        var dur = travel / v;
        if (dur > 9) { v = travel / 9; dur = 9; } else if (dur < 3.5) { v = travel / 3.5; dur = 3.5; }
        var t = newTarget(1);
        if (!t) return false;
        t.ax = a.x + ux * r0; t.ay = a.y + uy * r0; t.dx = ux; t.dy = uy;
        t.len = len; t.d = 2 * sp; t.v = v; t.sp = sp; t.life = dur;
        t.x = t.ax + ux * sp; t.y = t.ay + uy * sp;
        return true;
      }
      return false;
    }
    function spawnHQ() {
      var list = visDistricts(true), ok = false, j, d;
      for (j = 0; j < list.length && !ok; j++) {
        d = list[j];
        if (d.id !== 10) continue;
        for (var k = 0; k < 8 && !ok; k++) {
          var x = d.x + rnd(-60, 60), y = d.y + rnd(-45, 45);
          if (inRect(x, y) && targetClear(x, y, 70 * u / cam.s) && screenFree(x, y)) { SPOT.x = x; SPOT.y = y; ok = true; }
        }
      }
      if (!ok) ok = findSpot(list, 24) || findSpot(visDistricts(false), 24);
      if (!ok) return false;
      var t = newTarget(2);
      if (!t) return false;
      t.x = SPOT.x; t.y = SPOT.y; t.life = 9.5;
      banner(L.hqSpot, L.hqSub, C.bad);
      sfx("olay", 0.6);
      say("karargah_tespit_1");
      return true;
    }
    function liveCount(type) {
      var n = 0;
      for (var j = 0; j < TG.length; j++) if (TG[j].on && TG[j].state === 0 && (type < 0 || TG[j].type === type)) n++;
      return n;
    }

    /* ---------- vuruş: kilit → jet → füze → çarpma ---------- */
    function exitDist(px, py, dx, dy, m) {
      var t = 1e9;
      if (dx > 1e-6) t = Math.min(t, (W + m - px) / dx); else if (dx < -1e-6) t = Math.min(t, (-m - px) / dx);
      if (dy > 1e-6) t = Math.min(t, (H + m - py) / dy); else if (dy < -1e-6) t = Math.min(t, (-m - py) / dy);
      return t;
    }
    function fire(sx, sy) {
      if (ammo < 1) { ammoShake = 0.4; sfx("ui_hata", 0.45); return; }
      var st = free(ST);
      if (!st) return;
      ammo -= 1; shots++;
      setupJet(st, sx, sy, false);
      sfx("jet", 0.55);
    }
    function setupJet(st, sx, sy, flyby) {
      var s = cam.s, v = Math.max(950, Math.sqrt(W * W + H * H) * 1.15), want = v * 0.42;
      var rel = flyby ? 0 : 150 * u, off = flyby ? 0 : rnd(14, 34) * (Math.random() < 0.5 ? -1 : 1);
      var bestA = 0, bestE = 1e12, bestL = 0, a, dx, dy, rx, ry, j;
      for (j = 0; j < 12; j++) {
        a = Math.random() * TAU; dx = Math.cos(a); dy = Math.sin(a);
        rx = sx - dx * rel - dy * off; ry = sy - dy * rel + dx * off;
        var Ld = exitDist(rx, ry, -dx, -dy, 60), e = Math.abs(Ld - want);
        if (rx < -20 || rx > W + 20 || ry < -20 || ry > H + 20) e += 400;
        if (e < bestE) { bestE = e; bestA = a; bestL = Ld; }
      }
      dx = Math.cos(bestA); dy = Math.sin(bestA);
      rx = sx - dx * rel - dy * off; ry = sy - dy * rel + dx * off;
      var Lp = Math.max(80, bestL), jT = clamp(Lp / v, 0.3, 0.55);
      st.on = true; st.flyby = flyby; st.t = 0; st.hit = false; st.rel = flyby; st.mOn = false;
      st.tx = s2wx(sx); st.ty = s2wy(sy);
      st.jx = s2wx(rx - dx * Lp); st.jy = s2wy(ry - dy * Lp); st.ja = bestA; st.jv = Lp / jT / s; st.jT = jT;
      st.turn = rnd(0.5, 1.1) * (Math.random() < 0.5 ? -1 : 1);
      st.jOn = true; st.jn = 0; st.jw = 0; st.mn = 0; st.mw = 0; st.puff = 0; st.lastS = T;
      st.m0x = s2wx(rx); st.m0y = s2wy(ry);
      st.mcx = st.m0x + dx * rel / s * 0.6; st.mcy = st.m0y + dy * rel / s * 0.6;
      st.mx = st.m0x; st.my = st.m0y; st.mdx = dx; st.mdy = dy;
      st.mT = clamp(rel / 520, 0.26, 0.4);
    }
    function pushJ(st) {
      var o = st.jw * 5, h = st.jh;
      h[o] = st.jx; h[o + 1] = st.jy; h[o + 2] = T; h[o + 3] = Math.sin(st.ja); h[o + 4] = Math.cos(st.ja);
      st.jw = st.jw + 1 === JN ? 0 : st.jw + 1;
      if (st.jn < JN) st.jn++;
      st.lastS = T;
    }
    function pushM(st) {
      var o = st.mw * 3, h = st.mh;
      h[o] = st.mx; h[o + 1] = st.my; h[o + 2] = T;
      st.mw = st.mw + 1 === MN ? 0 : st.mw + 1;
      if (st.mn < MN) st.mn++;
      st.lastS = T;
    }
    function updStrikes(dt) {
      for (var j = 0; j < ST.length; j++) {
        var st = ST[j];
        if (!st.on) continue;
        st.t += dt;
        if (st.jOn) {
          if (st.t > st.jT) { st.ja += st.turn * dt; st.jv *= 1 + dt * 0.6; }
          st.jx += Math.cos(st.ja) * st.jv * dt; st.jy += Math.sin(st.ja) * st.jv * dt;
          pushJ(st);
          if (!st.rel && st.t >= st.jT) {
            st.rel = true; st.mOn = true; st.mt = 0;
            sfx("fuze", 0.6);
            emit(K_FLASH, st.m0x, st.m0y, 0, 0, 0.14, 14 * UU, 34 * UU, 0.9);
          }
          if (st.t > st.jT) {
            w2s(st.jx, st.jy);
            if (SX < -120 || SX > W + 120 || SY < -120 || SY > H + 120) st.jOn = false;
          }
        }
        if (st.mOn) {
          st.mt += dt;
          var k = Math.min(1, st.mt / st.mT), e = k * k * 0.5 + k * 0.5, ie = 1 - e;
          st.mx = ie * ie * st.m0x + 2 * ie * e * st.mcx + e * e * st.tx;
          st.my = ie * ie * st.m0y + 2 * ie * e * st.mcy + e * e * st.ty;
          var ddx = ie * (st.mcx - st.m0x) + e * (st.tx - st.mcx), ddy = ie * (st.mcy - st.m0y) + e * (st.ty - st.mcy);
          var dl = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dl > 1e-6) { st.mdx = ddx / dl; st.mdy = ddy / dl; }
          pushM(st);
          st.puff -= dt;
          if (st.puff <= 0) {
            st.puff = 0.022;
            emit(K_PUFF, st.mx - st.mdx * 6 * UU, st.my - st.mdy * 6 * UU, rnd(-6, 6) * UU, rnd(-6, 6) * UU, rnd(0.6, 0.9), 4 * UU, 15 * UU, 0.42);
          }
          if (k >= 1) { st.mOn = false; st.hit = true; impact(st.tx, st.ty); }
        }
        if (!st.jOn && !st.mOn && st.rel && T - st.lastS > TRAIL) st.on = false;
      }
    }

    /* ---------- patlama ---------- */
    function shock(x, y, life, r, w, a, col) {
      var o = free(SH);
      if (!o) return;
      o.on = true; o.x = x; o.y = y; o.t = 0; o.life = life; o.r = r; o.w = w; o.a = a; o.c = col;
    }
    function emitter(x, y, life, p, fire) {
      var e = free(EM);
      if (!e) return;
      e.on = true; e.x = x; e.y = y; e.t = 0; e.life = life; e.rate = 7; e.acc = 0; e.p = p; e.fire = fire;
    }
    function queueBoom(x, y, p, delay, wr) {
      var q = free(QX);
      if (!q) return;
      q.on = true; q.x = x; q.y = y; q.p = p; q.t = delay; q.wr = wr;
    }
    function explode(x, y, p) {
      var U = UU, j, a, sp, q;
      emit(K_FLASH, x, y, 0, 0, 0.24, 70 * U * p, 150 * U * p, 1);
      emit(K_BALL, x, y, 0, 0, 0.5, 22 * U * p, 78 * U * p, 1);
      q = emit(K_BALLR, x, y, 0, 0, 0.8, 26 * U * p, 92 * U * p, 0.95); q.t = -0.04;
      for (j = 0; j < 4; j++) {
        q = emit(K_SMOKE, x + rnd(-10, 10) * U * p, y + rnd(-10, 10) * U * p, (wind + rnd(-10, 10)) * U, -rnd(8, 20) * U,
          rnd(2.4, 3.4), 34 * U * p, rnd(90, 130) * U * p, 0.75);
        q.t = -(0.16 + j * 0.1);
      }
      for (j = 0; j < 12; j++) {
        a = j / 12 * TAU + rnd(-0.2, 0.2); sp = rnd(110, 190) * U * p;
        q = emit(K_DUST, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.8, 1.3), 14 * U * p, rnd(38, 54) * U * p, 0.5); q.drag = 3.4;
      }
      for (j = 0; j < 11; j++) {
        a = Math.random() * TAU; sp = rnd(50, 170) * U * p;
        q = emit(K_DEBRIS, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(1, 1.7), rnd(2.5, 5) * U, 0, 1);
        q.vz = rnd(90, 230) * U * p; q.vr = rnd(-14, 14); q.drag = 0.6;
      }
      for (j = 0; j < 14; j++) {
        a = Math.random() * TAU; sp = rnd(170, 430) * U * p;
        q = emit(K_SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.25, 0.6), rnd(7, 13) * U, 2 * U, 1); q.drag = 4.5;
      }
      for (j = 0; j < 8; j++) {
        q = emit(K_EMBER, x + rnd(-12, 12) * U, y + rnd(-12, 12) * U, rnd(-25, 25) * U, -rnd(20, 55) * U, rnd(1.2, 2.4), rnd(4, 7) * U, 0, 1);
        q.drag = 0.7;
      }
      shock(x, y, 0.45, 115 * U * p, 5, 0.9, "#fff3d6");
      shock(x, y, 0.95, 70 * U * p, 9, 0.35, "#cdb994");
      emitter(x, y, 5 + 2 * p, p, true);
      addDecal(0, x, y, 30 * U * p, Math.random() * TAU);
      trauma = Math.min(1, trauma + 0.38 * p);
      flash = Math.max(flash, 0.55 * p);
    }

    /* ---------- çarpma sonucu, skor, meşruiyet ---------- */
    function text(x, y, s, col, f) {
      var o = free(TX), j;
      if (!o) { o = TX[0]; for (j = 1; j < TX.length; j++) if (TX[j].t / TX[j].life > o.t / o.life) o = TX[j]; }
      o.on = true; o.x = x; o.y = y; o.s = s; o.c = col; o.f = f; o.t = 0; o.life = f === 1 ? 1.7 : f === 0 ? 1.15 : 0.95;
    }
    function banner(s, sub, col) {
      BAN.on = true; BAN.t = 0; BAN.s = s; BAN.sub = sub || ""; BAN.c = col || C.accent; BAN.life = 1.7;
      g.font = F.ban; setLS(g, "0.04em");
      var w = g.measureText(s).width;
      if (BAN.sub) { g.font = F.capsM; setLS(g, "0.16em"); w = Math.max(w, g.measureText(BAN.sub).width); }
      BAN.k = Math.min(1, W * 0.9 / Math.max(1, w));
    }
    function hitTest(t, x, y, r) {
      var r2 = r * r;
      if (t.type !== 1) return d2(t.x, t.y, x, y) <= r2;
      for (var j = 0; j < 3; j++) {
        var dd = Math.max(0, t.d - j * t.sp);
        if (d2(t.ax + t.dx * dd, t.ay + t.dy * dd, x, y) <= r2) return true;
      }
      return false;
    }
    function impact(x, y) {
      explode(x, y, 1);
      sfx(Math.random() < 0.5 ? "patlama1" : "patlama2", 0.85);
      if (state !== 2) return;
      var B = blastPx() / cam.s, pad = 12 * u / cam.s, hit = 0, j, z = null, zd = 0;
      for (j = 0; j < TG.length; j++) {
        var t = TG[j];
        if (t.on && t.state === 0 && hitTest(t, x, y, B + pad * (t.type === 2 ? 1.5 : 1))) { hit++; onHit(t); }
      }
      for (j = 0; j < zones.length; j++) {
        var q = zones[j], d = Math.sqrt(d2(x, y, q.x, q.y)) - (q.r + B * 0.7);
        if (d < zd) { zd = d; z = q; }
      }
      if (hit) hitShots++;
      else if (!z) { combo = 0; text(x, y, L.miss, C.text, 2); }
      if (z) {
        legit = Math.max(0, legit - 20); civ++; combo = 0; z.flash = 1; dmg = 1;
        trauma = Math.min(1, trauma + 0.25);
        text(x, y - 22 * UU, L.civ + " −20", C.bad, 1);
        sfx("kotu", 0.8);
        kick(cells[1], "rbg-hava-hit");
        if (legit <= 0) endRound(false);
      }
    }
    function onHit(t) {
      hitsTotal++;
      combo = gt - lastHit <= COMBO_WIN && combo > 0 ? combo + 1 : 1;
      lastHit = gt; punch = 0;
      if (combo > bestCombo) bestCombo = combo;
      var mult = Math.min(combo, 8), U = UU, j;
      if (t.type === 2 && t.hp > 1) {
        t.hp--; t.hurt = 1; t.life = Math.max(t.life, t.age + 3);
        text(t.x, t.y - 30 * U, L.dmg, C.accent, 2);
        emitter(t.x, t.y, t.life - t.age + 2, 0.7, true);
        return;
      }
      t.state = 1; t.st = 0; kills++;
      var base = t.type === 0 ? 100 : t.type === 1 ? 250 : 600, pts = base * mult, quick = t.age < 1.25 ? Math.round(base * 0.5) : 0;
      score += pts + quick;
      text(t.x, t.y - 20 * U, "+" + fmt(pts + quick, L.sep) + (mult > 1 ? "  ×" + mult : ""), C.accent, 0);
      if (quick) text(t.x, t.y + 18 * U, L.fast + " +" + quick, C.text, 2);
      if (t.type === 1) {
        for (j = 0; j < 3; j++) {
          var dd = Math.max(0, t.d - j * t.sp);
          queueBoom(t.ax + t.dx * dd, t.ay + t.dy * dd, 0.55, 0.08 + j * 0.11, Math.atan2(t.dy, t.dx));
        }
      }
      if (t.type === 2) {
        queueBoom(t.x + 12 * U, t.y - 7 * U, 1.3, 0.1, -99);
        queueBoom(t.x - 13 * U, t.y + 9 * U, 0.9, 0.28, -99);
        slowT = 0.3; trauma = 1;
        banner(L.hqDown, "+" + fmt(pts + quick, L.sep), C.accent);
        say("karargah_yok_1", true);
        sfx("iyi", 0.6);
      } else if (hitsTotal % 5 === 0) say(Math.random() < 0.5 ? "vurus_1" : "vurus_2");
    }
    function expire(t, silent) {
      t.state = 2; t.st = 0;
      if (t.type === 2 && !silent && state === 2) {
        legit = Math.max(0, legit - 10);
        text(t.x, t.y - 26 * UU, L.hqEsc + " −10", C.bad, 1);
        sfx("ui_hata", 0.6);
        kick(cells[1], "rbg-hava-hit");
        if (legit <= 0) endRound(false);
      }
    }

    /* ---------- güncelleme ---------- */
    function updTargets(dt) {
      for (var j = 0; j < TG.length; j++) {
        var t = TG[j];
        if (!t.on) continue;
        if (t.state !== 0) {
          t.st += dt;
          if (t.st >= (t.state === 1 ? 0.5 : 0.4)) t.on = false;
          continue;
        }
        t.age += dt;
        if (t.hurt > 0) t.hurt = Math.max(0, t.hurt - dt * 3);
        if (t.type === 1) {
          t.d += t.v * dt;
          var mid = t.d - t.sp;
          t.x = t.ax + t.dx * mid; t.y = t.ay + t.dy * mid;
          t.dustT -= dt;
          if (t.dustT <= 0) {
            t.dustT = 0.09;
            var bd = Math.max(0, t.d - 2 * t.sp);
            emit(K_DUST, t.ax + t.dx * bd, t.ay + t.dy * bd, (-t.dx * 10 + rnd(-4, 4)) * UU, (-t.dy * 10 + rnd(-4, 4)) * UU, 0.9, 5 * UU, 16 * UU, 0.32);
          }
          if (t.d >= t.len) expire(t, false);
        } else if (t.age >= t.life) expire(t, false);
      }
    }
    function updParts(dt) {
      var grav = 640 * UU * dt;
      for (var j = 0; j < NP; j++) {
        var p = P[j];
        if (!p.on) continue;
        p.t += dt;
        if (p.t >= p.life) { p.on = false; continue; }
        if (p.t < 0) continue;
        if (p.drag) { var f = 1 / (1 + p.drag * dt); p.vx *= f; p.vy *= f; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === K_DEBRIS) {
          p.vz -= grav; p.z += p.vz * dt; p.rot += p.vr * dt;
          if (p.z < 0) { p.z = 0; p.vz = -p.vz * 0.3; p.vx *= 0.55; p.vy *= 0.55; }
        }
      }
    }
    function updEmitters(dt) {
      for (var j = 0; j < EM.length; j++) {
        var e = EM[j];
        if (!e.on) continue;
        e.t += dt;
        if (e.t >= e.life) { e.on = false; continue; }
        var f = 1 - e.t / e.life;
        e.acc += dt * e.rate * (0.35 + 0.65 * f);
        while (e.acc >= 1) {
          e.acc -= 1;
          emit(K_SMOKE, e.x + rnd(-6, 6) * UU, e.y + rnd(-4, 4) * UU, (wind + rnd(-5, 5)) * UU, -rnd(14, 30) * UU,
            rnd(2, 3), rnd(10, 16) * UU * e.p, rnd(44, 70) * UU * e.p, 0.5 * f + 0.15);
          if (e.fire && f > 0.35 && Math.random() < 0.6) {
            emit(K_FIRE, e.x + rnd(-5, 5) * UU, e.y + rnd(-3, 3) * UU, rnd(-6, 6) * UU, -rnd(10, 26) * UU, rnd(0.35, 0.7), rnd(9, 15) * UU * e.p, 2 * UU, 0.9);
          }
        }
      }
    }
    function updMisc(dt, rdt) {
      var j, o;
      for (j = 0; j < SH.length; j++) { o = SH[j]; if (o.on && (o.t += dt) >= o.life) o.on = false; }
      for (j = 0; j < TX.length; j++) { o = TX[j]; if (o.on && (o.t += rdt) >= o.life) o.on = false; }
      for (j = 0; j < QX.length; j++) {
        o = QX[j];
        if (!o.on || (o.t -= dt) > 0) continue;
        o.on = false;
        explode(o.x, o.y, o.p);
        sfx(Math.random() < 0.5 ? "patlama1" : "patlama2", 0.2 + 0.45 * o.p);
        if (o.wr > -9) addDecal(1, o.x, o.y, 7 * UU, o.wr);
      }
      if (BAN.on && (BAN.t += rdt) >= BAN.life) BAN.on = false;
      hoverBad = false;
      var hx = s2wx(hover.x), hy = s2wy(hover.y), B7 = blastPx() / cam.s * 0.7, hv = hover.on && state === 2;
      for (j = 0; j < zones.length; j++) {
        var z = zones[j], rr = z.r + B7, on = hv && d2(hx, hy, z.x, z.y) < rr * rr;
        if (on) hoverBad = true;
        z.hot += ((on ? 1 : 0) - z.hot) * Math.min(1, rdt * 10);
        if (z.flash > 0) z.flash = Math.max(0, z.flash - rdt * 0.9);
      }
    }
    function update(dt, rdt) {
      T += rdt;
      updateCam();
      UU = u / cam.s;
      trauma = Math.max(0, trauma - rdt * 1.5);
      var sh = trauma * trauma * 16 * u;
      shx = sh * (Math.sin(T * 73.1) * 0.6 + Math.sin(T * 127.3) * 0.4);
      shy = sh * (Math.sin(T * 91.7 + 1.3) * 0.6 + Math.sin(T * 151.9) * 0.4);
      flash = Math.max(0, flash - rdt * 5); dmg = Math.max(0, dmg - rdt * 1.1);
      punch += rdt; ammoShake = Math.max(0, ammoShake - rdt);
      if (bakeAt >= 0 && T >= bakeAt) bake();
      if (stampAt > 0 && T >= stampAt) { stampAt = 0; sfx("damga", 0.8); }
      if (state === 2) {
        gt += dt;
        if (ammo < AMMO_MAX) ammo = Math.min(AMMO_MAX, ammo + dt / RECHARGE);
        var prog = clamp(gt / ROUND, 0, 1);
        spawnT -= dt;
        if (spawnT <= 0) {
          spawnT = (1.35 - 0.72 * prog) * rnd(0.75, 1.2);
          if (liveCount(-1) < 3 + Math.floor(prog * 4.5)) {
            calcRect();
            if (!(prog > 0.05 && Math.random() < 0.32 && spawnConvoy(prog))) spawnCell(prog);
          }
        }
        hqT -= dt;
        if (hqT <= 0) {
          calcRect();
          hqT = ROUND - gt > 9 && !liveCount(2) && spawnHQ() ? rnd(16, 21) : 2;
        }
        if (combo > 0 && gt - lastHit > COMBO_WIN) combo = 0;
        if (!last10 && ROUND - gt <= 10) { last10 = true; banner(L.last10, "", C.bad); sfx("telsiz", 0.5); }
        if (gt >= ROUND) endRound(true);
      } else if (state === 3) {
        endT -= rdt;
        if (endT <= 0) finish();
      } else if (state === 1 || state === 4) {
        flyT -= rdt;
        if (flyT <= 0) {
          flyT = rnd(3.5, 6);
          var st = free(ST);
          if (st) setupJet(st, rnd(W * 0.2, W * 0.8), rnd(H * 0.25, H * 0.75), true);
        }
      }
      updTargets(dt); updStrikes(dt); updEmitters(dt); updParts(dt); updMisc(dt, rdt);
      if (countEl) {
        countT += rdt;
        var ck = Math.min(1, countT / 0.9);
        countEl.textContent = fmt(countTo * easeOut(ck), L.sep);
        if (ck >= 1) countEl = null;
      }
      hud(rdt);
    }

    /* ---------- üst çubuk (yalnız değer değişince DOM'a yazılır) ---------- */
    function hud(rdt) {
      if (state !== 2 && state !== 3) return;
      dispScore += (score - dispScore) * Math.min(1, rdt * 9);
      if (Math.abs(score - dispScore) < 1) dispScore = score;
      var s = Math.round(dispScore);
      if (s !== hc.s) { hc.s = s; elScore.textContent = fmt(s, L.sep); }
      if (legit !== hc.l) {
        hc.l = legit; elLegit.textContent = legit;
        elBar.style.transform = "scaleX(" + legit / 100 + ")";
        var col = legit > 60 ? C.good : legit > 30 ? C.accent : C.bad;
        if (col !== hc.lc) { hc.lc = col; elBar.style.backgroundColor = col; }
      }
      var tl = state === 2 ? Math.max(0, Math.ceil(ROUND - gt)) : 0;
      if (tl !== hc.t) {
        hc.t = tl; elTime.textContent = tl;
        cells[2].classList.toggle("rbg-hava-hot", tl <= 10);
        if (tl <= 10 && state === 2) { kick(cells[2], "rbg-hava-tick"); if (tl <= 5 && tl > 0) sfx("ui_tik", 0.35); }
      }
      var cm = Math.max(1, Math.min(combo, 8));
      if (cm !== hc.c) {
        if (cm > hc.c && cm > 1) kick(cells[3], "rbg-hava-tick");
        hc.c = cm; elCombo.textContent = "×" + cm;
        cells[3].classList.toggle("rbg-hava-amb", cm > 1);
      }
    }

    /* ---------- akış ---------- */
    function reset() {
      var j, arrs = [TG, ST, EM, SH, TX, QX];
      for (j = 0; j < NP; j++) P[j].on = false;
      arrs.forEach(function (a) { for (var k = 0; k < a.length; k++) a[k].on = false; });
      zones.forEach(function (z) { z.flash = 0; z.hot = 0; });
      gt = 0; score = 0; dispScore = 0; legit = 100; civ = 0; shots = 0; hitShots = 0; kills = 0; hitsTotal = 0;
      combo = 0; bestCombo = 0; lastHit = -9; punch = 9; ammo = AMMO_MAX; spawnT = 0.9; hqT = 12; last10 = false;
      slowT = 0; dmg = 0; flash = 0; trauma = 0; BAN.on = false; countEl = null; stampAt = 0;
      hc.s = hc.l = hc.t = hc.c = -1;
      cells[2].classList.remove("rbg-hava-hot"); cells[3].classList.remove("rbg-hava-amb");
      if (decals.length) { decals.length = 0; bake(); }
    }
    function startGame() {
      if (!ready || state === 2 || state === 3) return;
      reset();
      state = 2;
      ov.classList.remove("rbg-hava-on");
      root.classList.add("rbg-hava-hudon", "rbg-hava-play");
      cv.style.touchAction = "none";
      sfx("ui_onay", 0.6);
      say("hava_sec_1", true);
      banner(L.go, L.goSub, C.accent);
    }
    function endRound(won) {
      if (state !== 2) return;
      state = 3; endWon = won; endT = won ? 1.4 : 1.8;
      banner(won ? L.timeUp : L.legitOut, "", won ? C.accent : C.bad);
      for (var j = 0; j < TG.length; j++) if (TG[j].on && TG[j].state === 0) expire(TG[j], true);
      cv.style.touchAction = "";
      root.classList.remove("rbg-hava-play");
      hover.on = false;
    }
    function finish() {
      state = 4;
      var acc = shots ? hitShots / shots : 0;
      var lb = endWon ? legit * 20 : 0, ab = endWon && shots >= 5 ? Math.round(acc * 2500) : 0;
      var fin = Math.round(score + lb + ab);
      var stars = endWon ? 1 + (fin >= 6000 ? 1 : 0) + (fin >= 15000 && civ === 0 ? 1 : 0) : 0;
      var r = null;
      try { r = ctx.onEnd ? ctx.onEnd({ score: fin, won: endWon }) : null; } catch (e) { r = null; }
      if (dead) return;
      r = r || {};
      root.classList.remove("rbg-hava-hudon");
      showEnd(fin, acc, lb, ab, stars, r);
      if (endWon) { sfx("basarim", 0.7); say("zafer_1", true); } else sfx("ui_hata", 0.6);
      stampAt = T + 0.55;
      flyT = 2.5;
    }

    /* ---------- kartlar ---------- */
    function header(left, right) { return '<div class="rbg-hava-hd"><span>' + left + '</span>' + right + '</div>'; }
    function chip(icon, name, pts) { return '<span class="rbg-hava-chip">' + icon + name + ' <em>' + pts + '</em></span>'; }
    function showIntro() {
      state = 1;
      var best = 0;
      try { best = ctx.best ? ctx.best() || 0 : 0; } catch (e) { best = 0; }
      ov.innerHTML = '<div class="rbg-hava-card">' +
        header(L.order, '<span class="rbg-hava-cls">' + L.cls + '</span>') +
        '<div class="rbg-hava-t">' + L.titleU + '</div>' +
        '<p class="rbg-hava-p">' + L.how1 + '</p><p class="rbg-hava-p">' + L.how2 + '</p>' +
        '<div class="rbg-hava-lg">' + chip(ICON.cell, L.cell, "100") + chip(ICON.convoy, L.convoy, "250") + chip(ICON.hq, L.hq, "600") + '</div>' +
        '<div class="rbg-hava-note">' + L.note + '</div>' +
        '<div class="rbg-hava-ft"><div class="rbg-hava-best">' + L.best + '<strong>' + fmt(best, L.sep) + '</strong></div>' +
        '<button type="button" class="rbg-hava-btn" data-act="start">' + L.start + '</button></div></div>';
      ov.classList.add("rbg-hava-on");
    }
    function showEnd(fin, acc, lb, ab, stars, r) {
      var st = "", rows = "", n = 0, j;
      for (j = 0; j < 3; j++) {
        st += '<svg viewBox="0 0 24 24"' + (j < stars ? ' class="rbg-hava-son" style="animation-delay:' + (0.6 + j * 0.18).toFixed(2) + 's"' : '') +
          '><path d="' + STAR + '"/></svg>';
      }
      function row(k, v, cls) {
        return '<div' + (cls ? ' class="' + cls + '"' : '') + ' style="animation-delay:' + (0.35 + 0.07 * n++).toFixed(2) + 's"><dt>' + k + '</dt><dd>' + v + '</dd></div>';
      }
      rows += row(L.kills, kills) + row(L.acc, Math.round(acc * 100) + "%") + row(L.civs, civ, civ ? "rbg-hava-bad" : "") +
        row(L.bestCombo, "×" + Math.min(bestCombo, 8), "rbg-hava-opt");
      if (endWon) rows += row(L.legitB, "+" + fmt(lb, L.sep)) + row(L.accB, "+" + fmt(ab, L.sep));
      var best = r.best != null ? r.best : fin;
      ov.innerHTML = '<div class="rbg-hava-card">' +
        header(L.report, '<span>TRS-' + (1000 + ((Math.random() * 8999) | 0)) + '</span>') +
        '<div class="rbg-hava-top"><div class="rbg-hava-res' + (endWon ? '' : ' rbg-hava-lost') + '">' + (endWon ? L.won : L.lost) + '</div>' +
        '<div class="rbg-hava-stars">' + st + '</div></div>' +
        '<div class="rbg-hava-sc">' + L.score + '<strong>0</strong></div>' +
        '<dl class="rbg-hava-rows">' + rows + '</dl>' +
        '<div class="rbg-hava-ft"><div class="rbg-hava-best">' + L.best + '<strong>' + fmt(best, L.sep) +
        (r.newBest ? '<span class="rbg-hava-nb">' + L.newBest + '</span>' : '') + '</strong></div>' +
        '<button type="button" class="rbg-hava-btn" data-act="start">' + L.again + '</button></div></div>';
      countEl = ov.querySelector(".rbg-hava-sc strong"); countTo = fin; countT = 0;
      ov.classList.add("rbg-hava-on");
    }

    /* ---------- çizim: dünya katmanı ---------- */
    function drawZones(c, U) {
      DASH[0] = 6 * U; DASH[1] = 5 * U;
      c.lineWidth = 1.6 * U;
      for (var j = 0; j < zones.length; j++) {
        var z = zones[j], f = z.flash, hot = z.hot, red = f > 0.01 || hot > 0.05;
        c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU);
        c.globalAlpha = 0.07 + 0.25 * f + 0.12 * hot; c.fillStyle = red ? C.bad : C.cream; c.fill();
        c.globalAlpha = 0.55 + 0.45 * Math.max(f, hot); c.strokeStyle = red ? C.bad : C.cream;
        c.setLineDash(DASH); c.lineDashOffset = -T * 8 * U; c.stroke(); c.setLineDash(NODASH);
        /* krem ev kümesi rozeti */
        c.globalAlpha = 0.6; c.fillStyle = C.bg; c.beginPath(); c.arc(z.x, z.y, 12.5 * U, 0, TAU); c.fill();
        c.globalAlpha = 1; c.fillStyle = f > 0.01 ? "#e9a69b" : "#cfc5ad"; c.beginPath();
        house(c, z.x - 6.5 * U, z.y + 3.5 * U, 5.6 * U); house(c, z.x + 6.5 * U, z.y + 3.5 * U, 5.6 * U); c.fill();
        c.fillStyle = f > 0.01 ? "#f6c9c1" : C.cream; c.beginPath(); house(c, z.x, z.y + 1.5 * U, 8 * U); c.fill();
      }
      c.globalAlpha = 1;
    }
    function drawConvoy(c, t, U, a, sc) {
      var ang = Math.atan2(t.dy, t.dx), ca = t.dx, sa = t.dy, j;
      c.globalAlpha = 0.3 * a; c.fillStyle = "#000"; c.beginPath(); c.arc(t.x, t.y, 19 * U * sc, 0, TAU); c.fill();
      if (t.state === 0) {
        var ex = t.ax + t.dx * t.len, ey = t.ay + t.dy * t.len, hx = t.ax + t.dx * (t.d + 8 * U), hy = t.ay + t.dy * (t.d + 8 * U);
        DASH2[0] = 4 * U; DASH2[1] = 4 * U;
        c.globalAlpha = 0.55 * a; c.strokeStyle = C.bad; c.lineWidth = 1.5 * U;
        c.setLineDash(DASH2); c.lineDashOffset = -T * 20 * U;
        c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.stroke(); c.setLineDash(NODASH);
        c.fillStyle = C.bad; c.beginPath(); c.moveTo(ex + ca * 6 * U, ey + sa * 6 * U);
        c.lineTo(ex - ca * 4 * U - sa * 5 * U, ey - sa * 4 * U + ca * 5 * U); c.lineTo(ex - ca * 4 * U + sa * 5 * U, ey - sa * 4 * U - ca * 5 * U);
        c.closePath(); c.fill();
      }
      for (j = 2; j >= 0; j--) {
        var dd = Math.max(0, t.d - j * t.sp), x = t.ax + t.dx * dd, y = t.ay + t.dy * dd, k = U * sc;
        c.save(); c.translate(x, y); c.rotate(ang);
        c.globalAlpha = 0.4 * a; c.fillStyle = "#000"; c.fillRect(-5.5 * k, -1.5 * k, 13 * k, 6 * k);
        c.globalAlpha = a; c.fillStyle = "#4b4636"; c.fillRect(-6.5 * k, -3 * k, 9 * k, 6 * k);
        c.fillStyle = "#2b2824"; c.fillRect(2.5 * k, -2.6 * k, 4 * k, 5.2 * k);
        c.fillStyle = "#a8b2ae"; c.fillRect(5.3 * k, -2 * k, 1 * k, 4 * k);
        c.fillStyle = C.bad; c.fillRect(-4.5 * k, -1 * k, 3 * k, 2 * k);
        c.restore();
      }
    }
    function drawTargets(c, U) {
      for (var j = 0; j < TG.length; j++) {
        var t = TG[j];
        if (!t.on || t.state === 1) continue;
        var a = 1, sc = 1, q, k;
        if (t.state === 0) sc = t.age < 0.35 ? Math.max(0.01, easeBack(t.age / 0.35)) : 1;
        else { q = t.st / 0.4; a = 1 - q; sc = 1 - 0.35 * q; }
        var r = (t.type === 0 ? 13 : 19) * U, rr = r * sc;
        if (t.type === 1) drawConvoy(c, t, U, a, sc);
        else if (t.type === 0) {
          c.globalAlpha = 0.45 * a; c.fillStyle = "#000"; c.beginPath(); c.arc(t.x + 1.5 * U, t.y + 2.5 * U, rr * 1.08, 0, TAU); c.fill();
          c.globalAlpha = 0.9 * a; c.fillStyle = C.bg; c.beginPath(); c.arc(t.x, t.y, rr, 0, TAU); c.fill();
          c.globalAlpha = a; c.lineWidth = 2 * U; c.strokeStyle = C.bad; c.stroke();
          c.fillStyle = C.bad; c.beginPath(); c.arc(t.x, t.y - rr * 0.2, rr * 0.24, 0, TAU); c.fill();
          c.beginPath(); c.moveTo(t.x - rr * 0.5, t.y + rr * 0.52); c.quadraticCurveTo(t.x - rr * 0.48, t.y + rr * 0.08, t.x, t.y + rr * 0.08);
          c.quadraticCurveTo(t.x + rr * 0.48, t.y + rr * 0.08, t.x + rr * 0.5, t.y + rr * 0.52); c.closePath(); c.fill();
        } else {
          var hs = rr * 0.78;
          DASH2[0] = 5 * U; DASH2[1] = 4 * U; c.setLineDash(DASH2); c.lineDashOffset = T * 14 * U;
          c.globalAlpha = 0.85 * a; c.strokeStyle = C.bad; c.lineWidth = 1.6 * U;
          c.beginPath(); c.arc(t.x, t.y, rr * 1.5, 0, TAU); c.stroke(); c.setLineDash(NODASH);
          c.globalAlpha = 0.45 * a; c.fillStyle = "#000"; rrect(c, t.x - hs + 1.5 * U, t.y - hs + 2.5 * U, hs * 2, hs * 2, 3 * U); c.fill();
          c.globalAlpha = 0.92 * a; c.fillStyle = C.bg; rrect(c, t.x - hs, t.y - hs, hs * 2, hs * 2, 3 * U); c.fill();
          c.globalAlpha = a; c.strokeStyle = C.bad; c.lineWidth = 2.2 * U; c.stroke();
          c.fillStyle = C.bad; c.beginPath(); c.arc(t.x, t.y + hs * 0.45, hs * 0.62, Math.PI, 0); c.closePath(); c.fill();
          c.fillStyle = C.bg; c.fillRect(t.x - hs * 0.36, t.y + hs * 0.05, hs * 0.72, hs * 0.14);
          if (t.hp < 2) {
            c.strokeStyle = C.cream; c.lineWidth = 1.2 * U; c.beginPath();
            c.moveTo(t.x - hs * 0.6, t.y - hs * 0.7); c.lineTo(t.x - hs * 0.15, t.y - hs * 0.25); c.lineTo(t.x - hs * 0.3, t.y + hs * 0.1);
            c.moveTo(t.x + hs * 0.7, t.y - hs * 0.5); c.lineTo(t.x + hs * 0.25, t.y - hs * 0.15); c.stroke();
          }
          for (k = 0; k < 2; k++) {
            c.fillStyle = k < t.hp ? C.bad : "rgba(242,230,199,0.3)";
            c.fillRect(t.x - 9 * U + k * 10 * U, t.y + rr * 1.5 + 5 * U, 8 * U, 3 * U);
          }
          if (t.hurt > 0) { c.globalAlpha = t.hurt * a; c.fillStyle = "#fff"; rrect(c, t.x - hs, t.y - hs, hs * 2, hs * 2, 3 * U); c.fill(); }
        }
        /* radar ping ve nabız halkası */
        c.strokeStyle = C.bad;
        if (t.state === 0 && t.age < 0.9) {
          for (k = 0; k < 2; k++) {
            q = (t.age - k * 0.2) / 0.65;
            if (q <= 0 || q >= 1) continue;
            c.globalAlpha = (1 - q) * 0.9; c.lineWidth = (2 * (1 - q) + 0.5) * U;
            c.beginPath(); c.arc(t.x, t.y, r * (1 + q * 3), 0, TAU); c.stroke();
          }
        }
        var ph = (T * 0.95 + t.seed) % 1;
        c.globalAlpha = (1 - ph) * 0.6 * a; c.lineWidth = 1.6 * U;
        c.beginPath(); c.arc(t.x, t.y, rr * (1.05 + ph * 0.9), 0, TAU); c.stroke();
        if (t.type === 1) {
          var prot = t.state === 0 && !zoneClear(t.x, t.y, blastPx() / cam.s * 0.7);
          c.globalAlpha = 0.85 * a; c.lineWidth = 1.8 * U; c.strokeStyle = prot ? C.cream : C.bad;
          if (prot) { DASH2[0] = 3 * U; DASH2[1] = 3 * U; c.setLineDash(DASH2); }
          c.beginPath(); c.arc(t.x, t.y, rr, 0, TAU); c.stroke(); c.setLineDash(NODASH);
        }
        /* kalan süre yayı */
        if (t.state === 0) {
          var left = t.life - t.age, rem = Math.max(0, 1 - t.age / t.life), warn = left < 1.6;
          c.globalAlpha = warn ? (Math.sin(T * 22) > 0 ? 1 : 0.35) : 0.85;
          c.strokeStyle = warn ? C.bad : C.cream; c.lineWidth = 2.2 * U;
          c.beginPath(); c.arc(t.x, t.y, rr + 4.5 * U, -Math.PI / 2, -Math.PI / 2 + TAU * rem); c.stroke();
        }
      }
      c.globalAlpha = 1;
    }
    function drawJetShadows(c, U) {
      if (!JET) return;
      for (var j = 0; j < ST.length; j++) {
        var st = ST[j];
        if (!st.on || !st.jOn) continue;
        c.save(); c.translate(st.jx + 26 * U, st.jy + 38 * U); c.rotate(st.ja); c.scale(34 * U, 34 * U);
        c.globalAlpha = 0.22; c.fillStyle = "#000"; c.fill(JET); c.restore();
      }
      c.globalAlpha = 1;
    }
    function drawParts(c, add) {
      for (var j = 0; j < NP; j++) {
        var p = P[j];
        if (!p.on || p.t < 0 || (p.k >= 5) !== add) continue;
        var f = p.t / p.life, s, a, spr;
        switch (p.k) {
          case K_SMOKE: s = p.s0 + (p.s1 - p.s0) * easeOut(f); a = p.a * (f < 0.12 ? f / 0.12 : 1 - (f - 0.12) / 0.88); spr = SPR.smoke; break;
          case K_PUFF: s = p.s0 + (p.s1 - p.s0) * easeOut(f); a = p.a * (1 - f); spr = SPR.puff; break;
          case K_DUST: s = p.s0 + (p.s1 - p.s0) * easeOut(f); a = p.a * (1 - f) * (1 - f); spr = SPR.dust; break;
          case K_DEBRIS:
            c.globalAlpha = f > 0.75 ? (1 - f) * 4 : 1; c.fillStyle = "#1c1916";
            var w = p.s0 * (0.4 + Math.abs(Math.cos(p.rot))), h = p.s0 * (0.4 + Math.abs(Math.sin(p.rot)));
            c.fillRect(p.x - w / 2, p.y - p.z - h / 2, w, h);
            continue;
          case K_BALLR: s = p.s0 + (p.s1 - p.s0) * easeOut(f); a = p.a * (1 - f); spr = SPR.fireR; break;
          case K_FIRE: s = p.s0 + (p.s1 - p.s0) * f; a = p.a * (1 - f); spr = SPR.fire; break;
          case K_SPARK: s = p.s0 + (p.s1 - p.s0) * f; a = 1 - f; spr = SPR.spark; break;
          case K_EMBER: s = p.s0; a = (1 - f) * (0.55 + 0.45 * Math.sin(p.t * 30 + j)); spr = SPR.spark; break;
          case K_FLASH: s = p.s0 + (p.s1 - p.s0) * f; a = p.a * (1 - f) * (1 - f); spr = SPR.glow; break;
          default: s = p.s0 + (p.s1 - p.s0) * easeOut(f); a = p.a * (1 - f * f); spr = SPR.fire;
        }
        if (a <= 0.004) continue;
        c.globalAlpha = a > 1 ? 1 : a;
        c.drawImage(spr, p.x - s / 2, p.y - p.z - s / 2, s, s);
      }
      c.globalAlpha = 1;
    }
    function drawFires(c, U) {
      for (var j = 0; j < EM.length; j++) {
        var e = EM[j];
        if (!e.on || !e.fire) continue;
        var f = 1 - e.t / e.life;
        if (f < 0.25) continue;
        var fl = 0.75 + 0.25 * Math.sin(T * 17 + j * 3) * Math.sin(T * 7.3 + j), s = (26 + 10 * fl) * U * e.p * f;
        c.globalAlpha = 0.55 * fl * f;
        c.drawImage(SPR.glow, e.x - s / 2, e.y - s / 2, s, s);
      }
      c.globalAlpha = 1;
    }
    function drawShocks(c, U) {
      var j, o;
      for (j = 0; j < SH.length; j++) {
        o = SH[j];
        if (!o.on) continue;
        var f = o.t / o.life, e = 1 - (1 - f) * (1 - f) * (1 - f);
        c.globalAlpha = o.a * (1 - f); c.strokeStyle = o.c; c.lineWidth = (o.w * (1 - f) + 0.6) * U;
        c.beginPath(); c.arc(o.x, o.y, Math.max(0.01, o.r * e), 0, TAU); c.stroke();
      }
      /* imha işareti */
      c.strokeStyle = C.cream;
      for (j = 0; j < TG.length; j++) {
        o = TG[j];
        if (!o.on || o.state !== 1) continue;
        var q = o.st / 0.5, rr = (o.type === 2 ? 20 : 14) * U * (1 + q * 0.8);
        c.globalAlpha = 1 - q; c.lineWidth = (2.4 * (1 - q) + 0.5) * U;
        c.beginPath(); c.moveTo(o.x - rr, o.y - rr); c.lineTo(o.x + rr, o.y + rr); c.moveTo(o.x + rr, o.y - rr); c.lineTo(o.x - rr, o.y + rr); c.stroke();
      }
      c.globalAlpha = 1;
    }
    function drawContrail(c, st, U) {
      var h = st.jh, n = st.jn, newest = (st.jw - 1 + JN) % JN, span = 13 * U, b, j;
      c.strokeStyle = "#f4efe4";
      for (b = 0; b < 4; b++) {
        var a0 = b * TRAIL / 4, a1 = a0 + TRAIL / 4, mid = (b + 0.5) / 4, any = false;
        c.globalAlpha = 0.55 * (1 - mid); c.lineWidth = (1.4 + mid * 5) * U;
        c.beginPath();
        for (j = 0; j < n - 1; j++) {
          var i0 = (newest - j + JN) % JN, i1 = (i0 - 1 + JN) % JN, o0 = i0 * 5, o1 = i1 * 5, age = T - h[o0 + 2];
          if (age < a0) continue;
          if (age >= a1) break;
          c.moveTo(h[o0] - h[o0 + 3] * span, h[o0 + 1] + h[o0 + 4] * span); c.lineTo(h[o1] - h[o1 + 3] * span, h[o1 + 1] + h[o1 + 4] * span);
          c.moveTo(h[o0] + h[o0 + 3] * span, h[o0 + 1] - h[o0 + 4] * span); c.lineTo(h[o1] + h[o1 + 3] * span, h[o1 + 1] - h[o1 + 4] * span);
          any = true;
        }
        if (any) c.stroke();
      }
    }
    function drawMTrail(c, st, U) {
      var h = st.mh, n = st.mn, newest = (st.mw - 1 + MN) % MN, b, j;
      for (b = 0; b < 3; b++) {
        var a0 = b * MTRAIL / 3, a1 = a0 + MTRAIL / 3, mid = (b + 0.5) / 3, any = false;
        c.globalAlpha = 0.85 * (1 - mid); c.strokeStyle = b === 0 ? "#fff7e6" : "#d8d2c6"; c.lineWidth = (2.2 + mid * 3) * U;
        c.beginPath();
        for (j = 0; j < n - 1; j++) {
          var i0 = (newest - j + MN) % MN, i1 = (i0 - 1 + MN) % MN, o0 = i0 * 3, o1 = i1 * 3, age = T - h[o0 + 2];
          if (age < a0) continue;
          if (age >= a1) break;
          c.moveTo(h[o0], h[o0 + 1]); c.lineTo(h[o1], h[o1 + 1]);
          any = true;
        }
        if (any) c.stroke();
      }
    }
    function drawStrikes(c, U) {
      c.lineCap = "round";
      for (var j = 0; j < ST.length; j++) {
        var st = ST[j];
        if (!st.on) continue;
        if (st.jn > 1) drawContrail(c, st, U);
        if (st.mn > 1) drawMTrail(c, st, U);
        if (st.mOn) {
          var tx = st.mx - st.mdx * 7 * U, ty = st.my - st.mdy * 7 * U, gs = 18 * U;
          c.globalAlpha = 1; c.strokeStyle = "#fffaf0"; c.lineWidth = 2.4 * U;
          c.beginPath(); c.moveTo(tx, ty); c.lineTo(st.mx, st.my); c.stroke();
          c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.9;
          c.drawImage(SPR.glow, tx - gs / 2, ty - gs / 2, gs, gs);
          c.globalCompositeOperation = "source-over";
        }
        if (st.jOn && JET) {
          c.save(); c.translate(st.jx, st.jy); c.rotate(st.ja); c.scale(36 * U, 36 * U);
          c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.7 + 0.3 * Math.sin(T * 60 + j);
          c.drawImage(SPR.glow, -0.8, -0.18, 0.38, 0.36);
          c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
          c.fillStyle = "#2e2c29"; c.fill(JET);
          c.lineWidth = 0.035; c.strokeStyle = "rgba(242,230,199,0.6)"; c.stroke(JET);
          c.fillStyle = "#8fb3c9"; c.beginPath(); c.moveTo(0.34, 0); c.lineTo(0.16, -0.035); c.lineTo(0.1, 0); c.lineTo(0.16, 0.035); c.closePath(); c.fill();
          c.restore();
        }
      }
      c.lineCap = "butt"; c.globalAlpha = 1;
    }

    /* ---------- çizim: ekran katmanı ---------- */
    function drawLocks(c) {
      for (var j = 0; j < ST.length; j++) {
        var st = ST[j];
        if (!st.on || st.flyby || st.hit) continue;
        w2s(st.tx, st.ty);
        var x = SX, y = SY, k = Math.min(1, st.t / 0.22), e = easeOut(k), h = (30 - 17 * e) * u, l = 7 * u, rot = (1 - e) * 1.2;
        var cs = Math.cos(rot), sn = Math.sin(rot);
        c.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * x, dpr * y);
        c.globalAlpha = k < 1 ? 0.5 + 0.5 * k : 0.75 + 0.25 * Math.sin(T * 30);
        c.strokeStyle = C.accent; c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(-h, -h + l); c.lineTo(-h, -h); c.lineTo(-h + l, -h);
        c.moveTo(h - l, -h); c.lineTo(h, -h); c.lineTo(h, -h + l);
        c.moveTo(h, h - l); c.lineTo(h, h); c.lineTo(h - l, h);
        c.moveTo(-h + l, h); c.lineTo(-h, h); c.lineTo(-h, h - l);
        c.stroke();
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (k >= 1) {
          c.globalAlpha = 0.6; c.lineWidth = 1.3; c.setLineDash(DASH3); c.lineDashOffset = T * 30;
          c.beginPath(); c.arc(x, y, blastPx(), 0, TAU); c.stroke(); c.setLineDash(NODASH);
          c.fillStyle = C.accent; c.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
      }
      c.globalAlpha = 1;
    }
    function drawTexts(c) {
      c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
      for (var j = 0; j < TX.length; j++) {
        var o = TX[j];
        if (!o.on) continue;
        var f = o.t / o.life;
        w2s(o.x, o.y);
        var rise = (o.f === 1 ? 34 : 26) * u * easeOut(f);
        var sc = o.t < 0.1 ? 0.5 + o.t / 0.1 * 0.75 : o.t < 0.2 ? 1.25 - (o.t - 0.1) / 0.1 * 0.25 : 1;
        var jx = o.f === 1 && f < 0.3 ? Math.sin(o.t * 70) * 3 * u * (1 - f / 0.3) : 0;
        c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * (SX + jx), dpr * (SY - rise));
        c.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1;
        c.font = o.f === 2 ? F.info : o.f === 1 ? F.warn : F.num;
        setLS(c, o.f === 2 ? "0.1em" : "0.02em");
        c.lineWidth = 4; c.strokeStyle = "rgba(20,18,16,0.85)"; c.strokeText(o.s, 0, 0);
        c.fillStyle = o.c; c.fillText(o.s, 0, 0);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1; setLS(c, "0px");
    }
    function drawScreenFx(c) {
      if (flash > 0.01) { c.globalAlpha = flash * 0.35; c.fillStyle = "#fff4dc"; c.fillRect(0, 0, W, H); }
      var crit = state === 2 && legit <= 40 ? 0.18 + 0.12 * Math.sin(T * 5) : 0, rd = Math.max(dmg, crit);
      if (rd > 0.01) { c.globalAlpha = Math.min(1, rd); c.fillStyle = vigRed; c.fillRect(0, 0, W, H); }
      c.globalAlpha = 1; c.fillStyle = vig; c.fillRect(0, 0, W, H);
      c.globalAlpha = 0.045; c.fillStyle = C.cream; c.fillRect(0, (T * 70) % (H + 60) - 30, W, 2);
      if (grainPat) {
        if ((frameN & 1) === 0) { gox = (Math.random() * 128) | 0; goy = (Math.random() * 128) | 0; }
        c.setTransform(1, 0, 0, 1, gox, goy); c.globalAlpha = 0.1; c.fillStyle = grainPat;
        c.fillRect(-gox, -goy, cv.width, cv.height);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      var m = 10, l = 16 * u, top = (state === 2 || state === 3 ? hudH : 0) + m;
      c.globalAlpha = 0.55; c.strokeStyle = C.accent; c.lineWidth = 1.5; c.beginPath();
      c.moveTo(m, top + l); c.lineTo(m, top); c.lineTo(m + l, top);
      c.moveTo(W - m - l, top); c.lineTo(W - m, top); c.lineTo(W - m, top + l);
      c.moveTo(W - m, H - m - l); c.lineTo(W - m, H - m); c.lineTo(W - m - l, H - m);
      c.moveTo(m + l, H - m); c.lineTo(m, H - m); c.lineTo(m, H - m - l);
      c.stroke();
      var bx = W - m - 6, by = H - m - 7;
      c.font = F.capsS; setLS(c, "0.14em"); c.textAlign = "right"; c.textBaseline = "alphabetic";
      c.globalAlpha = 0.75; c.fillStyle = C.text; c.fillText(L.feed, bx, by);
      c.globalAlpha = 0.95; c.fillStyle = C.bad; c.fillText(LIVE_S, bx - feedW, by);
      if (Math.sin(T * 4) > -0.3) { c.beginPath(); c.arc(bx - feedW - liveW - 7 * u, by - 4 * u, 3.5 * u, 0, TAU); c.fill(); }
      setLS(c, "0px"); c.globalAlpha = 1;
    }
    function pip(c, x, y, w, h) {
      c.beginPath();
      if (w < h * 0.6) { c.rect(x, y, w, h); return; }
      c.moveTo(x, y); c.lineTo(x + w - h * 0.5, y); c.lineTo(x + w, y + h / 2); c.lineTo(x + w - h * 0.5, y + h); c.lineTo(x, y + h); c.closePath();
    }
    function drawAmmo(c) {
      var sh = ammoShake > 0 ? Math.sin(ammoShake * 60) * 6 * (ammoShake / 0.4) : 0;
      var pw = 24 * u, ph = 8 * u, gap = 5 * u, w = 3 * pw + 2 * gap + 20 * u, h = 36 * u, x0 = 14 + sh, y0 = H - 14 - h, j;
      c.globalAlpha = 0.84; c.fillStyle = C.bg; rrect(c, x0, y0, w, h, 4); c.fill();
      c.globalAlpha = 1; c.strokeStyle = ammo < 1 ? "rgba(219,71,56,0.6)" : "rgba(242,230,199,0.16)"; c.lineWidth = 1; c.stroke();
      c.fillStyle = C.accent; c.fillRect(x0, y0 + 6, 2, h - 12);
      c.font = F.capsS; setLS(c, "0.12em"); c.textAlign = "left"; c.textBaseline = "top";
      if (ammo < 1) { c.fillStyle = C.bad; c.globalAlpha = 0.6 + 0.4 * Math.sin(T * 14); } else c.fillStyle = C.muted;
      c.fillText(ammo < 1 ? L.reload : L.ammo, x0 + 10 * u, y0 + 7 * u);
      c.globalAlpha = 1; setLS(c, "0px");
      for (j = 0; j < 3; j++) {
        var px = x0 + 10 * u + j * (pw + gap), py = y0 + h - ph - 7 * u, fl = clamp(ammo - j, 0, 1);
        c.fillStyle = "rgba(242,230,199,0.13)"; pip(c, px, py, pw, ph); c.fill();
        if (fl > 0) { c.fillStyle = fl >= 1 ? C.accent : "rgba(241,173,42,0.55)"; pip(c, px, py, pw * fl, ph); c.fill(); }
      }
    }
    function drawCombo(c) {
      if (combo < 2 || state !== 2) return;
      var left = COMBO_WIN - (gt - lastHit);
      if (left <= 0) return;
      var m = Math.min(combo, 8);
      if (m !== comboShown) { comboShown = m; comboStr = "×" + m; }
      var k = Math.min(1, punch / 0.3), sc = 1 + 0.8 * (1 - k) * (1 - k) * (1 - k) * Math.cos(k * 7);
      var cx = W - 58 * u, cy = hudH + 40 * u;
      c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * cx, dpr * cy);
      c.globalAlpha = left < 0.4 ? left / 0.4 : 1;
      c.globalCompositeOperation = "lighter"; var gs = 90 * u; c.globalAlpha *= 0.35 + 0.4 * (1 - k);
      c.drawImage(SPR.glow, -gs / 2, -gs / 2, gs, gs);
      c.globalCompositeOperation = "source-over"; c.globalAlpha = left < 0.4 ? left / 0.4 : 1;
      c.font = F.big; setLS(c, "0.02em"); c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
      c.lineWidth = 5; c.strokeStyle = "rgba(20,18,16,0.85)"; c.strokeText(comboStr, 0, 0);
      c.fillStyle = C.accent; c.fillText(comboStr, 0, 0);
      c.font = F.capsS; setLS(c, "0.2em"); c.fillStyle = C.text; c.fillText(L.combo, 0, 30 * u);
      c.fillStyle = "rgba(242,230,199,0.2)"; c.fillRect(-34 * u, 40 * u, 68 * u, 3 * u);
      c.fillStyle = C.accent; c.fillRect(-34 * u, 40 * u, 68 * u * (left / COMBO_WIN), 3 * u);
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1; setLS(c, "0px");
    }
    function drawBanner(c) {
      if (!BAN.on) return;
      var f = BAN.t / BAN.life, a = f < 0.1 ? f / 0.1 : f > 0.78 ? Math.max(0, (1 - f) / 0.22) : 1;
      var y = H * 0.36, bh = (BAN.sub ? 74 : 58) * u * (f < 0.1 ? easeOut(f / 0.1) : 1), dx = (1 - easeOut(Math.min(1, f / 0.15))) * 40 * u;
      c.globalAlpha = 0.62 * a; c.fillStyle = C.bg; c.fillRect(0, y - bh / 2, W, bh);
      c.globalAlpha = a; c.fillStyle = BAN.c; c.fillRect(0, y - bh / 2, W, 2); c.fillRect(0, y + bh / 2 - 2, W, 2);
      c.setTransform(dpr * BAN.k, 0, 0, dpr * BAN.k, dpr * W / 2, dpr * y);
      c.textAlign = "center"; c.textBaseline = "middle";
      c.font = F.ban; setLS(c, "0.04em"); c.fillText(BAN.s, dx, BAN.sub ? -10 * u : 0);
      if (BAN.sub) { c.font = F.capsM; setLS(c, "0.16em"); c.fillStyle = C.text; c.globalAlpha = a * 0.85; c.fillText(BAN.sub, -dx, 20 * u); }
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1; setLS(c, "0px");
    }
    function drawReticle(c) {
      if (!hover.on || state !== 2) return;
      var x = hover.x, y = hover.y, r = blastPx(), col = hoverBad ? C.bad : C.accent;
      c.globalAlpha = ammo < 1 ? 0.4 : 0.9; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.5;
      c.setLineDash(DASH3); c.lineDashOffset = -T * 20;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.setLineDash(NODASH);
      c.beginPath();
      c.moveTo(x - r - 8, y); c.lineTo(x - 6, y); c.moveTo(x + 6, y); c.lineTo(x + r + 8, y);
      c.moveTo(x, y - r - 8); c.lineTo(x, y - 6); c.moveTo(x, y + 6); c.lineTo(x, y + r + 8);
      c.stroke();
      c.fillRect(x - 1.5, y - 1.5, 3, 3);
      if (hoverBad) {
        c.font = F.capsS; setLS(c, "0.12em"); c.textAlign = "center"; c.textBaseline = "bottom";
        c.fillText(L.civZone, x, y - r - 10); setLS(c, "0px");
      }
      c.globalAlpha = 1;
    }
    function render() {
      var c = g;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
      c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
      if (!ready || !layer.width) return;
      var s = cam.s, U = u / s;
      c.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 + shx - cam.x * s), dpr * (H / 2 + shy - cam.y * s));
      c.drawImage(layer, 0, 0, layer.width, layer.height, 0, 0, MAP_W, MAP_H);
      drawZones(c, U);
      drawTargets(c, U);
      drawJetShadows(c, U);
      drawParts(c, false);
      c.globalCompositeOperation = "lighter";
      drawFires(c, U);
      drawParts(c, true);
      c.globalCompositeOperation = "source-over";
      drawShocks(c, U);
      drawStrikes(c, U);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawLocks(c);
      drawTexts(c);
      drawScreenFx(c);
      if (state === 2 || state === 3) { drawAmmo(c); drawCombo(c); }
      drawBanner(c);
      drawReticle(c);
    }

    /* ---------- döngü ---------- */
    function frame(now) {
      raf = 0;
      if (dead || paused) return;
      var rdt = (now - last) / 1000;
      last = now;
      if (!(rdt > 0)) rdt = 0;
      if (rdt > 0.05) rdt = 0.05;
      var dt = rdt;
      if (slowT > 0) { slowT -= rdt; dt = rdt * 0.3; }
      frameN++;
      update(dt, rdt);
      if (dead) return;
      render();
      if (!dead && !paused) raf = win.requestAnimationFrame(frame);
    }
    function startLoop() {
      if (raf || paused || dead || !ready) return;
      last = win.performance && win.performance.now ? win.performance.now() : Date.now();
      raf = win.requestAnimationFrame(frame);
    }

    /* ---------- giriş ---------- */
    function localXY(e) {
      var r = cv.getBoundingClientRect();
      LX = (e.clientX - r.left) * (r.width ? W / r.width : 1);
      LY = (e.clientY - r.top) * (r.height ? H / r.height : 1);
    }
    function onDown(e) {
      if (state !== 2) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.cancelable) e.preventDefault();
      localXY(e);
      if (e.pointerType === "mouse") { hover.on = true; hover.x = LX; hover.y = LY; }
      fire(LX, LY);
    }
    function onMove(e) {
      if (e.pointerType !== "mouse") return;
      localXY(e);
      hover.on = state === 2; hover.x = LX; hover.y = LY;
    }
    function onLeave() { hover.on = false; }
    function onMenu(e) { if (state === 2 && e.cancelable) e.preventDefault(); }
    function onOvClick(e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
      if (b && b.getAttribute("data-act") === "start") startGame();
    }
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("pointercancel", onLeave);
    cv.addEventListener("contextmenu", onMenu);
    ov.addEventListener("click", onOvClick);
    var ro = null;
    if (win.ResizeObserver) { ro = new win.ResizeObserver(onResize); ro.observe(el); }
    else win.addEventListener("resize", onResize);

    /* ---------- yükleme ---------- */
    function loadImg(src) {
      return new Promise(function (res) {
        var im = new Image();
        im.decoding = "async";
        im.onload = function () { res(im); };
        im.onerror = function () { res(null); };
        im.src = src;
      });
    }
    function loadJSON(src) {
      if (!win.fetch) return Promise.resolve(null);
      return win.fetch(src).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }
    function loadFonts() {
      var f = doc.fonts;
      if (!f || !f.load) return Promise.resolve();
      var all = Promise.all([f.load("20px Anton"), f.load("700 14px 'Barlow Condensed'"), f.load("800 14px 'Barlow Condensed'"),
        f.load("500 14px Barlow"), f.load("20px Caveat")]).then(function () {
        if (ready && !dead) { bakeAt = T; onResize(); } /* yazı tipi geç geldiyse adları yeniden çiz */
      }, function () {});
      return Promise.race([all, new Promise(function (res) { loadTimer = setTimeout(res, 2500); })]);
    }
    onResize();
    var wantFull = cam.s * dpr > 0.62;
    Promise.all([loadImg(A + "img/map/tarsel_gun" + (wantFull ? "" : "_k") + ".webp"), loadJSON(A + "data/map_tarsel.json"), loadFonts()])
      .then(function (res) {
        if (dead) return;
        clearTimeout(loadTimer);
        img = res[0]; imgFull = wantFull && !!img;
        setupData(res[1]);
        ready = true;
        onResize();
        bake();
        showIntro();
        startLoop();
      });

    return {
      pause: function () {
        paused = true;
        if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
      },
      resume: function () {
        if (dead) return;
        paused = false;
        startLoop();
      },
      destroy: function () {
        if (dead) return;
        dead = true;
        if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
        clearTimeout(loadTimer);
        if (ro) ro.disconnect(); else win.removeEventListener("resize", onResize);
        cv.removeEventListener("pointerdown", onDown);
        cv.removeEventListener("pointermove", onMove);
        cv.removeEventListener("pointerleave", onLeave);
        cv.removeEventListener("pointercancel", onLeave);
        cv.removeEventListener("contextmenu", onMenu);
        ov.removeEventListener("click", onOvClick);
        if (root.parentNode) root.parentNode.removeChild(root);
        if (style.parentNode) style.parentNode.removeChild(style);
        layer.width = layer.height = 0; cv.width = cv.height = 0;
      }
    };
  }

  window.RBGames.hava = {
    title: { tr: "Hava Harekâtı", en: "Air Strike" },
    mount: function (el, ctx) { return create(el, ctx || {}); }
  };
})();
