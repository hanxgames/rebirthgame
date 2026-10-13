/* ReBirth — mini oyun «Gölge Avı / Shadow Hunt»: oyunun gerçek ilçe komşuluk grafikleri üzerinde mayın tarlası
 * mantığıyla istihbarat bulmacası. MUHBİR soruşturur (rakam = komşu bölgelerdeki gizli hedef), BASKIN etkisiz kılar.
 * Yerleşimler küçük bir çözücüyle seçilir: kusursuz oyuncunun beklenen pusu riski düşük kalsın (seviyeyle artar).
 * Sözleşme: js/games/CONTRACT.md · düz ES2019, harici kütüphane yok. */
(function () {
  "use strict";

  var MAPS = ["tarsel", "kesra", "varzan"];
  var LEVELS = [
    { map: "tarsel", cells: 3, mult: 1, risk: 0.3 },
    { map: "kesra", cells: 4, mult: 1.5, risk: 0.4 },
    { map: "varzan", cells: 5, mult: 2, risk: 0.5 }
  ];
  var HQ_CAND = [9, 10, 11, 12, 13];
  var PTS_CELL = 100, PTS_HQ = 250, PTS_TRUST = 150, MAX_TRUST = 3, LONG_MS = 480;
  var CAPS = "'Barlow Condensed','Arial Narrow',sans-serif", DISP = "Anton,Impact,sans-serif";
  var TAU = Math.PI * 2, NODASH = [];
  var HOV_A = ["rgba(241,173,42,.13)", "rgba(241,173,42,.24)", "rgba(255,204,96,.96)"];
  var HOV_R = ["rgba(219,71,56,.15)", "rgba(219,71,56,.28)", "rgba(255,112,92,.96)"];
  var TINT_OK = "rgba(102,184,107,.17)", TINT_HARM = "rgba(219,71,56,.15)", TINT_EXP = "rgba(219,71,56,.34)", TINT_NEU = "rgba(150,40,30,.22)";
  var INK = { sp: 280, col: ["#c4362a", "#a82a20", "#db4738"], sz: [1.2, 3.6], life: [0.35, 0.8], kind: 0, drag: 7, grav: 0, r: 12 };
  var DUST = { sp: 46, col: ["#ece4d0", "#cfe6b8", "#f1ad2a"], sz: [1, 2.4], life: [0.7, 1.5], kind: 2, drag: 1.5, grav: -24, r: 26 };
  var SPARK = { sp: 330, col: ["#ffb347", "#db4738", "#fff1d0"], sz: [1.2, 2.8], life: [0.3, 0.7], kind: 2, drag: 4, grav: 170, r: 6 };
  var SMOKE = { sp: 40, col: ["#2a2725", "#3a3633", "#4a2a24"], sz: [8, 18], life: [0.9, 1.6], kind: 1, drag: 1.2, grav: -18, r: 14 };

  var STR = {
    tr: {
      title: "GÖLGE AVI", kicker: "İSTİHBARAT OPERASYONU · GÖLGE CEPHESİ", report: "OPERASYON RAPORU",
      how: [
        "<b>MUHBİR</b>: bölgeyi soruştur. Rakam = <u>komşu</u> bölgelerdeki gizli hedef sayısı.",
        "<b>BASKIN</b>: hücreyi ya da karargâhı etkisiz kıl. Pusu ve boş baskın güven kaybettirir.",
        "3 vilayet · her birinde 3 güven. Uzun bas ya da sağ tık = baskın."
      ],
      start: "BAŞLA", again: "TEKRAR", next: "DEVAM", best: "EN İYİ", newBest: "YENİ REKOR",
      loading: "DOSYA AÇILIYOR", loadErr: "Dosya yüklenemedi. Bağlantıyı denetleyip sayfayı yenileyin.",
      dossier: "İSTİHBARAT DOSYASI", file: "DOSYA", classified: "GİZLİ", front: "GÖLGE CEPHESİ",
      prov: { tarsel: "Tarsel Vilayeti", kesra: "Kesra Deltası", varzan: "Varzan Yaylası" },
      level: "SEVİYE", trust: "GÜVEN", score: "SKOR", time: "SÜRE", targets: "HEDEFLER",
      inform: "MUHBİR", informSub: "Soruştur", raid: "BASKIN", raidSub: "Etkisiz kıl",
      hintLong: "Uzun bas / sağ tık: baskın · tuşlar 1-2",
      cellsHq: function (k) { return k + " HÜCRE + KARARGÂH"; },
      st: { hidden: "BİLİNMİYOR", clear: "TEMİZ", exposed: "AÇIKTA", neutral: "ETKİSİZ", harm: "SİVİL KAYIP", hqZone: "KARARGÂH ADAYI" },
      cell: "HÜCRE", hq: "KARARGÂH", links: "KOMŞULAR",
      conn: function (n) { return "KOMŞULARDA " + n + " HEDEF"; },
      stamp: { neutral: "ETKİSİZ", ambush: "PUSU", harm: "SİVİL KAYIP", clear: "TEMİZ" },
      note1: "Rakam = komşu bölgelerdeki gizli hedef sayısı.",
      note2: "Karargâh sarp sınır bölgelerinden birinde.",
      pick: "Bir bölgeye dokun.",
      log: {
        start: "{p}: muhbir ağı kuruldu.", intel: "İlk muhbir raporu geldi.", clear: "{d} temiz. Komşularda {n} hedef.",
        ambush: "{d}: PUSU! {t} açığa çıktı.", neutral: "{d}: {t} etkisiz hâle getirildi.",
        harm: "{d}: boş baskın, sivil kayıp.", known: "{d} zaten temiz.", exposed: "{d}: hedef açıkta — BASKIN yap."
      },
      role: { capital: "BAŞKENT", port: "LİMAN", bridge: "KÖPRÜ", lake: "GÖL", border: "SINIR", spa: "KAPLICA", strait: "BOĞAZ", hq: "DAĞ", plateau: "PLATO", forest: "ORMAN" },
      terr: { vadi: "VADİ", "kıyı": "KIYI", nehir: "NEHİR", ova: "OVA", "bozkır": "BOZKIR", "göl": "GÖL", tepe: "TEPE", "boğaz": "BOĞAZ", "dağ": "DAĞ", plato: "PLATO", orman: "ORMAN", "sınır": "SINIR" },
      brief: {
        tarsel: "Depremden sonra dağ köylerinde yabancı yüzler görülüyor.",
        kesra: "Taşkından beri deltada kayıklarla silah taşınıyor.",
        varzan: "Kuraklık yaylayı kızıştırdı. İzleri sarp sırtlarda ara."
      },
      cleared: function (p) { return p + " TEMİZLENDİ"; },
      rows: { targets: "Etkisiz hedefler", trust: "Güven bonusu", time: "Süre bonusu", mult: "Seviye çarpanı", total: "Dosya toplamı" },
      nextFile: "SIRADAKİ DOSYA",
      winT: "GÖLGE CEPHESİ ÇÖKERTİLDİ", winS: "Üç vilayette hücre ağı dağıtıldı, Koordinatör.",
      loseT: "GÜVEN TÜKENDİ", loseS: "Halk muhbirlere sırt çevirdi. Operasyon askıya alındı.",
      flawless: "KUSURSUZ", levels: "VİLAYET", aria: "Gölge Avı oyun haritası"
    },
    en: {
      title: "SHADOW HUNT", kicker: "INTELLIGENCE OPERATION · SHADOW FRONT", report: "OPERATION REPORT",
      how: [
        "<b>INFORMANT</b>: investigate a district. The number = hidden targets in <u>neighboring</u> districts.",
        "<b>RAID</b>: neutralize a cell or the HQ. Ambushes and empty raids cost trust.",
        "3 provinces · 3 trust each. Long-press or right-click = raid."
      ],
      start: "START", again: "AGAIN", next: "CONTINUE", best: "BEST", newBest: "NEW BEST",
      loading: "OPENING FILE", loadErr: "The file could not be loaded. Check your connection and reload the page.",
      dossier: "INTELLIGENCE FILE", file: "FILE", classified: "CLASSIFIED", front: "SHADOW FRONT",
      prov: { tarsel: "Tarsel Province", kesra: "Kesra Delta", varzan: "Varzan Highlands" },
      level: "LEVEL", trust: "TRUST", score: "SCORE", time: "TIME", targets: "TARGETS",
      inform: "INFORMANT", informSub: "Investigate", raid: "RAID", raidSub: "Neutralize",
      hintLong: "Long-press / right-click: raid · keys 1-2",
      cellsHq: function (k) { return k + " CELLS + HQ"; },
      st: { hidden: "UNKNOWN", clear: "CLEAR", exposed: "EXPOSED", neutral: "NEUTRALIZED", harm: "CIVILIAN HARM", hqZone: "HQ CANDIDATE" },
      cell: "CELL", hq: "HQ", links: "NEIGHBORS",
      conn: function (n) { return n + (n === 1 ? " TARGET" : " TARGETS") + " NEARBY"; },
      stamp: { neutral: "NEUTRALIZED", ambush: "AMBUSH", harm: "CIVILIAN HARM", clear: "CLEAR" },
      note1: "Number = hidden targets in neighboring districts.",
      note2: "The HQ hides in one of the rugged frontier districts.",
      pick: "Tap a district.",
      log: {
        start: "{p}: informant network active.", intel: "First informant report is in.", clear: "{d} is clear. {n} target(s) nearby.",
        ambush: "{d}: AMBUSH! {t} exposed.", neutral: "{d}: {t} neutralized.",
        harm: "{d}: empty raid, civilian harm.", known: "{d} is already clear.", exposed: "{d}: target exposed — use RAID."
      },
      role: { capital: "CAPITAL", port: "PORT", bridge: "BRIDGE", lake: "LAKE", border: "BORDER", spa: "SPA", strait: "GORGE", hq: "MOUNTAIN", plateau: "PLATEAU", forest: "FOREST" },
      terr: { vadi: "VALLEY", "kıyı": "COAST", nehir: "RIVER", ova: "PLAIN", "bozkır": "STEPPE", "göl": "LAKE", tepe: "HILLS", "boğaz": "GORGE", "dağ": "MOUNTAIN", plato: "PLATEAU", orman: "FOREST", "sınır": "BORDER" },
      brief: {
        tarsel: "After the quake, strangers were seen in the mountain villages.",
        kesra: "Since the flood, weapons move through the delta by boat.",
        varzan: "Drought has inflamed the highlands. Search the steep ridges."
      },
      cleared: function (p) { return p + " SECURED"; },
      rows: { targets: "Neutralized targets", trust: "Trust bonus", time: "Time bonus", mult: "Level multiplier", total: "File total" },
      nextFile: "NEXT FILE",
      winT: "SHADOW FRONT DISMANTLED", winS: "The cell network is broken in all three provinces, Coordinator.",
      loseT: "TRUST LOST", loseS: "The people turned their backs on the informants. Operation suspended.",
      flawless: "FLAWLESS", levels: "PROVINCES", aria: "Shadow Hunt game map"
    }
  };

  var ICON = {
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.3" fill="currentColor"/></svg>',
    cross: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1.5v6M12 16.5v6M1.5 12h6M16.5 12h6" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 2.2l8 3v6c0 5-3.4 9.2-8 10.8C7.4 20.4 4 16.2 4 11.2v-6z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>',
    clip: '<svg viewBox="0 0 40 100"><path d="M27 22v54a11 11 0 0 1-22 0V16a7.5 7.5 0 0 1 15 0v58a4 4 0 0 1-8 0V26" fill="none" stroke="#7d7a74" stroke-width="3.4" stroke-linecap="round"/><path d="M27 22v54a11 11 0 0 1-22 0V16a7.5 7.5 0 0 1 15 0v58" fill="none" stroke="#cfccc5" stroke-width="1.2" stroke-linecap="round" transform="translate(-.8 -.6)"/></svg>'
  };

  var F_C = "var(--f-caps,'Barlow Condensed','Arial Narrow',sans-serif)", F_D = "var(--f-display,Anton,Impact,sans-serif)";
  var F_B = "var(--f-body,Barlow,system-ui,sans-serif)", F_S = "var(--f-script,Caveat,cursive)";
  var CSS = [
    "._root{position:absolute;inset:0;overflow:hidden;background:#131211;color:#f2ebd9;font-family:$B;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;contain:layout paint}",
    "._root *{box-sizing:border-box}",
    "._cv{position:absolute;left:0;top:0;display:block;z-index:0;outline:none}",
    "._fx{position:absolute;pointer-events:none;z-index:1;background:radial-gradient(ellipse 72% 68% at 50% 50%,rgba(0,0,0,0) 52%,rgba(6,5,4,.62) 100%),repeating-linear-gradient(0deg,rgba(255,255,255,.016) 0 1px,rgba(0,0,0,0) 1px 3px);transition:box-shadow .3s}",
    "._grain{position:absolute;inset:0;background-image:var(--rbg-golge-film);opacity:.08}",
    "._raidm ._fx{box-shadow:inset 0 0 0 2px rgba(219,71,56,.6),inset 0 0 50px rgba(219,71,56,.24)}",
    "._banner{position:absolute;pointer-events:none;z-index:2;display:flex;align-items:flex-start;justify-content:center;overflow:hidden;padding-top:6%}",
    "._bn{width:100%;opacity:0;text-align:center;padding:14px 24px 12px;background:linear-gradient(90deg,rgba(16,15,14,0),rgba(16,15,14,.9) 18%,rgba(16,15,14,.9) 82%,rgba(16,15,14,0));border-top:1px solid rgba(241,173,42,.55);border-bottom:1px solid rgba(241,173,42,.55)}",
    "._go ._bn{animation:rbg-golge-bn 3s cubic-bezier(.2,.7,.1,1) forwards}",
    "@keyframes rbg-golge-bn{0%{opacity:0;transform:scaleY(.15)}9%{opacity:1;transform:none}80%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-12px)}}",
    "._bk{font:800 12px/1 $C;letter-spacing:.24em;color:#f1ad2a}",
    "._bt{font:400 clamp(22px,3.6vw,44px)/1.05 $D;letter-spacing:.03em;color:#f2ebd9;margin:7px 0 5px}",
    "._bs{font:400 20px/1.1 $S;color:#d8ceb6}",
    "._paper{background-color:#ece4d0;background-image:var(--rbg-golge-paper),radial-gradient(120% 90% at 30% 15%,rgba(255,252,242,.65),rgba(255,252,242,0) 62%),linear-gradient(180deg,rgba(140,110,60,0) 40%,rgba(140,110,60,.16));color:#201d1b}",
    "._panel{position:absolute;top:0;right:0;bottom:0;width:var(--rbg-golge-pw,280px);padding:20px 16px 122px 28px;display:flex;flex-direction:column;gap:11px;box-shadow:-14px 0 32px rgba(0,0,0,.5);overflow:hidden;z-index:3}",
    "._panel:before{content:'';position:absolute;left:8px;top:0;bottom:0;width:10px;background:radial-gradient(circle at 5px 50%,#131211 3.4px,rgba(0,0,0,.22) 4.4px,rgba(0,0,0,0) 5.2px) 0 12px/10px 30px repeat-y}",
    "._clip{position:absolute;top:-14px;right:20px;width:22px;height:56px;transform:rotate(9deg);filter:drop-shadow(1px 2px 1px rgba(0,0,0,.35))}",
    "._clip svg{width:100%;height:100%}",
    "._ht{font:800 12.5px/1.15 $C;letter-spacing:.12em;color:#61594f;padding-right:30px}",
    "._ht b{display:block;color:#201d1b;font-size:23px;letter-spacing:.05em;margin-top:3px}",
    "._meta{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font:600 11px/1.3 $B;letter-spacing:.05em;color:#61594f;margin-top:-3px}",
    "._gizli{font:800 11px/1 $C;letter-spacing:.14em;color:#b8372b;border:2px solid #b8372b;padding:3px 6px 2px;border-radius:3px;transform:rotate(-6deg);opacity:.85}",
    "._rule{border-top:1px dashed rgba(32,29,27,.3)}",
    "._stats{display:grid;grid-template-columns:1fr auto;gap:10px 12px;align-items:end}",
    "._stat label{display:block;font:700 10.5px/1 $C;letter-spacing:.14em;color:#61594f;margin-bottom:5px}",
    "._stat._r{text-align:right}",
    "._stat b{font:400 24px/1 $D;letter-spacing:.02em;color:#201d1b;font-variant-numeric:tabular-nums}",
    "._trust{display:flex;gap:4px}",
    "._trust svg{width:22px;height:22px;fill:#201d1b;stroke:#201d1b;stroke-width:1.5;transition:fill .3s,opacity .3s}",
    "._trust svg._off{fill:none;opacity:.35}",
    "._trust svg._hit{animation:rbg-golge-hit .7s}",
    "@keyframes rbg-golge-hit{0%{transform:scale(1.6) rotate(-14deg);fill:#db4738;stroke:#db4738;opacity:1}100%{transform:none}}",
    "._tg{display:flex;gap:4px;flex-wrap:wrap}",
    "._tb{width:20px;height:20px;border:2px dashed rgba(32,29,27,.45);border-radius:3px;display:flex;align-items:center;justify-content:center;font:800 12px/1 $C;color:rgba(32,29,27,.5)}",
    "._tb svg{width:13px;height:13px;fill:currentColor}",
    "._tb._hq{width:30px}",
    "._tb._e{border:2px solid #db4738;color:#db4738;animation:rbg-golge-blink 1s infinite}",
    "._tb._n{border:2px solid #8e281e;background:#b8372b;color:#fff1e0}",
    "@keyframes rbg-golge-blink{50%{background:rgba(219,71,56,.2)}}",
    "._info{background:rgba(32,29,27,.05);border-left:3px solid #201d1b;padding:8px 10px;min-height:88px}",
    "._in{font:800 21px/1.05 $C;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "._it{font:700 10.5px/1.2 $C;letter-spacing:.14em;color:#61594f;margin-top:3px;min-height:12px}",
    "._is{display:inline-block;margin-top:7px;font:800 11.5px/1 $C;letter-spacing:.1em;padding:4px 7px 3px;border-radius:3px;background:rgba(32,29,27,.12);color:#201d1b;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}",
    "._is._ok{background:#4f8f55;color:#f4f0e2}._is._bad{background:#b8372b;color:#fff1e0}._is._n{background:#201d1b;color:#f1ad2a}",
    "._il{margin-top:7px;font:500 11.5px/1.35 $B;color:#61594f}",
    "._note{font:400 18px/1.1 $S;color:#2b4a8f;transform:rotate(-1.2deg);padding:0 4px}",
    "._log{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:4px;font:500 11.5px/1.35 $B;color:#3a3530;-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent)}",
    "._lg{animation:rbg-golge-in .4s}",
    "._lg i{font:700 10.5px $C;letter-spacing:.08em;color:#8a8073;font-style:normal;margin-right:6px}",
    "._lg._bad{color:#9c2b20}",
    "@keyframes rbg-golge-in{from{opacity:0;transform:translateX(-8px)}}",
    "._short ._log{display:none}",
    "._tiny ._note,._tiny ._il,._tiny ._meta{display:none}",
    "._modes{position:absolute;right:0;bottom:0;width:var(--rbg-golge-pw,280px);padding:0 14px 12px 26px;z-index:4}",
    "._mrow{display:flex;gap:8px}",
    "._mb{flex:1;min-width:0;min-height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:6px;border:2px solid rgba(32,29,27,.5);background:rgba(32,29,27,.05);color:#201d1b;cursor:pointer;padding:6px 8px;font:inherit;transition:background .2s,color .2s,border-color .2s,transform .15s}",
    "._mb:active{transform:scale(.97)}",
    "._mb svg{width:21px;height:21px;flex:none}",
    "._mb span{display:flex;flex-direction:column;align-items:center;font:800 16px/1 $C;letter-spacing:.07em;min-width:0;max-width:100%}",
    "._mb small{font:600 10.5px/1.2 $C;letter-spacing:.08em;opacity:.72;margin-top:3px}",
    "._mb._inf._on{background:#201d1b;border-color:#201d1b;color:#f1ad2a}",
    "._mb._raid._on{background:#b8372b;border-color:#8a261d;color:#fff3e4}",
    "._mb._nudge{animation:rbg-golge-nudge .45s 2}",
    "@keyframes rbg-golge-nudge{50%{transform:scale(1.08)}}",
    "._hint{margin-top:7px;text-align:center;font:600 10.5px/1.2 $C;letter-spacing:.1em;color:#61594f}",
    "._narrow ._panel{left:0;right:0;bottom:auto;width:auto;padding:8px 12px 8px;gap:6px;box-shadow:0 10px 26px rgba(0,0,0,.5)}",
    "._narrow ._panel:before,._narrow ._clip,._narrow ._meta,._narrow ._rule,._narrow ._note,._narrow ._log,._narrow ._it,._narrow ._il,._narrow ._hint{display:none}",
    "._narrow ._ht{font-size:11px;padding:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "._narrow ._ht b{display:inline;font-size:13px;margin:0}",
    "._narrow ._stats{grid-template-columns:auto 1fr auto auto;gap:4px 14px}",
    "._narrow ._stat label{font-size:9.5px;margin-bottom:3px}",
    "._narrow ._stat b{font-size:19px}",
    "._narrow ._st-trust{order:1}._narrow ._st-tg{order:2}._narrow ._st-time{order:3}._narrow ._st-score{order:4}",
    "._narrow ._trust svg{width:18px;height:18px}",
    "._narrow ._tb{width:17px;height:17px;font-size:10px}._narrow ._tb._hq{width:24px}",
    "._narrow ._info{min-height:0;padding:3px 8px;display:flex;align-items:center;gap:8px}",
    "._narrow ._in{font-size:15px;flex:0 1 auto}",
    "._narrow ._is{margin:0;font-size:10.5px;flex:0 1 auto}",
    "._narrow ._modes{left:0;right:0;width:auto;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));background:#191817;border-top:1px solid rgba(242,230,199,.12)}",
    "._narrow ._mb{min-height:50px;flex-direction:row;gap:8px;border:1px solid rgba(242,230,199,.2);background:#252423;color:#f2ebd9}",
    "._narrow ._mb span{align-items:flex-start;font-size:17px}",
    "._narrow ._mb._inf._on{background:#f1ad2a;border-color:#f1ad2a;color:#201d1b}",
    "._narrow ._mb._raid._on{background:#db4738;border-color:#db4738;color:#fff}",
    "._card{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;padding:12px;background:radial-gradient(ellipse at 50% 50%,rgba(12,11,10,.5),rgba(8,7,6,.86));opacity:0;visibility:hidden;transition:opacity .35s,visibility 0s .35s}",
    "._card._show{opacity:1;visibility:visible;transition:opacity .35s}",
    "._sheet{position:relative;width:min(460px,100%);max-height:100%;overflow:auto;padding:26px 26px 22px;border-radius:3px;box-shadow:0 2px 0 rgba(0,0,0,.2),0 28px 60px rgba(0,0,0,.65);transform:translateY(18px) rotate(-1.4deg) scale(.97);transition:transform .5s cubic-bezier(.2,.7,.1,1)}",
    "._show ._sheet{transform:rotate(-.5deg)}",
    "._kick{font:800 12px/1.25 $C;letter-spacing:.2em;color:#b8372b;padding-right:84px}",
    "._title{font:400 46px/1 $D;letter-spacing:.02em;margin:8px 0 12px;color:#201d1b}",
    "._title._sm{font-size:32px}",
    "._how{margin:0 0 14px;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font:500 14.5px/1.4 $B}",
    "._how li{padding-left:12px;border-left:3px solid #201d1b}",
    "._how b{font:800 15px $C;letter-spacing:.08em}",
    "._chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 16px}",
    "._chips span{font:700 11px/1 $C;letter-spacing:.14em;padding:5px 8px 4px;border:1px solid rgba(32,29,27,.35);border-radius:3px;color:#3a3530}",
    "._foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}",
    "._best{font:700 12px/1 $C;letter-spacing:.14em;color:#61594f;display:flex;align-items:center;gap:6px;flex-wrap:wrap}",
    "._best b{font:400 22px $D;color:#201d1b;letter-spacing:.02em}",
    "._nb{font:800 12px/1 $C;letter-spacing:.14em;color:#b8372b;border:2px solid #b8372b;padding:4px 7px 3px;border-radius:3px;transform:rotate(-7deg);animation:rbg-golge-stamp .5s .8s cubic-bezier(.2,.9,.3,1.3) both}",
    "._btn{min-height:50px;min-width:150px;padding:0 26px;border:0;border-radius:6px;background:#201d1b;color:#f1ad2a;font:800 18px/1 $C;letter-spacing:.14em;cursor:pointer;box-shadow:0 4px 0 #000;transition:transform .12s,background .2s,box-shadow .12s}",
    "._btn:hover{background:#33312f}._btn:active{transform:translateY(3px);box-shadow:0 1px 0 #000}",
    "._cstamp{position:absolute;top:18px;right:16px;font:800 17px/1 $C;letter-spacing:.14em;color:#b8372b;border:3px double #b8372b;padding:6px 10px 4px;border-radius:4px;opacity:0;animation:rbg-golge-stamp .5s .35s cubic-bezier(.2,.9,.3,1.3) forwards;transform:rotate(9deg)}",
    "._cstamp._g{color:#3f8a47;border-color:#3f8a47}",
    "@keyframes rbg-golge-stamp{0%{opacity:0;transform:rotate(9deg) scale(2.4)}100%{opacity:.9;transform:rotate(9deg) scale(1)}}",
    "._rows{width:100%;border-collapse:collapse;font:500 14px/1.2 $B;margin:2px 0 14px}",
    "._rows td{padding:7px 0;border-bottom:1px dashed rgba(32,29,27,.25)}",
    "._rows td+td{text-align:right;font:400 18px $D;letter-spacing:.02em;white-space:nowrap;padding-left:10px}",
    "._rows tr._t td{border-bottom:0;padding-top:10px;font-weight:700}._rows tr._t td+td{font-size:26px;color:#b8372b}",
    "._nx{margin:0 0 16px;padding:10px 12px;background:#201d1b;color:#f2ebd9;border-radius:4px}",
    "._nx small{display:block;font:700 10.5px $C;letter-spacing:.18em;color:#f1ad2a}",
    "._nx b{display:block;font:400 22px/1.1 $D;letter-spacing:.03em;margin:4px 0 3px}",
    "._nx i{font:400 18px/1.1 $S;font-style:normal;color:#cfc5ad}",
    "._sub{font:500 14.5px/1.4 $B;color:#3a3530;margin:-4px 0 12px}",
    "._stars{display:flex;gap:6px;align-items:center;margin:2px 0 12px}",
    "._stars svg{width:34px;height:34px;fill:none;stroke:#8a8073;stroke-width:1.6;opacity:0;animation:rbg-golge-pop .45s cubic-bezier(.2,.9,.3,1.4) forwards}",
    "._stars svg._on{fill:#f1ad2a;stroke:#b37a1a}",
    "._stars em{font:700 12px $C;letter-spacing:.14em;color:#61594f;margin-left:8px;font-style:normal}",
    "@keyframes rbg-golge-pop{0%{opacity:0;transform:scale(.3) rotate(-30deg)}100%{opacity:1;transform:none}}",
    "._sc{display:flex;align-items:baseline;justify-content:space-between;gap:12px;border-top:2px solid #201d1b;border-bottom:2px solid #201d1b;padding:10px 0;margin:0 0 14px}",
    "._sc label{font:700 12px $C;letter-spacing:.16em;color:#61594f}._sc b{font:400 44px/1 $D;letter-spacing:.02em}",
    "._bar{height:4px;background:rgba(32,29,27,.15);margin-top:14px;border-radius:2px;overflow:hidden}",
    "._bar i{display:block;height:100%;width:0;background:#b8372b;transition:width .25s}",
    "._narrow ._sheet{padding:20px 18px 18px}._narrow ._title{font-size:36px}._narrow ._title._sm{font-size:27px}._narrow ._how{font-size:13.5px}"
  ].join("\n");

  var styleEl = null, styleRefs = 0, TEX = null;

  function addStyle() {
    styleRefs++;
    if (styleEl && styleEl.parentNode) return;
    styleEl = document.createElement("style");
    styleEl.textContent = CSS.replace(/\._/g, ".rbg-golge-").replace(/\$C/g, F_C).replace(/\$D/g, F_D).replace(/\$B/g, F_B).replace(/\$S/g, F_S);
    document.head.appendChild(styleEl);
  }
  function dropStyle() {
    styleRefs = Math.max(0, styleRefs - 1);
    if (!styleRefs && styleEl && styleEl.parentNode) { styleEl.parentNode.removeChild(styleEl); styleEl = null; }
  }
  /* class="_a _b" → class="rbg-golge-a rbg-golge-b" */
  function htm(s) {
    return s.replace(/class="([^"]*)"/g, function (m, cl) { return 'class="' + cl.replace(/(^|\s)_/g, "$1rbg-golge-") + '"'; });
  }

  /* ---------- yardımcılar ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function easeBack(k) { var c = 1.9, m = k - 1; return 1 + (c + 1) * m * m * m + c * m * m; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function cnv(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function rrect(x, l, t, w, h, r) {
    x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r);
    x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
  }
  function star(x, cx, cy, R, r, n) {
    x.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.closePath();
  }
  function distress(x, w, h, n) {
    x.save(); x.globalCompositeOperation = "destination-out";
    for (var i = 0; i < n; i++) { x.globalAlpha = 0.25 + Math.random() * 0.6; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 0.5 + Math.random() * 2.2, 0, TAU); x.fill(); }
    x.globalAlpha = 0.28; x.lineWidth = 1.5;
    for (i = 0; i < 4; i++) { var y = Math.random() * h; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + (Math.random() - 0.5) * h * 0.4); x.stroke(); }
    x.restore();
  }
  function noise(size, mono, alpha, fibers) {
    var c = cnv(size, size), x = c.getContext("2d"), im = x.createImageData(size, size), d = im.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = mono ? (Math.random() < 0.5 ? 0 : 255) : (40 + Math.random() * 60) | 0;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = (Math.random() * alpha * 255) | 0;
    }
    x.putImageData(im, 0, 0);
    x.strokeStyle = "rgba(90,70,40,.09)"; x.lineWidth = 0.7;
    for (i = 0; i < fibers; i++) {
      var fx = Math.random() * size, fy = Math.random() * size;
      x.beginPath(); x.moveTo(fx, fy); x.quadraticCurveTo(fx + Math.random() * 20 - 10, fy + Math.random() * 20 - 10, fx + Math.random() * 30 - 15, fy + Math.random() * 30 - 15); x.stroke();
    }
    return c.toDataURL("image/png");
  }
  function tex() {
    if (!TEX) { try { TEX = { paper: noise(160, false, 0.1, 26), film: noise(128, true, 0.5, 0) }; } catch (e) { TEX = { paper: "", film: "" }; } }
    return TEX;
  }

  /* ---------- çözücü: tahminsiz çözülebilir yerleşim ---------- */
  function countIn(nb, tg, i) { var n = 0; for (var k = 0; k < nb[i].length; k++) if (tg[nb[i][k]]) n++; return n; }
  /* bilinmeyen bölgeler için tutarlı tüm dağılımları sayar: cnt[j] = j'nin hedef olduğu dağılım sayısı */
  function enumerate(nb, known, num, unk, need) {
    var idx = {}, cons = [], j, r;
    for (j = 0; j < unk.length; j++) idx[unk[j]] = j;
    for (r = 0; r < known.length; r++) {
      if (known[r] !== 0) continue;
      var vars = [], res = num[r];
      for (var k = 0; k < nb[r].length; k++) { var q = nb[r][k]; if (known[q] === 1) res--; else if (known[q] < 0) vars.push(idx[q]); }
      if (vars.length) cons.push({ v: vars, r: res });
    }
    var vc = unk.map(function () { return []; });
    cons.forEach(function (c, ci) { c.v.forEach(function (v) { vc[v].push(ci); }); });
    var rem = cons.map(function (c) { return c.r; }), left = cons.map(function (c) { return c.v.length; });
    var cnt = unk.map(function () { return 0; }), total = 0, pick = [];
    function rec(j, needLeft) {
      if (needLeft < 0 || needLeft > unk.length - j) return;
      var k;
      if (j === unk.length) {
        for (k = 0; k < rem.length; k++) if (rem[k] !== 0) return;
        total++; for (k = 0; k < pick.length; k++) cnt[pick[k]]++;
        return;
      }
      var cs = vc[j], ok = true;
      for (k = 0; k < cs.length; k++) { left[cs[k]]--; if (rem[cs[k]] > left[cs[k]]) ok = false; }
      if (ok) rec(j + 1, needLeft);
      ok = true;
      for (k = 0; k < cs.length; k++) { rem[cs[k]]--; if (rem[cs[k]] < 0) ok = false; }
      if (ok) { pick.push(j); rec(j + 1, needLeft - 1); pick.pop(); }
      for (k = 0; k < cs.length; k++) { rem[cs[k]]++; left[cs[k]]++; }
    }
    rec(0, need);
    return { cnt: cnt, total: total };
  }
  /* kusursuz mantıklı oyuncunun beklenen pusu sayısı: zorunlu her tahminde en düşük hedef olasılığı toplanır.
   * (Tahminsiz yerleşimler bu grafiklerde tekdüze: hepsi "başkent 0" ya da "başkentin tüm komşuları"; o yüzden risk sınırı.) */
  function risk(nb, tg, K, start) {
    var n = tg.length, known = [], num = [], i, r = 0;
    for (i = 0; i < n; i++) { known.push(-1); num.push(0); }
    function reveal(i) { if (tg[i]) known[i] = 1; else { known[i] = 0; num[i] = countIn(nb, tg, i); } }
    start.forEach(reveal);
    for (var guard = 0; guard < 40; guard++) {
      var unk = [], kt = 0;
      for (i = 0; i < n; i++) { if (known[i] < 0) unk.push(i); else if (known[i] === 1) kt++; }
      if (!unk.length) break;
      var res = enumerate(nb, known, num, unk, K - kt), moved = false, j;
      for (j = 0; j < unk.length; j++) if (res.cnt[j] === 0 || res.cnt[j] === res.total) { reveal(unk[j]); moved = true; }
      if (!moved) {
        var bj = 0;
        for (j = 1; j < unk.length; j++) if (res.cnt[j] < res.cnt[bj]) bj = j;
        r += res.total ? res.cnt[bj] / res.total : 1;
        reveal(unk[bj]);
      }
    }
    return r;
  }
  /* rastgele yerleşim + "ilk muhbir raporu" (başkente komşu olmayan güvenli bir bölge); risk sınırını geçen ilki */
  function genLayout(nb, cells, maxRisk) {
    var n = nb.length, best = null, bestR = 1e9;
    for (var a = 0; a < 600; a++) {
      var tg = [], i, far = [];
      for (i = 0; i < n; i++) tg.push(0);
      var hq = HQ_CAND[(Math.random() * HQ_CAND.length) | 0];
      tg[hq] = 2;
      var pool = [];
      for (i = 1; i < n; i++) if (i !== hq) pool.push(i);
      shuffle(pool);
      for (i = 0; i < cells; i++) tg[pool[i]] = 1;
      for (i = 1; i < n; i++) if (!tg[i] && nb[0].indexOf(i) < 0 && i !== 10) far.push(i);
      if (!far.length) for (i = 1; i < n; i++) if (!tg[i]) far.push(i);
      var intel = far[(Math.random() * far.length) | 0], r = risk(nb, tg, cells + 1, [0, intel]);
      if (r < bestR) { bestR = r; best = { tg: tg, intel: intel }; }
      if (r <= maxRisk) break;
    }
    return best;
  }

  /* ---------- sprite'lar (yazı tipleri yüklendikten sonra bir kez) ---------- */
  function makeStamp(text, col) {
    var fs = 76, pad = 28, c = cnv(8, 8), x = c.getContext("2d");
    x.font = "800 " + fs + "px " + CAPS;
    if ("letterSpacing" in x) x.letterSpacing = "5px";
    var tw = x.measureText(text).width;
    c.width = Math.ceil(tw + pad * 2 + 12); c.height = Math.ceil(fs + pad * 2);
    x = c.getContext("2d");
    var w = c.width, h = c.height;
    x.strokeStyle = col; x.fillStyle = col;
    x.lineWidth = 7; rrect(x, 6, 6, w - 12, h - 12, 12); x.stroke();
    x.lineWidth = 2.5; rrect(x, 17, 17, w - 34, h - 34, 7); x.stroke();
    x.font = "800 " + fs + "px " + CAPS;
    if ("letterSpacing" in x) x.letterSpacing = "5px";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(text, w / 2 + 2, h / 2 + fs * 0.05);
    distress(x, w, h, 320);
    return c;
  }
  function makeCheck() {
    var c = cnv(96, 96), x = c.getContext("2d");
    x.fillStyle = "rgba(236,228,208,.88)"; x.strokeStyle = "#3f8a47";
    x.beginPath(); x.arc(48, 48, 40, 0, TAU); x.fill();
    x.lineWidth = 5; x.stroke();
    x.lineWidth = 2; x.beginPath(); x.arc(48, 48, 32, 0, TAU); x.stroke();
    x.lineWidth = 8; x.lineCap = "round"; x.lineJoin = "round";
    x.beginPath(); x.moveTo(30, 50); x.lineTo(43, 62); x.lineTo(67, 34); x.stroke();
    distress(x, 96, 96, 60);
    return c;
  }
  function makePin() {
    var c = cnv(64, 64), x = c.getContext("2d");
    x.fillStyle = "rgba(0,0,0,.42)"; x.beginPath(); x.ellipse(35, 37, 13, 8, 0.5, 0, TAU); x.fill();
    var gr = x.createRadialGradient(21, 18, 2, 26, 24, 15);
    gr.addColorStop(0, "#ff8f78"); gr.addColorStop(0.45, "#d23b2d"); gr.addColorStop(1, "#6e170f");
    x.fillStyle = gr; x.beginPath(); x.arc(26, 24, 14, 0, TAU); x.fill();
    x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.ellipse(21, 18, 4.5, 3, -0.6, 0, TAU); x.fill();
    return c;
  }
  function makeIcon(hq) {
    var c = cnv(96, 96), x = c.getContext("2d");
    x.translate(48, 48);
    x.fillStyle = "#c4362a"; x.strokeStyle = "#3b0f0a"; x.lineWidth = 5; x.lineJoin = "round";
    x.shadowColor = "rgba(0,0,0,.55)"; x.shadowBlur = 8; x.shadowOffsetY = 3;
    if (hq) {
      x.beginPath(); x.arc(0, 0, 36, 0, TAU); x.fill(); x.shadowColor = "transparent"; x.stroke();
      x.fillStyle = "#fff1e0"; star(x, 0, 2, 23, 9.5, 5); x.fill();
    } else {
      x.beginPath(); x.moveTo(0, -38); x.lineTo(38, 0); x.lineTo(0, 38); x.lineTo(-38, 0); x.closePath(); x.fill();
      x.shadowColor = "transparent"; x.stroke();
      x.strokeStyle = "#fff1e0"; x.fillStyle = "#fff1e0"; x.lineWidth = 3.5;
      x.beginPath(); x.moveTo(0, -12); x.lineTo(-12, 9); x.lineTo(12, 9); x.closePath(); x.stroke();
      [[0, -12], [-12, 9], [12, 9]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 5.5, 0, TAU); x.fill(); });
    }
    return c;
  }
  function makeRadial(size, rgb, a) {
    var c = cnv(size, size), x = c.getContext("2d"), h = size / 2, gr = x.createRadialGradient(h, h, 0, h, h, h);
    gr.addColorStop(0, "rgba(" + rgb + "," + a + ")"); gr.addColorStop(1, "rgba(" + rgb + ",0)");
    x.fillStyle = gr; x.fillRect(0, 0, size, size);
    return c;
  }
  function makeBlot() {
    var c = cnv(160, 112), x = c.getContext("2d");
    for (var i = 0; i < 8; i++) {
      var cx = 80 + (Math.random() - 0.5) * 70, cy = 56 + (Math.random() - 0.5) * 40, r = 22 + Math.random() * 26;
      var gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, "rgba(196,54,42,.5)"); gr.addColorStop(1, "rgba(196,54,42,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 160, 112);
    }
    return c;
  }
  function makeVignette() {
    var c = cnv(200, 130), x = c.getContext("2d"), gr = x.createRadialGradient(100, 65, 18, 100, 65, 118);
    gr.addColorStop(0, "rgba(219,71,56,0)"); gr.addColorStop(0.55, "rgba(219,71,56,.16)"); gr.addColorStop(1, "rgba(219,71,56,.9)");
    x.fillStyle = gr; x.fillRect(0, 0, 200, 130);
    return c;
  }
  /* "gece operasyonu" renk düzeni: büyük ölçüde renksiz, koyu, soğuk */
  function gradeNight(img) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, c = cnv(w, h), x = c.getContext("2d");
    x.drawImage(img, 0, 0, w, h);
    x.globalCompositeOperation = "saturation";
    if (x.globalCompositeOperation === "saturation") { x.globalAlpha = 0.82; x.fillStyle = "#7f7f7f"; x.fillRect(0, 0, w, h); }
    x.globalAlpha = 1; x.globalCompositeOperation = "multiply";
    if (x.globalCompositeOperation === "multiply") { x.fillStyle = "#6a7286"; x.fillRect(0, 0, w, h); }
    x.globalCompositeOperation = "source-over"; x.fillStyle = "rgba(12,14,20,.2)"; x.fillRect(0, 0, w, h);
    return c;
  }

  /* ======================================================================= */
  function mount(el, ctx) {
    var lang = ctx.lang === "en" ? "en" : "tr", L = STR[lang];
    var dead = false, ro = null, fontTimer = 0;
    function up(s) { try { return lang === "tr" ? s.toLocaleUpperCase("tr-TR") : s.toUpperCase(); } catch (e) { return String(s).toUpperCase(); } }
    function fmt(n) { try { return Math.round(n).toLocaleString(lang === "tr" ? "tr-TR" : "en-US"); } catch (e) { return String(Math.round(n)); } }
    function tpl(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
    function mmss(t) { var s = Math.floor(t), m = Math.floor(s / 60); s %= 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }
    function sfx(n, v) { try { ctx.sfx(n, v); } catch (e) {} }
    function voice(k) { try { ctx.voice(k); } catch (e) {} }

    /* ---------- DOM ---------- */
    addStyle();
    var tx = tex();
    var root = document.createElement("div");
    root.className = "rbg-golge-root";
    if (tx.paper) root.style.setProperty("--rbg-golge-paper", "url(" + tx.paper + ")");
    if (tx.film) root.style.setProperty("--rbg-golge-film", "url(" + tx.film + ")");
    root.innerHTML = htm(
      '<canvas class="_cv"></canvas><div class="_fx"><div class="_grain"></div></div><div class="_banner"></div>' +
      '<div class="_panel _paper"><div class="_clip">' + ICON.clip + '</div>' +
        '<div class="_ht">' + L.dossier + ' · <b class="_prov"></b></div>' +
        '<div class="_meta"><span class="_file"></span><span class="_gizli">' + L.classified + '</span></div>' +
        '<div class="_rule"></div>' +
        '<div class="_stats">' +
          '<div class="_stat _st-trust"><label>' + L.trust + '</label><div class="_trust">' + ICON.shield + ICON.shield + ICON.shield + '</div></div>' +
          '<div class="_stat _r _st-score"><label>' + L.score + '</label><b class="_score">0</b></div>' +
          '<div class="_stat _st-tg"><label>' + L.targets + '</label><div class="_tg"></div></div>' +
          '<div class="_stat _r _st-time"><label>' + L.time + '</label><b class="_time">00:00</b></div>' +
        '</div>' +
        '<div class="_info"><div class="_in">—</div><div class="_it"></div><div class="_is"></div><div class="_il"></div></div>' +
        '<div class="_note">' + L.note1 + '<br>' + L.note2 + '</div><div class="_log"></div>' +
      '</div>' +
      '<div class="_modes"><div class="_mrow">' +
        '<button type="button" class="_mb _inf _on" data-m="inform">' + ICON.eye + '<span>' + L.inform + '<small>' + L.informSub + '</small></span></button>' +
        '<button type="button" class="_mb _raid" data-m="raid">' + ICON.cross + '<span>' + L.raid + '<small>' + L.raidSub + '</small></span></button>' +
      '</div><div class="_hint">' + L.hintLong + '</div></div>' +
      '<div class="_card"></div>');
    el.appendChild(root);
    function q(n) { return root.querySelector(".rbg-golge-" + n); }
    var cv = q("cv"), g = cv.getContext("2d"), fxEl = q("fx"), bannerEl = q("banner"), panel = q("panel"), modes = q("modes"), cardEl = q("card");
    var provEl = q("prov"), fileEl = q("file"), scoreEl = q("score"), timeEl = q("time"), tgEl = q("tg"), logEl = q("log");
    var inName = q("in"), inTag = q("it"), inSt = q("is"), inLinks = q("il"), btnInf = q("inf"), btnRaid = q("raid");
    var shields = root.querySelectorAll(".rbg-golge-trust svg");
    cv.setAttribute("aria-label", L.aria);
    var base = cnv(1, 1), bg = base.getContext("2d"), hitC = cnv(2, 2), hg = hitC.getContext("2d");

    /* ---------- durum ---------- */
    var A = {};
    MAPS.forEach(function (m) { A[m] = { data: null, img: null }; });
    var LV = null, D = [], SPR = null;
    var view = { s: 1, ox: 0, oy: 0 }, area = { x: 0, y: 0, w: 1, h: 1 };
    var W = 0, H = 0, dpr = 1, narrow = false, hatchC = null, gridC = null, patDpr = 0;
    var numPx = 24, labPx = 11, stampW = 100, pinPx = 14, numFont = "", labFont = "", dash = [6, 5];
    var S = { phase: "loading", li: 0, trust: MAX_TRUST, score: 0, lvPts: 0, time: 0, mode: "inform", hover: -1, sel: -1, found: 0, total: 0, cleared: 0, lost: 0, hqSeen: false, hqT: -99, hvT: 0, res: null };
    var strings = [], tstamps = [], timers = [], ripples = [], floaters = [], P = [];
    for (var pi = 0; pi < 220; pi++) P.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, sz: 1, col: "#fff", kind: 0, drag: 0, grav: 0 });
    var clock = 0, last = 0, raf = 0, running = false, paused = false, shake = 0, flashA = 0, baseDirty = true;
    var press = null, lastSec = -1, infoKey = "", tgHTML = "";

    function later(sec, fn) { timers.push({ t: clock + sec, fn: fn }); }
    function setPhase(p) { S.phase = p; cv.style.touchAction = p === "play" ? "none" : "auto"; }

    /* ---------- yükleme ---------- */
    function parseMap(m) {
      var a = A[m], j = a.data, ds = j.districts.slice().sort(function (p1, p2) { return p1.id - p2.id; });
      var bb = [1e9, 1e9, -1e9, -1e9];
      j.districts = ds; a.paths = []; a.dbb = []; a.nb = [];
      for (var i = 0; i < ds.length; i++) {
        var nums = String(ds[i].d).match(/-?\d+(?:\.\d+)?/g) || [], b = [1e9, 1e9, -1e9, -1e9];
        for (var k = 0; k + 1 < nums.length; k += 2) {
          var x = +nums[k], y = +nums[k + 1];
          if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
        }
        a.paths.push(new Path2D(ds[i].d)); a.dbb.push(b); a.nb.push((ds[i].n || []).slice());
        bb[0] = Math.min(bb[0], b[0]); bb[1] = Math.min(bb[1], b[1]); bb[2] = Math.max(bb[2], b[2]); bb[3] = Math.max(bb[3], b[3]);
      }
      a.bb = bb; a.vw = (j.view && j.view[0]) || 2100; a.vh = (j.view && j.view[1]) || 1400;
    }
    function preload() {
      var total = MAPS.length * 2 + 1, done = 0, failed = false, fontsDone = false;
      var small = Math.max(el.clientWidth || 800, el.clientHeight || 500) * Math.min(2, window.devicePixelRatio || 1) < 1500;
      function step() {
        if (dead) return;
        done++;
        var bar = q("bar") && q("bar").firstChild;
        if (bar) bar.style.width = Math.round(done / total * 100) + "%";
        if (done === total) ready(failed);
      }
      MAPS.forEach(function (m) {
        fetch(ctx.assets + "data/map_" + m + ".json")
          .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
          .then(function (j) { if (dead) return; A[m].data = j; parseMap(m); })
          .catch(function () { failed = true; A[m].data = null; })
          .then(step);
        var im = new Image();
        im.decoding = "async";
        im.onload = function () { A[m].img = im; step(); };
        im.onerror = function () { step(); };
        im.src = ctx.assets + "img/map/" + m + (small ? "_gun_k" : "_gun") + ".webp";
      });
      function fstep() { if (fontsDone) return; fontsDone = true; clearTimeout(fontTimer); step(); }
      try {
        if (document.fonts && document.fonts.load) {
          Promise.all(["800 40px 'Barlow Condensed'", "700 20px 'Barlow Condensed'", "40px Anton", "20px Caveat", "500 16px Barlow"].map(function (f) {
            return document.fonts.load(f).catch(function () {});
          })).then(fstep, fstep);
          fontTimer = setTimeout(fstep, 3500);
        } else fstep();
      } catch (e) { fstep(); }
    }
    function ready(failed) {
      if (failed) {
        showCard('<div class="_kick">' + L.dossier + '</div><h2 class="_title _sm">' + L.loading + '</h2><p class="_sub">' + L.loadErr + '</p>');
        return;
      }
      SPR = {
        neutral: makeStamp(L.stamp.neutral, "#c4362a"), ambush: makeStamp(L.stamp.ambush, "#c4362a"), harm: makeStamp(L.stamp.harm, "#c4362a"),
        check: makeCheck(), pin: makePin(), cell: makeIcon(false), hq: makeIcon(true),
        blot: makeBlot(), light: makeRadial(256, "255,200,120", 1), redvig: makeVignette()
      };
      setLevel(0);
      layout();
      showIntro();
    }

    /* ---------- düzen ve dönüşüm ---------- */
    function place(e) { e.style.left = area.x + "px"; e.style.top = area.y + "px"; e.style.width = area.w + "px"; e.style.height = area.h + "px"; }
    function layout() {
      if (dead) return;
      W = el.clientWidth; H = el.clientHeight;
      if (W < 10 || H < 10) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      narrow = W < 620 || W / H < 1.2;
      root.classList.toggle("rbg-golge-narrow", narrow);
      root.classList.toggle("rbg-golge-short", !narrow && H < 560);
      root.classList.toggle("rbg-golge-tiny", !narrow && H < 450);
      var pw = Math.round(clamp(W * 0.27, 220, 300));
      root.style.setProperty("--rbg-golge-pw", pw + "px");
      if (narrow) {
        var ph = panel.offsetHeight, bh = modes.offsetHeight;
        area = { x: 0, y: ph, w: W, h: Math.max(80, H - ph - bh) };
      } else area = { x: 0, y: 0, w: W - pw, h: H };
      place(cv); place(fxEl); place(bannerEl);
      var cw = Math.max(1, Math.round(area.w * dpr)), ch = Math.max(1, Math.round(area.h * dpr));
      cv.width = cw; cv.height = ch; base.width = cw; base.height = ch;
      if (patDpr !== dpr) makePatterns();
      computeView();
      baseDirty = true;
      if (!running) render();
    }
    function makePatterns() {
      patDpr = dpr;
      var hs = Math.round(9 * dpr);
      hatchC = cnv(hs, hs);
      var x = hatchC.getContext("2d");
      x.strokeStyle = "rgba(242,230,199,.08)"; x.lineWidth = dpr;
      x.beginPath(); x.moveTo(0, hs); x.lineTo(hs, 0); x.moveTo(-hs / 2, hs / 2); x.lineTo(hs / 2, -hs / 2); x.moveTo(hs / 2, hs * 1.5); x.lineTo(hs * 1.5, hs / 2); x.stroke();
      var gs = Math.round(28 * dpr);
      gridC = cnv(gs, gs);
      x = gridC.getContext("2d");
      x.fillStyle = "rgba(242,230,199,.045)"; x.fillRect(0, 0, gs, Math.max(1, dpr)); x.fillRect(0, 0, Math.max(1, dpr), gs);
    }
    function computeView() {
      if (!LV) return;
      var bb = LV.bb, pad = narrow ? 6 : 14, bw = bb[2] - bb[0], bh = bb[3] - bb[1];
      var s = Math.max(0.02, Math.min((area.w - pad * 2) / bw, (area.h - pad * 2) / bh));
      view.s = s; view.ox = area.w / 2 - (bb[0] + bw / 2) * s; view.oy = area.h / 2 - (bb[1] + bh / 2) * s;
      numPx = clamp(s * 100, 17, 44); labPx = clamp(s * 30, 9.5, 12.5); stampW = clamp(s * 290, 54, 150); pinPx = clamp(numPx * 0.42, 11, 18);
      numFont = numPx.toFixed(1) + "px " + DISP; labFont = "700 " + labPx.toFixed(1) + "px " + CAPS;
      dash = [6 / s, 5 / s];
      g.font = labFont; setLS(labPx * 0.08);
      for (var i = 0; i < D.length; i++) {
        var d = D[i];
        d.sx = d.c[0] * s + view.ox; d.sy = d.c[1] * s + view.oy; d.ax = d.sx; d.ay = d.sy - numPx * 0.8;
        d.lw = g.measureText(d.lab).width;
      }
      setLS(0);
    }
    function setLS(px) { if ("letterSpacing" in g) g.letterSpacing = px ? px.toFixed(2) + "px" : "0px"; }
    function pick(px, py) {
      if (!LV || !D.length) return -1;
      var mx = (px - view.ox) / view.s, my = (py - view.oy) / view.s, i;
      for (i = 0; i < D.length; i++) if (hg.isPointInPath(LV.paths[i], mx, my)) return i;
      hg.lineWidth = 16 / view.s;
      for (i = 0; i < D.length; i++) if (hg.isPointInStroke(LV.paths[i], mx, my)) return i;
      return -1;
    }

    /* ---------- seviye ---------- */
    function setLevel(i) {
      var lv = LEVELS[i], a = A[lv.map];
      if (!LV || LV.key !== lv.map) {
        if (LV && LV.night) LV.night.width = 0;
        var night = null;
        try { night = a.img ? gradeNight(a.img) : null; } catch (e) { night = null; }
        LV = { key: lv.map, img: a.img, night: night, paths: a.paths, dbb: a.dbb, nb: a.nb, bb: a.bb, vw: a.vw, vh: a.vh, prov: a.data.province || lv.map };
      }
      D = a.data.districts.map(function (d, k) {
        return { id: k, name: d.name, lab: up(d.name), role: d.role || "", terrain: d.terrain || "", c: d.c, n: a.nb[k], target: 0, state: "hidden",
          num: 0, numStr: "0", harm: false, anim: false, revT0: 0, aox: 0, aoy: 0, aR: 0, expT0: 0, stT0: 0, stImp: false, rot: 0, ghost: false,
          sx: 0, sy: 0, ax: 0, ay: 0, lw: 0 };
      });
      S.li = i;
      provEl.textContent = up(L.prov[lv.map]);
      fileEl.textContent = L.file + " 0" + (i + 1) + "/03 · " + L.front;
      computeView();
      baseDirty = true; infoKey = "";
      updHud(); updInfo(true);
    }
    function startRun() {
      S.score = 0; S.cleared = 0; S.lost = 0;
      startLevel(0);
    }
    function startLevel(i) {
      timers.length = 0;
      setLevel(i);
      var lv = LEVELS[i], lay = genLayout(LV.nb, lv.cells, lv.risk), intel = lay.intel;
      for (var j = 0; j < D.length; j++) D[j].target = lay.tg[j] || 0;
      S.total = lv.cells + 1; S.found = 0; S.trust = MAX_TRUST; S.time = 0; S.lvPts = 0; S.sel = -1; S.hover = -1;
      S.hqSeen = false; S.hqT = -99; lastSec = -1;
      strings.length = 0; tstamps.length = 0; floaters.length = 0; ripples.length = 0;
      for (j = 0; j < P.length; j++) P[j].on = false;
      setMode("inform");
      logEl.innerHTML = "";
      addLog(tpl(L.log.start, { p: L.prov[lv.map] }), "");
      setPhase("play");
      hideCard(); showBanner(i);
      sfx("telsiz", 0.55);
      later(0.5, function () {
        reveal(0, null, null, 0);
        addLog(tpl(L.log.clear, { d: D[0].name, n: D[0].num }), "");
      });
      later(1.5, function () {
        if (S.phase !== "play" || D[intel].state !== "hidden") return;
        sfx("olay", 0.45);
        addLog(L.log.intel, "");
        reveal(intel, null, null, 0);
        addLog(tpl(L.log.clear, { d: D[intel].name, n: D[intel].num }), "");
        updInfo(true);
      });
      updHud(); updInfo(true); updTime();
    }

    /* ---------- eylemler ---------- */
    function act(i, mode, px, py) {
      if (S.phase !== "play" || i < 0) return;
      var d = D[i];
      S.sel = i;
      if (mode === "inform") {
        if (d.state === "hidden") {
          if (d.target) ambush(i);
          else { sfx("ui_tik", 0.55); reveal(i, px, py, 0); addLog(tpl(L.log.clear, { d: d.name, n: d.num }), ""); }
        } else if (d.state === "clear") { sfx("ui_tik", 0.4); linkStrings(i); }
        else if (d.state === "exposed") { sfx("ui_hata", 0.4); nudge(btnRaid); addLog(tpl(L.log.exposed, { d: d.name }), "bad"); }
        else sfx("ui_tik", 0.35);
      } else {
        if (d.state === "hidden" || d.state === "exposed") {
          sfx("ui_tik", 0.45);
          if (d.target) neutralize(i); else harm(i, px, py);
        } else if (d.state === "clear") { sfx("ui_hata", 0.4); addLog(tpl(L.log.known, { d: d.name }), ""); }
      }
      updInfo(true); updHud();
    }
    function countN(i) { var n = 0, d = D[i]; for (var k = 0; k < d.n.length; k++) if (D[d.n[k]].target) n++; return n; }
    function foundN(d) { var n = 0; for (var k = 0; k < d.n.length; k++) { var s = D[d.n[k]].state; if (s === "exposed" || s === "neutral") n++; } return n; }
    function tname(d) { return d.target === 2 ? L.hq : L.cell; }
    /* güvenli bölgeyi aç: style 0 normal (ip + toz), 1 sivil kayıp (ip), 2 son açılış (sessiz) */
    function reveal(i, px, py, style) {
      var d = D[i], b = LV.dbb[i], ox = d.c[0], oy = d.c[1];
      d.state = "clear"; d.num = countN(i); d.numStr = String(d.num); d.anim = true; d.revT0 = clock;
      if (px != null) {
        var mx = (px - view.ox) / view.s, my = (py - view.oy) / view.s;
        if (hg.isPointInPath(LV.paths[i], mx, my)) { ox = mx; oy = my; }
      }
      d.aox = ox; d.aoy = oy;
      d.aR = Math.max(Math.hypot(b[0] - ox, b[1] - oy), Math.hypot(b[2] - ox, b[1] - oy), Math.hypot(b[0] - ox, b[3] - oy), Math.hypot(b[2] - ox, b[3] - oy));
      if (style < 2) linkStrings(i);
      if (style === 0) emit(d.sx, d.sy, 18, DUST);
    }
    function linkStrings(i) {
      for (var k = strings.length - 1; k >= 0; k--) if (strings[k].a === i) strings.splice(k, 1);
      var n = D[i].n;
      for (k = 0; k < n.length; k++) strings.push({ a: i, b: n[k], t0: clock + k * 0.06, life: 2.4 });
    }
    function ambush(i) {
      var d = D[i];
      d.state = "exposed"; d.expT0 = clock;
      loseTrust();
      tstamps.push({ i: i, spr: SPR.ambush, t0: clock, life: 1.7, rot: -0.16 + Math.random() * 0.1, sc: 0.85, imp: false });
      shake = 12; flashA = 0.55;
      emit(d.sx, d.sy, 26, SPARK); emit(d.sx, d.sy, 8, SMOKE);
      sfx("kotu", 0.85);
      addLog(tpl(L.log.ambush, { d: d.name, t: tname(d) }), "bad");
      if (d.target === 2) hqSpotted();
      baseDirty = true;
      if (S.trust <= 0) gameOver();
    }
    function neutralize(i) {
      var d = D[i], was = d.state === "exposed";
      if (d.target === 2 && !was) hqSpotted();
      if (!was) d.expT0 = clock;
      d.state = "neutral"; d.stT0 = clock; d.stImp = false; d.rot = -0.22 + Math.random() * 0.14;
      var pts = (d.target === 2 ? PTS_HQ : PTS_CELL) * (was ? 0.5 : 1);
      S.lvPts += pts; S.found++;
      floaters.push({ x: d.sx, y: d.sy - numPx * 0.7, t0: clock + 0.24, txt: "+" + fmt(pts * LEVELS[S.li].mult) });
      addLog(tpl(L.log.neutral, { d: d.name, t: tname(d) }), "");
      baseDirty = true;
      if (S.found >= S.total) levelClear();
    }
    function harm(i, px, py) {
      var d = D[i];
      reveal(i, px, py, 1); d.harm = true;
      loseTrust();
      tstamps.push({ i: i, spr: SPR.harm, t0: clock, life: 1.8, rot: 0.08 + Math.random() * 0.08, sc: 1.05, imp: false });
      shake = 7; flashA = 0.3;
      sfx("ui_hata", 0.8);
      addLog(tpl(L.log.harm, { d: d.name }), "bad");
      if (S.trust <= 0) gameOver();
    }
    function loseTrust() {
      S.trust = Math.max(0, S.trust - 1); S.lost++;
      var sh = shields[S.trust];
      if (sh) { sh.classList.remove("rbg-golge-hit"); void sh.getBoundingClientRect(); sh.classList.add("rbg-golge-hit"); }
    }
    function hqSpotted() { if (S.hqSeen) return; S.hqSeen = true; S.hqT = clock; voice("karargah_tespit_1"); }
    function levelClear() {
      setPhase("clearing"); press = null;
      var lv = LEVELS[S.li], trustB = S.trust * PTS_TRUST, par = 45 + 18 * S.total;
      var timeB = Math.max(0, Math.round((par - S.time) * 4)), tot = Math.round((S.lvPts + trustB + timeB) * lv.mult);
      S.res = { pts: S.lvPts, trustB: trustB, timeB: timeB, mult: lv.mult, tot: tot, time: S.time, trust: S.trust };
      S.score += tot; S.cleared++; S.lvPts = 0;
      var k = 0;
      D.forEach(function (d) {
        if (d.state !== "hidden") return;
        (function (j, dl) { later(dl, function () { reveal(j, null, null, 2); }); })(d.id, 0.55 + k * 0.1);
        k++;
      });
      later(0.35, function () { sfx("basarim", 0.8); });
      later(Math.max(0.6, S.hqT + 2.4 - clock), function () { voice("karargah_yok_1"); });
      later(2.9, function () { if (S.li < LEVELS.length - 1) showClear(); else endGame(true); });
      updHud();
    }
    function gameOver() {
      setPhase("over"); press = null;
      D.forEach(function (d) { if (d.target && d.state === "hidden") d.ghost = true; });
      later(2.1, function () { endGame(false); });
    }
    function endGame(won) {
      var total = S.score + Math.round(S.lvPts * LEVELS[S.li].mult);
      setPhase("end");
      var r = ctx.onEnd({ score: total, won: won }) || {};
      showEnd(won, total, r);
    }

    /* ---------- arayüz ---------- */
    function setMode(m) {
      S.mode = m;
      btnInf.classList.toggle("rbg-golge-on", m === "inform");
      btnRaid.classList.toggle("rbg-golge-on", m === "raid");
      root.classList.toggle("rbg-golge-raidm", m === "raid");
      S.hvT = clock;
    }
    function nudge(b) { b.classList.remove("rbg-golge-nudge"); void b.offsetWidth; b.classList.add("rbg-golge-nudge"); }
    function updHud() {
      if (!D.length) return;
      scoreEl.textContent = fmt(S.score + S.lvPts * LEVELS[S.li].mult);
      for (var k = 0; k < shields.length; k++) shields[k].classList.toggle("rbg-golge-off", k >= S.trust);
      var cn = 0, ce = 0, hs = "u", cells = LEVELS[S.li].cells, html = "";
      D.forEach(function (d) {
        if (d.target === 1) { if (d.state === "neutral") cn++; else if (d.state === "exposed") ce++; }
        else if (d.target === 2) hs = d.state === "neutral" ? "n" : d.state === "exposed" ? "e" : "u";
      });
      for (k = 0; k < cells; k++) {
        var c = k < cn ? "n" : k < cn + ce ? "e" : "u";
        html += '<span class="rbg-golge-tb rbg-golge-' + c + '">' + (c === "n" ? "✕" : c === "e" ? "!" : "?") + "</span>";
      }
      html += '<span class="rbg-golge-tb rbg-golge-hq rbg-golge-' + hs + '">' + ICON.star + "</span>";
      if (html !== tgHTML) { tgEl.innerHTML = html; tgHTML = html; }
    }
    function updTime() { var s = Math.floor(S.time); if (s !== lastSec) { lastSec = s; timeEl.textContent = mmss(S.time); } }
    function infoIdx() { return S.hover >= 0 ? S.hover : S.sel; }
    function updInfo(force) {
      var i = S.phase === "play" || S.phase === "clearing" || S.phase === "over" ? infoIdx() : -1, d = i >= 0 ? D[i] : null;
      var key = d ? i + d.state + (d.harm ? "h" : "") + (S.hqSeen ? "q" : "") : "-";
      if (!force && key === infoKey) return;
      infoKey = key;
      if (!d) { inName.textContent = "—"; inTag.textContent = ""; inSt.textContent = L.pick; inSt.className = "rbg-golge-is"; inLinks.textContent = ""; return; }
      inName.textContent = d.lab;
      var tag = (d.role ? L.role[d.role] : L.terr[d.terrain]) || "";
      if (!S.hqSeen && d.state === "hidden" && HQ_CAND.indexOf(i) >= 0) tag += (tag ? " · " : "") + L.st.hqZone;
      inTag.textContent = tag;
      var st = L.st.hidden, cls = "";
      if (d.state === "clear") { st = (d.harm ? L.st.harm : L.st.clear) + " · " + L.conn(d.num); cls = d.harm ? "bad" : "ok"; }
      else if (d.state === "exposed") { st = tname(d) + " · " + L.st.exposed; cls = "bad"; }
      else if (d.state === "neutral") { st = tname(d) + " · " + L.st.neutral; cls = "n"; }
      inSt.textContent = st;
      inSt.className = "rbg-golge-is" + (cls ? " rbg-golge-" + cls : "");
      inLinks.textContent = L.links + ": " + d.n.map(function (j) { return D[j].lab; }).join(" · ");
    }
    function addLog(txt, cls) {
      var div = document.createElement("div");
      div.className = "rbg-golge-lg" + (cls ? " rbg-golge-" + cls : "");
      var it = document.createElement("i");
      it.textContent = mmss(S.time);
      div.appendChild(it); div.appendChild(document.createTextNode(txt));
      logEl.insertBefore(div, logEl.firstChild);
      while (logEl.children.length > 5) logEl.removeChild(logEl.lastChild);
    }
    function showBanner(i) {
      var lv = LEVELS[i];
      bannerEl.innerHTML = htm('<div class="_bn"><div class="_bk">' + L.cellsHq(lv.cells) + '</div><div class="_bt">' + L.level + " " + (i + 1) +
        " · " + up(L.prov[lv.map]) + '</div><div class="_bs">' + L.brief[lv.map] + "</div></div>");
      bannerEl.classList.remove("rbg-golge-go"); void bannerEl.offsetWidth; bannerEl.classList.add("rbg-golge-go");
    }
    function showCard(html) { cardEl.innerHTML = htm('<div class="_sheet _paper">' + html + "</div>"); cardEl.classList.add("rbg-golge-show"); }
    function hideCard() { cardEl.classList.remove("rbg-golge-show"); }
    function showLoading() {
      showCard('<div class="_kick">' + L.dossier + '</div><h2 class="_title _sm">' + L.loading + '…</h2><div class="_bar"><i></i></div>');
    }
    function showIntro() {
      setPhase("intro");
      var best = 0;
      try { best = ctx.best() || 0; } catch (e) {}
      showCard('<div class="_cstamp">' + L.classified + '</div><div class="_kick">' + L.kicker + '</div><h2 class="_title">' + L.title + "</h2>" +
        '<ul class="_how">' + L.how.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ul>" +
        '<div class="_chips">' + LEVELS.map(function (lv, k) { return "<span>0" + (k + 1) + " · " + up(L.prov[lv.map]) + "</span>"; }).join("") + "</div>" +
        '<div class="_foot"><span class="_best">' + L.best + " <b>" + fmt(best) + '</b></span><button type="button" class="_btn" data-act="start">' + L.start + "</button></div>");
    }
    function showClear() {
      setPhase("card");
      var r = S.res, lv = LEVELS[S.li], nx = LEVELS[S.li + 1], ml = String(r.mult).replace(".", lang === "tr" ? "," : ".");
      showCard('<div class="_cstamp _g">' + L.stamp.clear + '</div><div class="_kick">' + L.level + " " + (S.li + 1) + " · " + up(L.prov[lv.map]) + "</div>" +
        '<h2 class="_title _sm">' + L.cleared(up(LV.prov)) + "</h2>" +
        '<table class="_rows"><tr><td>' + L.rows.targets + "</td><td>" + fmt(r.pts) + "</td></tr>" +
        "<tr><td>" + L.rows.trust + " (" + r.trust + " × " + PTS_TRUST + ")</td><td>" + fmt(r.trustB) + "</td></tr>" +
        "<tr><td>" + L.rows.time + " (" + mmss(r.time) + ")</td><td>" + fmt(r.timeB) + "</td></tr>" +
        "<tr><td>" + L.rows.mult + "</td><td>×" + ml + "</td></tr>" +
        '<tr class="_t"><td>' + L.rows.total + "</td><td>" + fmt(r.tot) + "</td></tr></table>" +
        '<div class="_nx"><small>' + L.nextFile + "</small><b>" + L.level + " " + (S.li + 2) + " · " + up(L.prov[nx.map]) + "</b><i>" + L.brief[nx.map] + "</i></div>" +
        '<div class="_foot"><span class="_best">' + L.score + " <b>" + fmt(S.score) + '</b></span><button type="button" class="_btn" data-act="next">' + L.next + "</button></div>");
    }
    function showEnd(won, total, r) {
      var stars = "";
      for (var k = 0; k < 3; k++) stars += ICON.star.replace("<svg ", '<svg class="' + (k < S.cleared ? "_on" : "") + '" style="animation-delay:' + (0.3 + k * 0.16).toFixed(2) + 's" ');
      showCard((won && S.lost === 0 ? '<div class="_cstamp">' + L.flawless + "</div>" : "") +
        '<div class="_kick">' + L.report + '</div><h2 class="_title _sm">' + (won ? L.winT : L.loseT) + "</h2>" +
        '<p class="_sub">' + (won ? L.winS : L.loseS) + "</p>" +
        '<div class="_stars">' + stars + "<em>" + S.cleared + "/3 " + L.levels + "</em></div>" +
        '<div class="_sc"><label>' + L.score + "</label><b>" + fmt(total) + "</b></div>" +
        '<div class="_foot"><span class="_best">' + L.best + " <b>" + fmt(r.best != null ? r.best : total) + "</b>" +
        (r.newBest ? '<span class="_nb">' + L.newBest + "</span>" : "") + '</span><button type="button" class="_btn" data-act="again">' + L.again + "</button></div>");
      if (r.newBest) later(0.8, function () { sfx("iyi", 0.7); });
    }

    /* ---------- parçacıklar ---------- */
    function emit(x, y, n, o) {
      for (var k = 0, j = 0; k < P.length && j < n; k++) {
        var p = P[k];
        if (p.on) continue;
        j++;
        var a = Math.random() * TAU, v = o.sp * (0.35 + Math.random() * 0.65), rr = o.r * Math.random();
        p.on = true; p.x = x + Math.cos(a) * rr; p.y = y + Math.sin(a) * rr; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
        p.max = p.life = o.life[0] + Math.random() * (o.life[1] - o.life[0]);
        p.sz = o.sz[0] + Math.random() * (o.sz[1] - o.sz[0]); p.col = o.col[(Math.random() * o.col.length) | 0];
        p.kind = o.kind; p.drag = o.drag; p.grav = o.grav;
      }
    }

    /* ---------- güncelleme ---------- */
    function update(dt) {
      clock += dt;
      if (S.phase === "play") { S.time += dt; updTime(); }
      for (var k = 0; k < timers.length;) {
        if (timers[k].t <= clock) { var f = timers[k].fn; timers.splice(k, 1); f(); } else k++;
      }
      shake = shake > 0.15 ? shake * Math.exp(-dt * 10) : 0;
      if (flashA > 0) flashA = Math.max(0, flashA - dt * 1.4);
      if (press && !press.fired && S.phase === "play" && performance.now() - press.t0 >= LONG_MS) {
        press.fired = true;
        if (press.i >= 0) {
          try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
          ripples.push({ x: press.x, y: press.y, t0: clock, red: true });
          act(press.i, "raid", press.x, press.y);
        }
      }
      for (k = 0; k < D.length; k++) {
        var d = D[k];
        if (d.state === "neutral" && !d.stImp && clock - d.stT0 >= 0.22) {
          d.stImp = true; sfx("damga", 0.85); emit(d.sx, d.sy, 22, INK); shake = Math.max(shake, d.target === 2 ? 9 : 6);
          if (S.phase === "play" || S.phase === "clearing") updHud();
        }
      }
      for (k = tstamps.length - 1; k >= 0; k--) {
        var ts = tstamps[k];
        if (!ts.imp && clock - ts.t0 >= 0.22) { ts.imp = true; emit(D[ts.i].sx, D[ts.i].sy, 12, INK); shake = Math.max(shake, 4); }
        if (clock - ts.t0 > ts.life) tstamps.splice(k, 1);
      }
      for (k = strings.length - 1; k >= 0; k--) if (clock - strings[k].t0 > strings[k].life) strings.splice(k, 1);
      for (k = floaters.length - 1; k >= 0; k--) if (clock - floaters[k].t0 > 1.3) floaters.splice(k, 1);
      for (k = ripples.length - 1; k >= 0; k--) if (clock - ripples[k].t0 > 0.5) ripples.splice(k, 1);
      for (k = 0; k < P.length; k++) {
        var p = P[k];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        var dr = Math.exp(-p.drag * dt);
        p.vx *= dr; p.vy = p.vy * dr + p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }

    /* ---------- çizim ---------- */
    function rebuildBase() {
      baseDirty = false;
      var w = base.width, h = base.height, i, d;
      bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalAlpha = 1; bg.globalCompositeOperation = "source-over";
      bg.fillStyle = "#131211"; bg.fillRect(0, 0, w, h);
      if (gridC) { bg.fillStyle = bg.createPattern(gridC, "repeat"); bg.fillRect(0, 0, w, h); }
      if (!LV) return;
      var s = view.s, hatch = hatchC ? bg.createPattern(hatchC, "repeat") : null;
      bg.setTransform(s * dpr, 0, 0, s * dpr, view.ox * dpr, view.oy * dpr);
      if (LV.night) bg.drawImage(LV.night, 0, 0, LV.vw, LV.vh);
      for (i = 0; i < D.length; i++) {
        d = D[i];
        var b = LV.dbb[i], bw = b[2] - b[0], bh = b[3] - b[1];
        bg.save(); bg.clip(LV.paths[i]);
        if (d.state === "hidden" || d.anim) {
          if (hatch) { bg.setTransform(1, 0, 0, 1, 0, 0); bg.fillStyle = hatch; bg.fillRect(0, 0, w, h); }
        } else if (d.state === "clear") {
          if (LV.img) bg.drawImage(LV.img, 0, 0, LV.vw, LV.vh);
          bg.fillStyle = d.harm ? TINT_HARM : TINT_OK; bg.fillRect(b[0], b[1], bw, bh);
        } else if (d.state === "exposed") {
          bg.fillStyle = TINT_EXP; bg.fillRect(b[0], b[1], bw, bh);
        } else {
          if (LV.img) { bg.globalAlpha = 0.85; bg.drawImage(LV.img, 0, 0, LV.vw, LV.vh); bg.globalAlpha = 1; }
          bg.fillStyle = TINT_NEU; bg.fillRect(b[0], b[1], bw, bh);
        }
        bg.restore();
      }
      bg.lineJoin = "round";
      bg.strokeStyle = "rgba(0,0,0,.5)"; bg.lineWidth = 3 / s;
      for (i = 0; i < D.length; i++) bg.stroke(LV.paths[i]);
      bg.strokeStyle = "rgba(242,230,199,.22)"; bg.lineWidth = 1 / s;
      for (i = 0; i < D.length; i++) bg.stroke(LV.paths[i]);
    }
    function drawPin(x, y, a) {
      var B = pinPx * 1.6;
      g.globalAlpha = a; g.drawImage(SPR.pin, x - B * 0.406, y - B * 0.375, B, B); g.globalAlpha = 1;
    }
    function drawString(ax, ay, bx, by, p, al) {
      var len = Math.hypot(bx - ax, by - ay), cx = (ax + bx) / 2, cy = (ay + by) / 2 + len * 0.12 + 6;
      var q0x = ax + (cx - ax) * p, q0y = ay + (cy - ay) * p, q1x = cx + (bx - cx) * p, q1y = cy + (by - cy) * p;
      var ex = q0x + (q1x - q0x) * p, ey = q0y + (q1y - q0y) * p;
      g.globalAlpha = al * 0.45; g.strokeStyle = "#000"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(ax + 1, ay + 2); g.quadraticCurveTo(q0x + 1, q0y + 2, ex + 1, ey + 2); g.stroke();
      g.globalAlpha = al; g.strokeStyle = "#e0493a"; g.lineWidth = 1.7;
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(q0x, q0y, ex, ey); g.stroke();
      g.globalAlpha = 1;
    }
    function drawStamp(spr, x, y, wpx, rot, age, am) {
      var k = age / 0.22, sc, a, r = rot;
      if (k < 1) { var e = easeOut(clamp(k, 0, 1)); sc = 2.3 - 1.3 * e; a = Math.min(1, k * 1.8); r = rot + (1 - e) * 0.32; }
      else { sc = 1 - 0.06 * Math.sin(clamp((age - 0.22) / 0.14, 0, 1) * Math.PI); a = 1; }
      if (a <= 0) return;
      var hpx = wpx * spr.height / spr.width;
      g.save(); g.translate(x, y); g.rotate(r); g.scale(sc, sc); g.globalAlpha = a * am * 0.93;
      g.drawImage(spr, -wpx / 2, -hpx / 2, wpx, hpx);
      g.restore();
    }
    function drawClear(d) {
      var age = clock - d.revT0, k = clamp((age - 0.15) / 0.32, 0, 1);
      if (k <= 0) return;
      var sc = easeBack(k), f = foundN(d), res = d.num > 0 && f >= d.num;
      drawPin(d.ax, d.ay, Math.min(1, k * 1.5));
      g.save(); g.translate(d.sx, d.sy); if (sc !== 1) g.scale(sc, sc);
      g.font = numFont; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      g.lineWidth = Math.max(3, numPx * 0.17); g.strokeStyle = "rgba(18,16,14,.92)";
      g.strokeText(d.numStr, 0, numPx * 0.04);
      g.fillStyle = d.num === 0 || res ? "#b9b09c" : "#f7f0de"; g.fillText(d.numStr, 0, numPx * 0.04);
      g.restore();
      if (d.num > 0) {
        var pr = Math.max(2, numPx * 0.075), gap = pr * 3, x0 = d.sx - (d.num - 1) * gap / 2, py = d.sy + numPx * 0.62;
        for (var j = 0; j < d.num; j++) {
          g.beginPath(); g.arc(x0 + j * gap, py, pr, 0, TAU);
          if (j < f) { g.fillStyle = "#e0493a"; g.fill(); } else { g.lineWidth = 1.3; g.strokeStyle = "rgba(247,240,222,.85)"; g.stroke(); }
        }
      }
      if (d.harm) {
        var hw = numPx * 2;
        g.save(); g.translate(d.sx + numPx * 0.95, d.sy - numPx * 0.25); g.rotate(0.14); g.globalAlpha = 0.85 * k;
        g.drawImage(SPR.harm, -hw / 2, -hw * SPR.harm.height / SPR.harm.width / 2, hw, hw * SPR.harm.height / SPR.harm.width);
        g.restore();
      } else {
        var cs = clamp(numPx * 0.62, 12, 28);
        g.globalAlpha = k; g.drawImage(SPR.check, d.sx + numPx * 0.62 - cs / 2, d.sy - numPx * 0.48 - cs / 2, cs, cs); g.globalAlpha = 1;
      }
    }
    function drawTarget(d, ghost) {
      var sz = numPx * 1.25, k = clamp((clock - d.expT0) / 0.3, 0, 1), sc = ghost ? 1 : easeBack(k), spr = d.target === 2 ? SPR.hq : SPR.cell;
      if (d.state === "exposed" || ghost) {
        var pu = 0.5 + 0.5 * Math.sin(clock * 5);
        g.globalAlpha = 0.6 * (1 - pu * 0.6); g.strokeStyle = "#e0493a"; g.lineWidth = 2;
        g.beginPath(); g.arc(d.sx, d.sy, sz * (0.62 + pu * 0.28), 0, TAU); g.stroke();
      }
      g.globalAlpha = ghost ? 0.55 + 0.25 * Math.sin(clock * 4) : d.state === "neutral" ? 0.6 : 1;
      if (sc > 0) g.drawImage(spr, d.sx - sz * sc / 2, d.sy - sz * sc / 2, sz * sc, sz * sc);
      g.globalAlpha = 1;
      if (!ghost) drawPin(d.ax, d.ay - sz * 0.12, 1);
    }
    function drawTag(d, y, red, strong) {
      var w = d.lw + labPx * 1.1, h = labPx + 7, x = d.sx;
      g.globalAlpha = strong ? 1 : 0.88;
      g.fillStyle = "rgba(0,0,0,.38)"; g.fillRect(x - w / 2 + 1.5, y - h / 2 + 2, w, h);
      g.fillStyle = red ? "#c23a2c" : "#ece4d0"; g.fillRect(x - w / 2, y - h / 2, w, h);
      g.fillStyle = red ? "#fff3e6" : "#201d1b"; g.fillText(d.lab, x + labPx * 0.04, y + 0.5);
      g.globalAlpha = 1;
    }
    function render() {
      if (!g) return;
      if (baseDirty) rebuildBase();
      var cw = cv.width, ch = cv.height, sx = 0, sy = 0, i, k, d;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      if (shake > 0.15) {
        sx = (Math.random() * 2 - 1) * shake * dpr; sy = (Math.random() * 2 - 1) * shake * dpr;
        g.fillStyle = "#131211"; g.fillRect(0, 0, cw, ch);
      }
      g.drawImage(base, sx, sy);
      if (!LV || !SPR || !D.length) return;
      var s = view.s, ms = s * dpr, mox = view.ox * dpr + sx, moy = view.oy * dpr + sy;
      /* açılış dalgası: renk, dokunulan noktadan yayılır */
      for (i = 0; i < D.length; i++) {
        d = D[i];
        if (!d.anim) continue;
        k = clamp((clock - d.revT0) / 0.75, 0, 1);
        var R = d.aR * easeOut(k) + 1, b = LV.dbb[i];
        g.setTransform(ms, 0, 0, ms, mox, moy);
        g.save(); g.clip(LV.paths[i]); g.beginPath(); g.arc(d.aox, d.aoy, R, 0, TAU); g.clip();
        if (LV.img) g.drawImage(LV.img, 0, 0, LV.vw, LV.vh);
        g.fillStyle = d.harm ? TINT_HARM : TINT_OK; g.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
        g.restore();
        if (k < 1) {
          g.save(); g.clip(LV.paths[i]); g.globalAlpha = (1 - k) * 0.9; g.strokeStyle = "#ffd98a"; g.lineWidth = 4 / s;
          g.beginPath(); g.arc(d.aox, d.aoy, R, 0, TAU); g.stroke(); g.restore();
        } else { d.anim = false; baseDirty = true; }
      }
      /* gezinen projektör */
      g.setTransform(1, 0, 0, 1, 0, 0);
      var Ls = Math.max(cw, ch) * 0.8;
      g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.07;
      g.drawImage(SPR.light, cw * (0.5 + 0.32 * Math.sin(clock * 0.13)) - Ls / 2 + sx, ch * (0.5 + 0.28 * Math.sin(clock * 0.19 + 1.3)) - Ls / 2 + sy, Ls, Ls);
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      /* harita uzayı: komşu ve seçim vurguları */
      g.setTransform(ms, 0, 0, ms, mox, moy);
      g.lineJoin = "round";
      var playing = S.phase === "play", info = playing ? infoIdx() : -1;
      var hv = playing ? (S.hover >= 0 ? S.hover : press && !press.fired && press.i >= 0 ? press.i : -1) : -1;
      if (info >= 0) {
        g.setLineDash(dash); g.strokeStyle = "rgba(242,230,199,.5)"; g.lineWidth = 1.5 / s;
        for (k = 0; k < D[info].n.length; k++) g.stroke(LV.paths[D[info].n[k]]);
        g.setLineDash(NODASH);
        if (info !== hv) { g.globalAlpha = 0.8; g.strokeStyle = HOV_A[2]; g.lineWidth = 1.8 / s; g.stroke(LV.paths[info]); g.globalAlpha = 1; }
      }
      for (i = 0; i < D.length; i++) {
        d = D[i];
        if (d.state === "exposed") { g.globalAlpha = 0.55 + 0.35 * Math.sin(clock * 5); g.strokeStyle = "#e0493a"; g.lineWidth = 2.5 / s; g.stroke(LV.paths[i]); g.globalAlpha = 1; }
        else if (d.ghost) { g.setLineDash(dash); g.strokeStyle = "#e0493a"; g.lineWidth = 2.5 / s; g.stroke(LV.paths[i]); g.setLineDash(NODASH); }
      }
      if (hv >= 0) {
        var hc = S.mode === "raid" ? HOV_R : HOV_A, path = LV.paths[hv];
        g.globalAlpha = clamp((clock - S.hvT) / 0.15, 0.25, 1);
        g.fillStyle = hc[0]; g.fill(path);
        g.strokeStyle = hc[1]; g.lineWidth = 8 / s; g.stroke(path);
        g.strokeStyle = hc[2]; g.lineWidth = 2.2 / s; g.stroke(path);
        g.globalAlpha = 1;
      }
      /* ekran uzayı (CSS px) */
      g.setTransform(dpr, 0, 0, dpr, sx, sy);
      if (info >= 0) for (k = 0; k < D[info].n.length; k++) { var nb = D[D[info].n[k]]; drawString(D[info].ax, D[info].ay, nb.ax, nb.ay, 1, 0.34); }
      for (k = 0; k < strings.length; k++) {
        var st = strings[k], age = clock - st.t0;
        if (age < 0) continue;
        var p = clamp(age / 0.38, 0, 1), al = age > st.life - 0.7 ? Math.max(0, (st.life - age) / 0.7) : 1, A1 = D[st.a], B1 = D[st.b];
        drawString(A1.ax, A1.ay, B1.ax, B1.ay, easeOut(p), al);
        if (p >= 1 && B1.state === "hidden") drawPin(B1.ax, B1.ay, al * clamp((age - 0.38) / 0.12, 0, 1));
      }
      for (i = 0; i < D.length; i++) {
        d = D[i];
        if (d.state === "clear") drawClear(d);
        else if (d.state === "exposed" || d.state === "neutral") drawTarget(d, false);
        else if (d.ghost) drawTarget(d, true);
      }
      /* dosya etiketleri */
      g.font = labFont; g.textAlign = "center"; g.textBaseline = "middle"; setLS(labPx * 0.08);
      var all = view.s >= 0.21;
      for (i = 0; i < D.length; i++) {
        d = D[i];
        var rev = d.state !== "hidden" || d.ghost;
        if (!((rev && all) || i === info || i === hv)) continue;
        if (d.state === "clear" && clock - d.revT0 < 0.3) continue;
        drawTag(d, rev ? d.sy + numPx * 0.62 + Math.max(2, numPx * 0.075) + labPx / 2 + 6.5 : d.sy, d.state === "exposed" || d.state === "neutral" || d.ghost, i === info || i === hv);
      }
      setLS(0);
      /* damgalar */
      for (i = 0; i < D.length; i++) {
        d = D[i];
        if (d.state !== "neutral") continue;
        var sa = clock - d.stT0;
        if (sa > 0.22) {
          var bk = clamp((sa - 0.22) / 0.5, 0, 1), bs = stampW * (0.8 + 0.5 * easeOut(bk));
          g.globalAlpha = 0.16 + 0.12 * (1 - bk); g.drawImage(SPR.blot, d.sx - bs / 2, d.sy - bs * 0.35, bs, bs * 0.7); g.globalAlpha = 1;
        }
        drawStamp(SPR.neutral, d.sx, d.sy, stampW, d.rot, sa, 1);
      }
      for (k = 0; k < tstamps.length; k++) {
        var ts = tstamps[k], ta = clock - ts.t0;
        drawStamp(ts.spr, D[ts.i].sx, D[ts.i].sy, stampW * ts.sc, ts.rot, ta, ta > ts.life - 0.45 ? Math.max(0, (ts.life - ta) / 0.45) : 1);
      }
      /* puan yazıları */
      if (floaters.length) {
        g.font = "800 " + Math.round(clamp(numPx * 0.55, 13, 20)) + "px " + CAPS; g.lineWidth = 3.5; g.strokeStyle = "rgba(18,16,14,.9)";
        for (k = 0; k < floaters.length; k++) {
          var fl = floaters[k], fa = clock - fl.t0;
          if (fa < 0) continue;
          var fy = fl.y - 34 * easeOut(clamp(fa / 1.3, 0, 1));
          g.globalAlpha = fa > 0.9 ? Math.max(0, (1.3 - fa) / 0.4) : 1;
          g.strokeText(fl.txt, fl.x, fy); g.fillStyle = "#f1ad2a"; g.fillText(fl.txt, fl.x, fy);
        }
        g.globalAlpha = 1;
      }
      /* parçacıklar */
      for (k = 0; k < P.length; k++) {
        var pp = P[k];
        if (!pp.on) continue;
        var pa = pp.life / pp.max;
        g.fillStyle = pp.col;
        if (pp.kind === 1) { g.globalAlpha = pa * 0.35; g.beginPath(); g.arc(pp.x, pp.y, pp.sz * (1.6 - pa), 0, TAU); g.fill(); }
        else if (pp.kind === 2) { g.globalAlpha = Math.min(1, pa * 1.6); g.fillRect(pp.x - pp.sz / 2, pp.y - pp.sz / 2, pp.sz, pp.sz); }
        else { g.globalAlpha = Math.min(1, pa * 1.6); g.beginPath(); g.arc(pp.x, pp.y, pp.sz * (0.5 + 0.5 * pa), 0, TAU); g.fill(); }
      }
      g.globalAlpha = 1;
      /* dokunuş halkaları ve uzun basma göstergesi */
      for (k = 0; k < ripples.length; k++) {
        var rp = ripples[k], ra = clamp((clock - rp.t0) / 0.5, 0, 1);
        g.globalAlpha = 0.7 * (1 - ra); g.strokeStyle = rp.red || S.mode === "raid" ? "#ff7a64" : "#ffd27a"; g.lineWidth = 2;
        g.beginPath(); g.arc(rp.x, rp.y, 6 + 30 * easeOut(ra), 0, TAU); g.stroke();
      }
      g.globalAlpha = 1;
      if (press && !press.fired && playing && press.i >= 0) {
        var lp = (performance.now() - press.t0) / LONG_MS;
        if (lp > 0.25) {
          g.strokeStyle = "rgba(0,0,0,.5)"; g.lineWidth = 6; g.beginPath(); g.arc(press.x, press.y, 30, 0, TAU); g.stroke();
          g.strokeStyle = "#e0493a"; g.lineWidth = 3.5; g.beginPath();
          g.arc(press.x, press.y, 30, -Math.PI / 2, -Math.PI / 2 + TAU * clamp((lp - 0.25) / 0.75, 0, 1)); g.stroke();
        }
      }
      if (flashA > 0.01) {
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = Math.min(1, flashA);
        g.drawImage(SPR.redvig, 0, 0, cw, ch); g.globalAlpha = 1;
      }
    }

    /* ---------- döngü ---------- */
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      var dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.1) dt = 0.1;
      update(dt);
      render();
    }
    function startLoop() { if (running || paused || dead) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stopLoop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    /* ---------- giriş ---------- */
    function local(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function onDown(e) {
      if (S.phase !== "play") return;
      var p = local(e);
      if (e.pointerType === "mouse" && e.button === 2) {
        e.preventDefault();
        var ri = pick(p.x, p.y);
        if (ri >= 0) { ripples.push({ x: p.x, y: p.y, t0: clock, red: true }); act(ri, "raid", p.x, p.y); }
        return;
      }
      if (e.button !== 0) return;
      e.preventDefault();
      press = { id: e.pointerId, x: p.x, y: p.y, t0: performance.now(), fired: false, i: pick(p.x, p.y) };
      S.hvT = clock;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onMove(e) {
      var p = local(e);
      if (press && e.pointerId === press.id && Math.abs(p.x - press.x) + Math.abs(p.y - press.y) > 14) press = null;
      if (e.pointerType === "mouse") {
        var i = S.phase === "play" ? pick(p.x, p.y) : -1;
        if (i !== S.hover) {
          S.hover = i; S.hvT = clock;
          cv.style.cursor = i >= 0 ? (S.mode === "raid" ? "crosshair" : "pointer") : "default";
          updInfo();
        }
      }
    }
    function onUp(e) {
      if (!press || e.pointerId !== press.id) return;
      var pr = press;
      press = null;
      if (pr.fired || S.phase !== "play" || pr.i < 0) return;
      ripples.push({ x: pr.x, y: pr.y, t0: clock, red: false });
      act(pr.i, S.mode, pr.x, pr.y);
    }
    function onCancel(e) { if (press && e.pointerId === press.id) press = null; }
    function onLeave(e) { if (e.pointerType === "mouse" && S.hover !== -1) { S.hover = -1; updInfo(); } }
    function onCtx(e) { e.preventDefault(); }
    function onKey(e) {
      if (paused || dead || S.phase !== "play" || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
      if (e.key === "1") { setMode("inform"); sfx("ui_tik", 0.4); }
      else if (e.key === "2") { setMode("raid"); sfx("ui_tik", 0.4); }
    }
    function onModes(e) {
      var b = e.target.closest ? e.target.closest("[data-m]") : null;
      if (!b) return;
      setMode(b.getAttribute("data-m")); sfx("ui_tik", 0.45);
      if (S.hover >= 0) cv.style.cursor = S.mode === "raid" ? "crosshair" : "pointer";
    }
    function onCard(e) {
      var b = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!b) return;
      var a = b.getAttribute("data-act");
      if ((a === "start" && S.phase === "intro") || (a === "again" && S.phase === "end")) { sfx("ui_onay", 0.6); startRun(); }
      else if (a === "next" && S.phase === "card") { sfx("ui_onay", 0.6); startLevel(S.li + 1); }
    }
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onCancel);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("contextmenu", onCtx);
    modes.addEventListener("click", onModes);
    cardEl.addEventListener("click", onCard);
    window.addEventListener("keydown", onKey);
    if (window.ResizeObserver) { ro = new window.ResizeObserver(function () { layout(); }); ro.observe(el); }
    else window.addEventListener("resize", layout);

    setPhase("loading");
    layout();
    showLoading();
    updHud();
    preload();
    startLoop();

    return {
      pause: function () { if (dead) return; paused = true; press = null; stopLoop(); },
      resume: function () { if (dead) return; paused = false; startLoop(); },
      destroy: function () {
        if (dead) return;
        dead = true; stopLoop(); clearTimeout(fontTimer);
        if (ro) ro.disconnect(); else window.removeEventListener("resize", layout);
        window.removeEventListener("keydown", onKey);
        cv.removeEventListener("pointerdown", onDown); cv.removeEventListener("pointermove", onMove); cv.removeEventListener("pointerup", onUp);
        cv.removeEventListener("pointercancel", onCancel); cv.removeEventListener("pointerleave", onLeave); cv.removeEventListener("contextmenu", onCtx);
        modes.removeEventListener("click", onModes); cardEl.removeEventListener("click", onCard);
        if (LV && LV.night) LV.night.width = 0;
        base.width = base.height = 1; cv.width = cv.height = 1;
        timers.length = 0;
        if (root.parentNode) root.parentNode.removeChild(root);
        dropStyle();
      }
    };
  }

  window.RBGames = window.RBGames || {};
  window.RBGames.golge = { title: { tr: "Gölge Avı", en: "Shadow Hunt" }, mount: mount };
})();
