/* ReBirth mini oyun — "Yardım Koridoru / Aid Corridor": Kesra Deltası'nda yardım konvoylarını planla, keşfet ve koru.
 * Sözleşme: js/games/CONTRACT.md. Tek dosya, düz ES2019, harici kütüphane yok. */
(function () {
  "use strict";
  window.RBGames = window.RBGames || {};

  var MW = 2100, MH = 1400, PORT = 1, HQ = 10, CONVOYS = 4, TAU = Math.PI * 2;
  var AMB = [0.04, 0.2, 0.42, 0.66];                       // risk düzeyine göre pusu olasılığı
  var ROLE_RISK = { forest: 0.55, strait: 0.45, border: 0.35, plateau: 0.15, bridge: 0.1, capital: -0.55 };
  var AMBER = "#f1ad2a", BAD = "#db4738", GOOD = "#66b86b", CREAM = "#ece4d0", INK = "#201d1b", CYAN = "#45c4cc";
  var EMPTY = [];

  var STR = {
    tr: {
      title: "Yardım Koridoru", kicker: "KESRA DELTASI · KOORDİNATÖR EMRİ",
      lead: "Sel deltayı ikiye böldü. Dört yardım konvoyu Saliya limanından çıkacak; Gölge Cephesi yollarda pusu kuruyor.",
      how: ["Limandan başla: komşu bölgelere dokunarak rotayı varış noktasına çiz.",
        "Keşif İHA'sıyla riski tara, eskortları en tehlikeli bölgelere yerleştir.",
        "YOLA ÇIKAR: yükün ne kadarı ulaşırsa o kadar puan."],
      start: "BAŞLA", loading: "YÜKLENİYOR…", fail: "YÜKLENEMEDİ · TEKRAR DENE",
      best: "EN İYİ", convoy: "KONVOY", score: "PUAN",
      drone: "İHA", escort: "ESKORT", go: "YOLA ÇIKAR", droneT: "Keşif İHA'sı", escortT: "Eskort birliği",
      estStart: "ROTA: LİMANA KOMŞU BİR BÖLGEYE DOKUN", estStartN: "LİMANDAN BAŞLA",
      stages: "AŞAMA", knownRisk: "BİLİNEN RİSK", unknown: "BİLİNMİYOR", estDel: "TAHMİNİ TESLİM", estShort: "TAHMİN",
      hintRoute: "Saliya limanından başla: komşu bir bölgeye dokun.",
      hintDrone: "Keşif İHA'sı: taranacak bölgeye dokun.",
      hintEscort: "Eskort: rotadaki bir bölgeye dokun. Tekrar dokunmak geri çeker.",
      errAdj: "Yalnız rotanın son bölgesine komşu bir bölge eklenebilir.",
      errHQ: "Gölge Cephesi karargâhı — konvoy buradan geçemez.",
      errDone: "Rota tamam. YOLA ÇIKAR'a bas ya da son bölgeye dokunup geri al.",
      errNoRoute: "Önce rotayı varış noktasına ulaştır.",
      errEscRoute: "Eskort yalnız rotadaki bölgelere konabilir.",
      errEscFirst: "Önce rotayı çiz, sonra eskort yerleştir.",
      errNoEsc: "Eskort kalmadı — geri çekmek için birinin üstüne dokun.",
      errPort: "Liman güvende — taramaya gerek yok.",
      errScanned: "Bu bölge bu konvoy için zaten tarandı.",
      errHQScan: "Karargâhın riski belli: en yüksek.",
      errBusy: "İHA görevde, bekle.",
      routeDone: "Rota hazır! İHA ve eskortu kullan, sonra YOLA ÇIKAR.",
      ambush: "PUSU!", repelled: "PUSU PÜSKÜRTÜLDÜ", arrived: "KONVOY ULAŞTI", lost: "KONVOY KAYBEDİLDİ",
      cargo: "YÜK", risk: "RİSK", delivered: "TESLİM", portTag: "LİMAN", hqTag: "GÖLGE CEPHESİ",
      deliveredCargo: "TESLİM EDİLEN YÜK", rRoute: "Rota", shortest: "en kısa", rAmbush: "Pusu", rep: "püskürtüldü",
      hit: "isabet", none: "yok", rCargo: "Yük puanı", rClean: "Temiz geçiş", rShort: "Kısa rota", rTotal: "Konvoy puanı",
      rSum: "Toplam", adapt: "Gölge Cephesi mevzi değiştiriyor — eski istihbarat artık soluk.",
      next: "SONRAKİ KONVOY", report: "HAREKÂT RAPORU", stFull: "TESLİM EDİLDİ", stPart: "KISMİ TESLİM", stLost: "KAYIP",
      sumKicker: "HAREKÂT RAPORU · KESRA DELTASI", win: "KORİDOR AÇIK", lose: "KORİDOR KAPANDI",
      winSub: "Yardım deltaya ulaştı. Halk sana güveniyor, Koordinatör.",
      loseSub: "Gölge Cephesi yolları tuttu. Daha çok keşif, daha akıllı eskort.",
      newBest: "YENİ REKOR!", again: "TEKRAR", total: "TOPLAM PUAN"
    },
    en: {
      title: "Aid Corridor", kicker: "KESRA DELTA · COORDINATOR'S ORDERS",
      lead: "The flood split the delta in two. Four aid convoys leave Saliya port, and the Shadow Front is laying ambushes on the roads.",
      how: ["Start at the port: tap neighbouring districts to draw a route to the destination.",
        "Scan risk with the recon drone and post escorts in the most dangerous districts.",
        "DISPATCH: the more cargo arrives, the higher your score."],
      start: "START", loading: "LOADING…", fail: "LOAD FAILED · RETRY",
      best: "BEST", convoy: "CONVOY", score: "SCORE",
      drone: "DRONE", escort: "ESCORT", go: "DISPATCH", droneT: "Recon drone", escortT: "Escort unit",
      estStart: "ROUTE: TAP A DISTRICT NEXT TO THE PORT", estStartN: "START AT THE PORT",
      stages: "LEGS", knownRisk: "KNOWN RISK", unknown: "UNKNOWN", estDel: "EST. DELIVERY", estShort: "EST.",
      hintRoute: "Start at Saliya port: tap a neighbouring district.",
      hintDrone: "Recon drone: tap a district to scan.",
      hintEscort: "Escort: tap a district on the route. Tap again to recall.",
      errAdj: "Only districts next to the end of the route can be added.",
      errHQ: "Shadow Front headquarters — convoys can't pass.",
      errDone: "Route complete. Press DISPATCH or tap the last district to undo.",
      errNoRoute: "Extend the route to the destination first.",
      errEscRoute: "Escorts can only be posted on the route.",
      errEscFirst: "Draw the route first, then post escorts.",
      errNoEsc: "No escorts left — tap one to recall it.",
      errPort: "The port is secure — no scan needed.",
      errScanned: "Already scanned for this convoy.",
      errHQScan: "HQ risk is known: maximum.",
      errBusy: "Drone is on task, stand by.",
      routeDone: "Route ready! Use drones and escorts, then DISPATCH.",
      ambush: "AMBUSH!", repelled: "AMBUSH REPELLED", arrived: "CONVOY ARRIVED", lost: "CONVOY LOST",
      cargo: "CARGO", risk: "RISK", delivered: "DELIVERED", portTag: "PORT", hqTag: "SHADOW FRONT",
      deliveredCargo: "CARGO DELIVERED", rRoute: "Route", shortest: "shortest", rAmbush: "Ambushes", rep: "repelled",
      hit: "hit", none: "none", rCargo: "Cargo points", rClean: "Clean run", rShort: "Short route", rTotal: "Convoy score",
      rSum: "Total", adapt: "The Shadow Front is repositioning — old intel is fading.",
      next: "NEXT CONVOY", report: "OPERATION REPORT", stFull: "DELIVERED", stPart: "PARTIAL", stLost: "LOST",
      sumKicker: "OPERATION REPORT · KESRA DELTA", win: "CORRIDOR OPEN", lose: "CORRIDOR CLOSED",
      winSub: "Aid reached the delta. The people trust you, Coordinator.",
      loseSub: "The Shadow Front held the roads. More recon, smarter escorts.",
      newBest: "NEW BEST!", again: "AGAIN", total: "TOTAL SCORE"
    }
  };

  /* yük türleri: seg = aşama başına kayıp (%), amb = pusu kaybı çarpanı, spd = hız çarpanı */
  var CARGO = {
    gida: { tr: "Gıda", en: "Food", seg: 2, amb: 1, spd: 1, note: { tr: "Standart yük — dengeli taşınır", en: "Standard load — travels well" } },
    ilac: { tr: "İlaç", en: "Medicine", seg: 3.5, amb: 1, spd: 1.1, note: { tr: "Soğuk zincir — uzun yol bozar", en: "Cold chain — long roads spoil it" } },
    barinak: { tr: "Barınak", en: "Shelter", seg: 2.5, amb: 0.85, spd: 0.85, note: { tr: "Ağır yük — yavaş ama dayanıklı", en: "Heavy load — slow but sturdy" } },
    yakit: { tr: "Yakıt", en: "Fuel", seg: 2, amb: 1.3, spd: 1, note: { tr: "Patlayıcı yük — pusu daha ağır", en: "Volatile load — ambushes hit harder" } }
  };
  var CARGO_IDS = ["gida", "ilac", "barinak", "yakit"];

  var ICON = {
    drone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/><circle cx="6" cy="6" r="2.8"/><circle cx="18" cy="6" r="2.8"/><circle cx="6" cy="18" r="2.8"/><circle cx="18" cy="18" r="2.8"/><rect x="9.6" y="9.6" width="4.8" height="4.8" rx="1" fill="currentColor"/></svg>',
    escort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/><path d="M8 9.5l4 3 4-3M8 13.5l4 3 4-3"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 5.5h12.5v10H1.5zM15 8.5h4.2l3.3 3.8v3.2H15z"/><circle cx="6" cy="17.5" r="2.2"/><circle cx="18" cy="17.5" r="2.2"/></svg>',
    gida: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V9"/><path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zm0 0c3 0 5-2 5-5-3 0-5 2-5 5zm0 5c-3 0-5-2-5-5 3 0 5 2 5 5zm0 0c3 0 5-2 5-5-3 0-5 2-5 5zm0-9c-1.6-1.6-1.6-4.4 0-6.5 1.6 2.1 1.6 4.9 0 6.5z"/></svg>',
    ilac: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
    barinak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 20L12 4l10 16zM12 4v16M8.5 20l3.5-6 3.5 6"/></svg>',
    yakit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5S5 10.5 5 15a7 7 0 0014 0c0-4.5-7-12.5-7-12.5z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg>'
  };

  var FD = 'var(--f-display,"Anton",Impact,sans-serif)', FC = 'var(--f-caps,"Barlow Condensed","Arial Narrow",sans-serif)',
    FB = 'var(--f-body,"Barlow",system-ui,sans-serif)', FS = 'var(--f-script,"Caveat",cursive)', EZ = "cubic-bezier(.2,.7,.1,1)";
  var CSS = [
    '.rbg-konvoy{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;background:#191817;color:#f2ebd9;font-family:' + FB + ';-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}',
    '.rbg-konvoy *{box-sizing:border-box}.rbg-konvoy button{-webkit-tap-highlight-color:transparent}',
    '.rbg-konvoy-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;outline:none}',
    '.rbg-konvoy-vig{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 58%,rgba(0,0,0,.5) 100%)}',
    '.rbg-konvoy-top{position:absolute;left:10px;right:10px;top:10px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;pointer-events:none;transition:opacity .45s,transform .45s ' + EZ + '}',
    '.rbg-konvoy-top.off{opacity:0;transform:translateY(-24px)}',
    '.rbg-konvoy-mission{position:relative;min-width:0;max-width:min(430px,64%);background:#ece4d0;color:#201d1b;border-radius:5px;padding:8px 14px 7px;box-shadow:0 8px 22px rgba(0,0,0,.45),inset 0 0 0 1px rgba(32,29,27,.08);transform:rotate(-.6deg)}',
    '.rbg-konvoy-mission:before{content:"";position:absolute;left:50%;top:-7px;width:58px;height:14px;margin-left:-29px;background:rgba(241,173,42,.6);transform:rotate(2deg)}',
    '.rbg-konvoy-mission.in{animation:rbg-konvoy-drop .6s ' + EZ + ' both}',
    '.rbg-konvoy-mk{font:700 11px/1.1 ' + FC + ';letter-spacing:.1em;color:#61594f}',
    '.rbg-konvoy-mt{font:400 21px/1.15 ' + FD + ';letter-spacing:.02em;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rbg-konvoy-mt i{font-style:normal;color:#b37a1a;padding:0 2px}',
    '.rbg-konvoy-ic{display:inline-block;width:18px;height:18px;vertical-align:-2px;margin-right:6px;flex:0 0 auto}.rbg-konvoy-ic svg{width:100%;height:100%;display:block}',
    '.rbg-konvoy-c-gida{color:#b8891f}.rbg-konvoy-c-ilac{color:#c23c2f}.rbg-konvoy-c-barinak{color:#3f7fb5}.rbg-konvoy-c-yakit{color:#8a5a2b}',
    '.rbg-konvoy-mn{font:400 17px/1 ' + FS + ';color:#b4362a;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rbg-konvoy-score{flex:0 0 auto;background:rgba(25,24,23,.9);border:1px solid rgba(242,230,199,.12);border-radius:6px;padding:7px 11px;text-align:right;box-shadow:0 6px 18px rgba(0,0,0,.4)}',
    '.rbg-konvoy-pips{display:flex;gap:4px;justify-content:flex-end}.rbg-konvoy-pips i{display:block;width:18px;height:6px;border-radius:2px;background:rgba(242,230,199,.16)}',
    '.rbg-konvoy-pips i.cur{background:#f1ad2a;animation:rbg-konvoy-blink 1.2s infinite}.rbg-konvoy-pips i.good{background:#66b86b}.rbg-konvoy-pips i.mid{background:#c98f24}.rbg-konvoy-pips i.bad{background:#db4738}',
    '.rbg-konvoy-pts{font:700 12px/1 ' + FC + ';letter-spacing:.08em;color:#a8a091;margin-top:6px;white-space:nowrap}',
    '.rbg-konvoy-pts b{font:400 19px/1 ' + FD + ';color:#f1ad2a;letter-spacing:.02em;margin-left:5px;vertical-align:-2px}',
    '.rbg-konvoy-hint{position:absolute;left:50%;bottom:84px;max-width:calc(100% - 24px);transform:translate(-50%,8px);opacity:0;pointer-events:none;background:rgba(25,24,23,.94);border:1px solid rgba(242,230,199,.16);color:#f2ebd9;padding:8px 14px;border-radius:20px;font:600 13px/1.25 ' + FB + ';text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.45);transition:opacity .25s,transform .25s}',
    '.rbg-konvoy-hint.show{opacity:1;transform:translate(-50%,0)}.rbg-konvoy-hint.err{border-color:rgba(219,71,56,.75);color:#ffc1b8}.rbg-konvoy-hint.ok{border-color:rgba(241,173,42,.6)}',
    '.rbg-konvoy-hint.scan{border-color:rgba(69,196,204,.75)}.rbg-konvoy-hint.esc{border-color:rgba(102,184,107,.75)}',
    '.rbg-konvoy-bar{position:absolute;left:10px;right:10px;bottom:10px;display:flex;align-items:center;gap:8px;background:rgba(25,24,23,.93);border:1px solid rgba(242,230,199,.12);border-radius:8px;padding:6px;box-shadow:0 10px 26px rgba(0,0,0,.5);transition:transform .45s ' + EZ + ',opacity .45s}',
    '.rbg-konvoy-bar.off{transform:translateY(calc(100% + 16px));opacity:0;pointer-events:none}',
    '.rbg-konvoy-tool{position:relative;flex:0 0 auto;height:48px;min-width:60px;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:6px;border:1px solid rgba(242,230,199,.2);background:#33312f;color:#f2ebd9;font:700 13px/1 ' + FC + ';letter-spacing:.08em;cursor:pointer;transition:background .2s,color .2s,box-shadow .2s,opacity .2s}',
    '.rbg-konvoy-tool svg{width:22px;height:22px;flex:0 0 auto}',
    '.rbg-konvoy-tool .n{min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#191817;color:#f1ad2a;font:700 12px/20px ' + FC + ';text-align:center}',
    '.rbg-konvoy-tool:active,.rbg-konvoy-go:active{transform:translateY(1px)}',
    '.rbg-konvoy-tool.on{color:#201d1b;border-color:transparent}',
    '.rbg-konvoy-tool[data-tool="drone"].on{background:#45c4cc;box-shadow:0 0 0 3px rgba(69,196,204,.3)}',
    '.rbg-konvoy-tool[data-tool="escort"].on{background:#66b86b;box-shadow:0 0 0 3px rgba(102,184,107,.3)}',
    '.rbg-konvoy-tool:disabled{opacity:.38;cursor:default;transform:none}',
    '.rbg-konvoy-est{flex:1 1 auto;min-width:0;font:600 12px/1.4 ' + FC + ';letter-spacing:.06em;color:#a8a091;padding:0 4px}',
    '.rbg-konvoy-est div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rbg-konvoy-est b{color:#f2ebd9;font-weight:700}',
    '.rbg-konvoy-est b.r{color:#ff6b5a}.rbg-konvoy-est b.v{color:#f1ad2a;font:400 15px/1 ' + FD + ';letter-spacing:.03em}',
    '.rbg-konvoy-go{flex:0 0 auto;height:48px;padding:0 18px;border:0;border-radius:6px;background:#41403d;color:#a8a091;font:400 18px/1 ' + FD + ';letter-spacing:.05em;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .25s,color .25s}',
    '.rbg-konvoy-go svg{width:22px;height:22px}.rbg-konvoy-go.ready{background:#f1ad2a;color:#201d1b;animation:rbg-konvoy-pulse 1.4s infinite}',
    '.rbg-konvoy-cargo{position:absolute;left:50%;bottom:12px;display:flex;align-items:center;gap:10px;background:rgba(25,24,23,.93);border:1px solid rgba(242,230,199,.14);border-radius:8px;padding:9px 14px;box-shadow:0 10px 26px rgba(0,0,0,.5);transform:translate(-50%,calc(100% + 20px));opacity:0;transition:transform .45s ' + EZ + ',opacity .45s;pointer-events:none}',
    '.rbg-konvoy-cargo.show{transform:translate(-50%,0);opacity:1}.rbg-konvoy-cargo.hit{animation:rbg-konvoy-shake .45s}',
    '.rbg-konvoy-cargo .rbg-konvoy-ic{width:20px;height:20px;margin:0;color:#f1ad2a}.rbg-konvoy-cargo .l{font:700 12px/1 ' + FC + ';letter-spacing:.1em;color:#a8a091}',
    '.rbg-konvoy-cbar{width:130px;height:9px;border-radius:5px;background:rgba(242,230,199,.12);overflow:hidden}',
    '.rbg-konvoy-cbar i{display:block;height:100%;width:100%;background:#66b86b;border-radius:5px;transition:width .5s ' + EZ + ',background .4s}',
    '.rbg-konvoy-cval{font:400 20px/1 ' + FD + ';min-width:50px;text-align:right}',
    '.rbg-konvoy-banner{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;opacity:0;white-space:nowrap}',
    '.rbg-konvoy-banner b{display:block;font:400 46px/1 ' + FD + ';letter-spacing:.03em;color:#f1ad2a;text-shadow:0 3px 0 #201d1b,0 0 30px rgba(0,0,0,.7)}',
    '.rbg-konvoy-banner span{display:inline-block;margin-top:8px;padding:5px 10px;border-radius:3px;background:rgba(32,29,27,.92);color:#ece4d0;font:700 14px/1 ' + FC + ';letter-spacing:.12em}',
    '.rbg-konvoy-banner span:empty{display:none}.rbg-konvoy-banner.bad b{color:#ff5a47}.rbg-konvoy-banner.good b{color:#86d68b}',
    '.rbg-konvoy-banner.go{animation:rbg-konvoy-ban 2.1s ' + EZ + ' both}',
    '.rbg-konvoy-card{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(12,11,10,.55);opacity:0;visibility:hidden;transition:opacity .35s,visibility 0s .35s}',
    '.rbg-konvoy-card.show{opacity:1;visibility:visible;transition:opacity .35s}',
    '.rbg-konvoy-paper{position:relative;width:100%;max-width:440px;max-height:100%;overflow-y:auto;overscroll-behavior:contain;background-color:#ece4d0;color:#201d1b;border-radius:6px;padding:22px 24px 20px;box-shadow:0 20px 60px rgba(0,0,0,.65),inset 0 0 0 1px rgba(32,29,27,.08);background-image:repeating-linear-gradient(0deg,rgba(32,29,27,0) 0,rgba(32,29,27,0) 25px,rgba(32,29,27,.05) 25px,rgba(32,29,27,.05) 26px);animation:rbg-konvoy-in .5s ' + EZ + ' both}',
    '.rbg-konvoy-paper:before{content:"";position:absolute;left:50%;top:0;width:96px;height:16px;margin-left:-48px;background:rgba(241,173,42,.55);transform:rotate(-2deg)}',
    '.rbg-konvoy-k{font:700 12px/1.25 ' + FC + ';letter-spacing:.1em;color:#61594f}',
    '.rbg-konvoy-h{font:400 38px/1 ' + FD + ';letter-spacing:.01em;margin:8px 0 10px}',
    '.rbg-konvoy-p{font:500 15px/1.4 ' + FB + ';margin:0 0 12px;color:#3a342e}',
    '.rbg-konvoy-how{list-style:none;margin:0 0 10px;padding:0}',
    '.rbg-konvoy-how li{position:relative;padding:7px 0 7px 36px;font:500 14px/1.35 ' + FB + ';border-top:1px dashed rgba(32,29,27,.2)}',
    '.rbg-konvoy-how li b{position:absolute;left:0;top:7px;width:26px;height:26px;border-radius:50%;background:#201d1b;color:#f1ad2a;font:400 14px/26px ' + FD + ';text-align:center}',
    '.rbg-konvoy-best{font:700 13px/1.2 ' + FC + ';letter-spacing:.1em;color:#61594f;margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.rbg-konvoy-best b{font:400 20px/1 ' + FD + ';color:#201d1b;letter-spacing:.02em}',
    '.rbg-konvoy-nb{display:inline-block;border:2px solid #b4362a;border-radius:3px;color:#b4362a;padding:3px 8px;font:400 15px/1 ' + FD + ';letter-spacing:.06em;animation:rbg-konvoy-stamp .5s 1.1s ' + EZ + ' both}',
    '.rbg-konvoy-btn{display:block;width:100%;min-height:52px;margin-top:16px;border:0;border-radius:6px;background:#201d1b;color:#f1ad2a;font:400 22px/1 ' + FD + ';letter-spacing:.06em;cursor:pointer;box-shadow:0 4px 0 #000;transition:background .2s,transform .1s,box-shadow .1s}',
    '.rbg-konvoy-btn:hover{background:#33312f}.rbg-konvoy-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #000}.rbg-konvoy-btn:disabled{opacity:.55;cursor:default;transform:none}',
    '.rbg-konvoy-stamp{position:absolute;right:18px;top:40px;border:3px solid currentColor;border-radius:4px;padding:5px 9px;font:400 17px/1 ' + FD + ';letter-spacing:.06em;transform:rotate(-9deg);animation:rbg-konvoy-stamp .5s .35s ' + EZ + ' both;pointer-events:none}',
    '.rbg-konvoy-big{font:400 64px/1 ' + FD + ';letter-spacing:.01em;margin:10px 0 2px}',
    '.rbg-konvoy-paper .good{color:#3f8a45}.rbg-konvoy-paper .mid{color:#b37a1a}.rbg-konvoy-paper .bad{color:#b4362a}',
    '.rbg-konvoy-rows{margin-top:10px}',
    '.rbg-konvoy-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px dashed rgba(32,29,27,.2);font:600 14px/1.2 ' + FC + ';letter-spacing:.05em}',
    '.rbg-konvoy-row span:first-child{color:#61594f}.rbg-konvoy-row span:last-child{text-align:right}.rbg-konvoy-row i{font-style:normal;color:#8a7f70}',
    '.rbg-konvoy-row.tot{font:400 18px/1.1 ' + FD + ';letter-spacing:.03em;border-top:2px solid #201d1b;padding-top:8px}.rbg-konvoy-row.tot span:first-child{color:#201d1b}',
    '.rbg-konvoy-note{font:400 19px/1.1 ' + FS + ';color:#b4362a;margin-top:10px}',
    '.rbg-konvoy-stars{display:flex;gap:6px;margin:4px 0 10px}.rbg-konvoy-star{width:38px;height:38px;color:rgba(32,29,27,.18)}.rbg-konvoy-star svg{width:100%;height:100%;display:block}',
    '.rbg-konvoy-star.on{color:#f1ad2a;filter:drop-shadow(0 2px 0 #b37a1a);animation:rbg-konvoy-star .55s ' + EZ + ' both}',
    '.rbg-konvoy-srow{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px dashed rgba(32,29,27,.2);font:700 14px/1.2 ' + FC + ';letter-spacing:.06em;animation:rbg-konvoy-in .4s ' + EZ + ' both}',
    '.rbg-konvoy-srow .rbg-konvoy-ic{margin:0}.rbg-konvoy-srow .nm{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rbg-konvoy-srow .pc{font:400 20px/1 ' + FD + '}',
    '.rbg-konvoy-sc{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:6px;border-top:2px solid #201d1b;padding-top:10px}',
    '.rbg-konvoy-sc b{font:400 40px/1 ' + FD + ';letter-spacing:.01em}',
    '@keyframes rbg-konvoy-in{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}',
    '@keyframes rbg-konvoy-drop{0%{opacity:0;transform:translateY(-130%) rotate(-5deg)}70%{opacity:1;transform:translateY(4%) rotate(.4deg)}100%{transform:rotate(-.6deg)}}',
    '@keyframes rbg-konvoy-pulse{0%,100%{box-shadow:0 0 0 0 rgba(241,173,42,.6)}50%{box-shadow:0 0 0 8px rgba(241,173,42,0)}}',
    '@keyframes rbg-konvoy-blink{0%,100%{opacity:1}50%{opacity:.35}}',
    '@keyframes rbg-konvoy-ban{0%{opacity:0;transform:translate(-50%,-50%) scale(1.9) rotate(-5deg)}12%{opacity:1;transform:translate(-50%,-50%) scale(.95) rotate(-2deg)}20%{transform:translate(-50%,-50%) scale(1) rotate(-2deg)}80%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-2deg)}100%{opacity:0;transform:translate(-50%,-64%) scale(1) rotate(-2deg)}}',
    '@keyframes rbg-konvoy-stamp{0%{opacity:0;transform:scale(2.3) rotate(-15deg)}60%{opacity:.95;transform:scale(.93) rotate(-8deg)}100%{opacity:.88;transform:scale(1) rotate(-9deg)}}',
    '@keyframes rbg-konvoy-star{0%{opacity:0;transform:scale(0) rotate(-45deg)}70%{opacity:1;transform:scale(1.25) rotate(8deg)}100%{opacity:1;transform:none}}',
    '@keyframes rbg-konvoy-shake{0%,100%{transform:translate(-50%,0)}20%{transform:translate(calc(-50% - 6px),0)}40%{transform:translate(calc(-50% + 6px),0)}60%{transform:translate(calc(-50% - 4px),0)}80%{transform:translate(calc(-50% + 3px),0)}}',
    '.rbg-konvoy-narrow .rbg-konvoy-top{left:8px;right:8px;top:8px;gap:6px}',
    '.rbg-konvoy-narrow .rbg-konvoy-mission{max-width:none;flex:1 1 auto;padding:7px 10px 6px}.rbg-konvoy-narrow .rbg-konvoy-mt{font-size:17px}.rbg-konvoy-narrow .rbg-konvoy-mn{font-size:15px}',
    '.rbg-konvoy-narrow .rbg-konvoy-score{padding:6px 8px}.rbg-konvoy-narrow .rbg-konvoy-pips i{width:12px}',
    '.rbg-konvoy-narrow .rbg-konvoy-pts{font-size:10px}.rbg-konvoy-narrow .rbg-konvoy-pts b{display:block;font-size:17px;margin:3px 0 0}',
    '.rbg-konvoy-narrow .rbg-konvoy-bar{left:8px;right:8px;bottom:8px;gap:5px;padding:5px}',
    '.rbg-konvoy-narrow .rbg-konvoy-tool{min-width:0;padding:0 8px;gap:4px}.rbg-konvoy-narrow .rbg-konvoy-tool .lb{display:none}',
    '.rbg-konvoy-narrow .rbg-konvoy-est{font-size:11px;padding:0 2px}.rbg-konvoy-narrow .rbg-konvoy-est b.v{font-size:13px}',
    '.rbg-konvoy-narrow .rbg-konvoy-go{padding:0 12px;font-size:15px}.rbg-konvoy-narrow .rbg-konvoy-go svg{display:none}',
    '.rbg-konvoy-narrow .rbg-konvoy-hint{bottom:76px;font-size:12px}.rbg-konvoy-narrow .rbg-konvoy-cbar{width:84px}',
    '.rbg-konvoy-narrow .rbg-konvoy-banner b{font-size:30px}.rbg-konvoy-narrow .rbg-konvoy-banner span{font-size:12px}',
    '.rbg-konvoy-narrow .rbg-konvoy-paper{padding:18px 16px 16px}.rbg-konvoy-narrow .rbg-konvoy-h{font-size:30px}',
    '.rbg-konvoy-narrow .rbg-konvoy-p{font-size:14px}.rbg-konvoy-narrow .rbg-konvoy-how li{font-size:13px}',
    '.rbg-konvoy-narrow .rbg-konvoy-big{font-size:52px}.rbg-konvoy-narrow .rbg-konvoy-stamp{top:34px;right:12px;font-size:14px}',
    '.rbg-konvoy-tight .rbg-konvoy-sub{display:none}.rbg-konvoy-tight .rbg-konvoy-star{width:30px;height:30px}.rbg-konvoy-tight .rbg-konvoy-srow,.rbg-konvoy-tight .rbg-konvoy-row{padding:5px 0}',
    '.rbg-konvoy-tight .rbg-konvoy-sc b{font-size:32px}.rbg-konvoy-tight .rbg-konvoy-big{font-size:48px;margin:6px 0 0}.rbg-konvoy-tight .rbg-konvoy-btn{margin-top:12px}',
    '.rbg-konvoy-short .rbg-konvoy-p{display:none}.rbg-konvoy-short .rbg-konvoy-how li{padding-top:5px;padding-bottom:5px}.rbg-konvoy-short .rbg-konvoy-btn{margin-top:10px}'
  ].join("");

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeBack(t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function colCls(v) { return v >= 70 ? "good" : v >= 50 ? "mid" : "bad"; }
  function ambP(r) { var a = Math.floor(r); return a >= 3 ? AMB[3] : AMB[a] + (AMB[a + 1] - AMB[a]) * (r - a); }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r); g.lineTo(x + r, y + h);
    g.arcTo(x, y + h, x, y + h - r, r); g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
  }
  function inPoly(p, x, y) {
    var c = false;
    for (var i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      var xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function softSprite(size, stops) {
    var c = document.createElement("canvas"); c.width = c.height = size;
    var g = c.getContext("2d"), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (var i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }
  /* rota: ilçe merkezlerinden geçen yumuşak Hermite eğrisi, yay uzunluğu tablosuyla */
  function buildPath(pts) {
    var n = pts.length, xs = [], ys = [], SEG = 18, TN = 0.32, i, k;
    for (i = 0; i < n - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      var m1x = (p2[0] - p0[0]) * TN, m1y = (p2[1] - p0[1]) * TN, m2x = (p3[0] - p1[0]) * TN, m2y = (p3[1] - p1[1]) * TN;
      for (k = 0; k < SEG; k++) {
        var t = k / SEG, t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
        xs.push(h00 * p1[0] + h10 * m1x + h01 * p2[0] + h11 * m2x);
        ys.push(h00 * p1[1] + h10 * m1y + h01 * p2[1] + h11 * m2y);
      }
    }
    xs.push(pts[n - 1][0]); ys.push(pts[n - 1][1]);
    var cum = [0], p2d = new Path2D();
    p2d.moveTo(xs[0], ys[0]);
    for (i = 1; i < xs.length; i++) { cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1])); p2d.lineTo(xs[i], ys[i]); }
    return { x: xs, y: ys, cum: cum, seg: SEG, p2d: p2d, len: cum[cum.length - 1] };
  }
  function posAt(p, d, out) {
    var cum = p.cum, n = cum.length, lo = 0, hi = n - 1;
    if (d >= cum[n - 1]) lo = n - 2;
    else if (d > 0) { while (hi - lo > 1) { var m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; } }
    var seg = (cum[lo + 1] - cum[lo]) || 1, f = clamp((d - cum[lo]) / seg, 0, 1);
    out.x = p.x[lo] + (p.x[lo + 1] - p.x[lo]) * f; out.y = p.y[lo] + (p.y[lo + 1] - p.y[lo]) * f;
    out.a = Math.atan2(p.y[lo + 1] - p.y[lo], p.x[lo + 1] - p.x[lo]);
    return out;
  }

  window.RBGames.konvoy = {
    title: { tr: "Yardım Koridoru", en: "Aid Corridor" },
    mount: function (el, ctx) {
      var L = ctx.lang === "en" ? "en" : "tr", S = STR[L], LOC = L === "tr" ? "tr-TR" : "en-US";
      var destroyed = false, paused = false, raf = 0, last = 0, time = 0, needLayout = false;
      var W = 1, H = 1, dpr = 1, K = 0.5, mw = MW * K, mh = MH * K, rt = 0, rb = 0, narrow = false, camInit = false;
      var cam = { x: 0, y: 0, tx: 0, ty: 0 }, camHold = 0, vox = 0, voy = 0;
      var D = [], N = 0, paths = [], polys = [], distPort = [], dist10 = [];
      var img = null, ready = false, loadFail = false;
      var phase = "intro", ses = null, plan = null, drive = null, scanFx = null;
      var timers = [], tweens = [], listeners = [], ro = null;
      var hover = -1, tapF = { id: -1, t: 0, bad: false }, hintTemp = 0, lastVoice = -99;
      var shake = 0, flash = 0, flashCol = "#fff", P1 = { x: 0, y: 0, a: 0 }, DASH = [10, 8];
      var ptr = { id: null, sx: 0, sy: 0, cx: 0, cy: 0, moved: false };

      function up(t) { t = String(t); try { return t.toLocaleUpperCase(LOC); } catch (e) { return t.toUpperCase(); } }
      function fmt(n) { n = Math.round(n); try { return n.toLocaleString(LOC); } catch (e) { return String(n); } }
      function pct(n) { n = Math.round(n); return L === "tr" ? "%" + n : n + "%"; }
      function sfx(n, v) { try { if (ctx.sfx) ctx.sfx(n, v); } catch (e) { /* ses yoksa sessiz */ } }
      function voice(k) { lastVoice = time; try { if (ctx.voice) ctx.voice(k); } catch (e) { /* sessiz */ } }
      function later(t, f) { timers.push({ t: t, f: f }); }
      function on(t, ev, f, o) { t.addEventListener(ev, f, o); listeners.push([t, ev, f, o]); }

      // ---------- DOM ----------
      var root = document.createElement("div");
      root.className = "rbg-konvoy";
      root.innerHTML = "<style>" + CSS + "</style>" +
        '<canvas class="rbg-konvoy-cv"></canvas><div class="rbg-konvoy-vig"></div>' +
        '<div class="rbg-konvoy-top off"><div class="rbg-konvoy-mission"><div class="rbg-konvoy-mk"></div><div class="rbg-konvoy-mt"></div><div class="rbg-konvoy-mn"></div></div>' +
        '<div class="rbg-konvoy-score"><div class="rbg-konvoy-pips"></div><div class="rbg-konvoy-pts"></div></div></div>' +
        '<div class="rbg-konvoy-hint"></div>' +
        '<div class="rbg-konvoy-bar off">' +
        '<button type="button" class="rbg-konvoy-tool" data-tool="drone" title="' + S.droneT + '" aria-label="' + S.droneT + '">' + ICON.drone + '<span class="lb">' + S.drone + '</span><span class="n">2</span></button>' +
        '<button type="button" class="rbg-konvoy-tool" data-tool="escort" title="' + S.escortT + '" aria-label="' + S.escortT + '">' + ICON.escort + '<span class="lb">' + S.escort + '</span><span class="n">2</span></button>' +
        '<div class="rbg-konvoy-est"></div>' +
        '<button type="button" class="rbg-konvoy-go">' + ICON.truck + '<span>' + S.go + '</span></button></div>' +
        '<div class="rbg-konvoy-cargo"><span class="rbg-konvoy-ic"></span><span class="l">' + S.cargo + '</span><div class="rbg-konvoy-cbar"><i></i></div><span class="rbg-konvoy-cval"></span></div>' +
        '<div class="rbg-konvoy-banner"><b></b><span></span></div><div class="rbg-konvoy-card"></div>';
      el.appendChild(root);
      function q(sel) { return root.querySelector(sel); }
      var cv = q(".rbg-konvoy-cv"), cx = cv.getContext("2d");
      var elTop = q(".rbg-konvoy-top"), elMission = q(".rbg-konvoy-mission"), elMk = q(".rbg-konvoy-mk"), elMt = q(".rbg-konvoy-mt"),
        elMn = q(".rbg-konvoy-mn"), elPips = q(".rbg-konvoy-pips"), elPts = q(".rbg-konvoy-pts"), elHint = q(".rbg-konvoy-hint"),
        elBar = q(".rbg-konvoy-bar"), btnDrone = q('[data-tool="drone"]'), btnEsc = q('[data-tool="escort"]'), elEst = q(".rbg-konvoy-est"),
        btnGo = q(".rbg-konvoy-go"), elCargo = q(".rbg-konvoy-cargo"), elCargoIc = q(".rbg-konvoy-cargo .rbg-konvoy-ic"),
        elCargoBar = q(".rbg-konvoy-cbar i"), elCargoVal = q(".rbg-konvoy-cval"), elBanner = q(".rbg-konvoy-banner"),
        elBanT = q(".rbg-konvoy-banner b"), elBanS = q(".rbg-konvoy-banner span"), elCard = q(".rbg-konvoy-card");
      var stat = document.createElement("canvas"), sg = stat.getContext("2d");   // harita + sınırlar + etiketler (yalnız boyut değişince)

      // ---------- efekt havuzları ----------
      var SPR = {
        smoke: softSprite(64, [[0, "rgba(58,52,48,0.85)"], [0.6, "rgba(58,52,48,0.4)"], [1, "rgba(58,52,48,0)"]]),
        dust: softSprite(48, [[0, "rgba(196,176,136,0.55)"], [1, "rgba(196,176,136,0)"]]),
        fire: softSprite(64, [[0, "rgba(255,244,214,1)"], [0.35, "rgba(255,170,60,0.9)"], [0.7, "rgba(214,70,20,0.35)"], [1, "rgba(120,20,0,0)"]]),
        spark: softSprite(24, [[0, "rgba(255,255,230,1)"], [0.4, "rgba(255,210,120,0.9)"], [1, "rgba(255,150,40,0)"]]),
        glow: softSprite(48, [[0, "rgba(255,240,190,1)"], [0.35, "rgba(241,173,42,0.75)"], [1, "rgba(241,173,42,0)"]]),
        green: softSprite(48, [[0, "rgba(230,255,220,1)"], [0.4, "rgba(102,184,107,0.7)"], [1, "rgba(102,184,107,0)"]])
      };
      var SPR_BY = [SPR.smoke, SPR.dust, SPR.fire, SPR.spark, SPR.glow, SPR.green];   // 6 = enkaz (kare)
      var PART = [], pIdx = 0, RINGS = [], TRACERS = [], FLOATS = [], i0;
      for (i0 = 0; i0 < 340; i0++) PART.push({ on: false, t: 0, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, grow: 0, g: 0, drag: 0, tw: 0 });
      for (i0 = 0; i0 < 16; i0++) RINGS.push({ on: false, x: 0, y: 0, r0: 0, r1: 0, age: 0, life: 1, col: "#fff", w: 1 });
      for (i0 = 0; i0 < 16; i0++) TRACERS.push({ on: false, x1: 0, y1: 0, x2: 0, y2: 0, age: 0, life: 1 });
      for (i0 = 0; i0 < 10; i0++) FLOATS.push({ on: false, x: 0, y: 0, txt: "", col: "#fff", age: 0, life: 1, big: false });
      function spawn(t, x, y, vx, vy, life, size, grow, g, drag) {
        var p = PART[pIdx]; pIdx = (pIdx + 1) % PART.length;
        p.on = true; p.t = t; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.age = 0; p.life = life; p.size = size;
        p.grow = grow || 0; p.g = g || 0; p.drag = drag || 0; p.tw = Math.random() * TAU;
      }
      function pick(pool) { for (var i = 0; i < pool.length; i++) if (!pool[i].on) return pool[i]; return pool[0]; }
      function ring(x, y, r0, r1, life, col, w, delay) {
        var r = pick(RINGS); r.on = true; r.x = x; r.y = y; r.r0 = r0; r.r1 = r1; r.life = life; r.col = col; r.w = w; r.age = -(delay || 0);
      }
      function tracer(x1, y1, x2, y2) { var t = pick(TRACERS); t.on = true; t.x1 = x1; t.y1 = y1; t.x2 = x2; t.y2 = y2; t.age = 0; t.life = 0.18; }
      function floatText(x, y, txt, col, big) {
        var f = pick(FLOATS); f.on = true; f.x = x; f.y = y; f.txt = txt; f.col = col; f.age = 0; f.life = big ? 2 : 1.4; f.big = !!big;
      }
      function boom(x, y) {
        var i, a, v;
        shake = Math.max(shake, 13); flash = 0.5; flashCol = "#ffb46a";
        ring(x, y, 4, 66, 0.5, "#ffd27a", 3, 0); ring(x, y, 2, 38, 0.35, "#ffffff", 2, 0);
        for (i = 0; i < 16; i++) { a = rnd(0, TAU); v = rnd(20, 110); spawn(2, x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.35, 0.8), rnd(14, 30), 30, 0, 2); }
        for (i = 0; i < 14; i++) { a = rnd(0, TAU); v = rnd(8, 40); spawn(0, x, y, Math.cos(a) * v, Math.sin(a) * v - rnd(8, 26), rnd(1.6, 2.8), rnd(14, 24), 20, 0, 0.6); }
        for (i = 0; i < 18; i++) { a = rnd(0, TAU); v = rnd(120, 320); spawn(3, x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.25, 0.6), rnd(4, 7), -4, 160, 2.5); }
        for (i = 0; i < 10; i++) { a = rnd(0, TAU); v = rnd(60, 170); spawn(6, x, y, Math.cos(a) * v, Math.sin(a) * v - rnd(40, 120), rnd(0.5, 0.9), rnd(2, 3.5), 0, 380, 0.8); }
      }
      function muzzle(x, y) {
        spawn(2, x, y, 0, 0, rnd(0.06, 0.12), rnd(9, 14), 20, 0, 0);
        for (var i = 0; i < 3; i++) { var a = rnd(0, TAU), v = rnd(80, 200); spawn(3, x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.12, 0.25), rnd(3, 5), 0, 0, 3); }
      }
      function aidDrop(x, y) {
        ring(x, y, 6, 72, 0.9, AMBER, 3, 0); ring(x, y, 6, 54, 0.9, GOOD, 2.5, 0.25); ring(x, y, 4, 36, 0.8, CREAM, 2, 0.5);
        flash = 0.18; flashCol = "#fff3c9";
        for (var i = 0; i < 38; i++) {
          var a = rnd(0, TAU), v = rnd(15, 70);
          spawn(i % 3 === 0 ? 5 : 4, x + rnd(-10, 10) / K, y + rnd(-10, 10) / K, Math.cos(a) * v, Math.sin(a) * v - rnd(15, 45), rnd(0.9, 1.8), rnd(6, 13), -2, -10, 1.2);
        }
      }

      // ---------- yerleşim ----------
      function clampX(x) { return mw <= W ? Math.round((W - mw) / 2) : clamp(x, W - mw, 0); }
      function clampY(y) { var ah = H - rt - rb; return mh <= ah ? Math.round(rt + (ah - mh) / 2) : clamp(y, H - rb - mh, rt); }
      function focus(mx, my, instant) {
        cam.tx = clampX(W / 2 - mx * K); cam.ty = clampY(H / 2 - my * K);
        if (instant) { cam.x = cam.tx; cam.y = cam.ty; }
      }
      function layout() {
        needLayout = false;
        var nw = Math.max(1, root.clientWidth), nh = Math.max(1, root.clientHeight);
        var mcx = camInit ? (W / 2 - cam.x) / K : MW / 2, mcy = camInit ? (H / 2 - cam.y) / K : MH / 2;
        W = nw; H = nh; dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
        narrow = W < 600;
        root.classList.toggle("rbg-konvoy-narrow", narrow);
        root.classList.toggle("rbg-konvoy-short", H < 440);
        root.classList.toggle("rbg-konvoy-tight", H < 540);
        var portrait = W / H < 1.25;
        rt = portrait ? (narrow ? 76 : 86) : 0; rb = portrait ? (narrow ? 72 : 76) : 0;
        var ah = Math.max(60, H - rt - rb);
        K = Math.max(Math.min(W / MW, ah / MH), Math.min(ah / MH, W * 1.4 / MW));
        mw = MW * K; mh = MH * K;
        cam.x = cam.tx = clampX(W / 2 - mcx * K); cam.y = cam.ty = clampY(H / 2 - mcy * K);
        camInit = true;
        renderStatic();
        if (ses && plan) updateHUD();
      }
      function label(g, x, y, text, bg, fg, fs) {
        g.font = "700 " + fs + "px 'Barlow Condensed','Arial Narrow',sans-serif";
        if ("letterSpacing" in g) g.letterSpacing = (fs * 0.08).toFixed(1) + "px";
        var w = g.measureText(text).width + 12, h = fs + 7;
        rr(g, x - w / 2, y - h / 2, w, h, 3); g.fillStyle = bg; g.fill();
        g.fillStyle = fg; g.fillText(text, x, y + 0.5);
      }
      function renderStatic() {
        if (!ready) return;
        var w = Math.max(1, Math.round(mw * dpr)), h = Math.max(1, Math.round(mh * dpr)), g = sg, i;
        if (stat.width !== w || stat.height !== h) { stat.width = w; stat.height = h; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
        g.imageSmoothingEnabled = true; try { g.imageSmoothingQuality = "high"; } catch (e) { /* eski tarayıcı */ }
        g.drawImage(img, 0, 0, w, h);
        g.fillStyle = "rgba(20,17,14,0.2)"; g.fillRect(0, 0, w, h);
        var k = K * dpr;
        g.setTransform(k, 0, 0, k, 0, 0);
        // isyancı karargâhı: kırmızı tarama
        var p = polys[HQ], x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
        g.save(); g.clip(paths[HQ]);
        g.fillStyle = "rgba(110,18,12,0.32)"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
        g.strokeStyle = "rgba(219,71,56,0.6)"; g.lineWidth = 2.2 / K; g.beginPath();
        for (var x = x0 - (y1 - y0); x < x1; x += 10 / K) { g.moveTo(x, y0); g.lineTo(x + (y1 - y0), y1); }
        g.stroke(); g.restore();
        // krem noktalı sınırlar
        g.lineJoin = "round"; g.lineCap = "round"; g.setLineDash(EMPTY);
        g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 3 / K;
        for (i = 0; i < N; i++) g.stroke(paths[i]);
        g.setLineDash([0.1 / K, 5 / K]); g.lineWidth = 2 / K;
        for (i = 0; i < N; i++) { g.strokeStyle = i === HQ ? "rgba(255,120,100,0.85)" : "rgba(236,228,208,0.72)"; g.stroke(paths[i]); }
        g.setLineDash(EMPTY);
        // ilçe adları (küçük yoğun büyük harf etiketler)
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.textAlign = "center"; g.textBaseline = "middle";
        var fs = clamp(Math.round(8 + K * 8), 10, 13);
        for (i = 0; i < N; i++) {
          var c = D[i].c, X = c[0] * K, Y = c[1] * K - 26;
          if (i === PORT) label(g, X, Y, up(D[i].name) + " · " + S.portTag, "rgba(241,173,42,0.94)", INK, fs);
          else if (i === HQ) { label(g, X, Y, up(D[i].name), "rgba(170,34,24,0.94)", CREAM, fs); label(g, X, Y + fs + 8, S.hqTag, "rgba(32,10,8,0.85)", "#ff8f80", fs - 1); }
          else label(g, X, Y, up(D[i].name), "rgba(25,24,23,0.8)", CREAM, fs);
        }
        if ("letterSpacing" in g) g.letterSpacing = "0px";
      }

      // ---------- veri ----------
      function bfs(src, blocked) {
        var dist = [], qq = [src], i;
        for (i = 0; i < N; i++) dist.push(99);
        dist[src] = 0;
        while (qq.length) {
          var u = qq.shift(), nb = D[u].n;
          for (i = 0; i < nb.length; i++) { var v = nb[i]; if (v !== blocked && dist[v] > dist[u] + 1) { dist[v] = dist[u] + 1; qq.push(v); } }
        }
        return dist;
      }
      function setup(data, im) {
        D = []; paths = []; polys = [];
        data.districts.forEach(function (d) { D[d.id] = d; });
        N = D.length;
        for (var i = 0; i < N; i++) {
          paths.push(new Path2D(D[i].d));
          polys.push((D[i].d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number));
        }
        distPort = bfs(PORT, HQ); dist10 = bfs(HQ, -1);
        img = im; ready = true; loadFail = false;
        layout(); focus(1050, 760, true);
        introBtn();
      }
      function fontsReady() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        var p = Promise.all([document.fonts.load("700 12px 'Barlow Condensed'"), document.fonts.load("20px Anton")]).catch(function () {});
        return Promise.race([p, new Promise(function (res) { setTimeout(res, 1500); })]);
      }
      function load() {
        var small = Math.min(root.clientWidth || 9999, window.innerWidth || 9999) < 760;
        var src = ctx.assets + "img/map/kesra_gun" + (small ? "_k" : "") + ".webp";
        var pj = fetch(ctx.assets + "data/map_kesra.json").then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); });
        var pi = new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; });
        Promise.all([pj, pi, fontsReady()]).then(function (a) {
          if (destroyed) return;
          setup(a[0], a[1]);
          if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed) renderStatic(); });
        }, function () { if (destroyed) return; loadFail = true; introBtn(); });
      }

      // ---------- oturum ----------
      function cur() { return ses.conv[ses.idx]; }
      function cargo() { return CARGO[cur().cargo]; }
      function routeDone() { return plan && plan.route[plan.route.length - 1] === cur().dest; }
      function anyEsc() { for (var i = 0; i < N; i++) if (plan.esc[i]) return true; return false; }
      function genRisk() {
        for (var i = 0; i < N; i++) {
          if (i === PORT) { ses.risk[i] = 0; continue; }
          if (i === HQ) { ses.risk[i] = 3; continue; }
          var b = [3, 2.15, 1.35, 0.7, 0.3][Math.min(4, dist10[i])] + (ROLE_RISK[D[i].role] || 0);
          if (distPort[i] === 1) b -= 0.35;
          var r = clamp(Math.round(b + rnd(-0.9, 0.9)), 0, 3);
          if (dist10[i] === 1) r = Math.max(1, r);
          ses.risk[i] = r;
        }
      }
      /* isyancılar uyum sağlar: rastgele kayma, püskürtülen yerlerde geri çekilme, son rotanın çevresine yığınak */
      function adaptRisk(route, esc) {
        for (var i = 0; i < N; i++) {
          if (i === PORT || i === HQ) continue;
          var r = ses.risk[i], onR = route.indexOf(i) >= 0;
          if (Math.random() < 0.3) r += Math.random() < 0.5 ? -1 : 1;
          if (onR && esc[i]) r -= 1;
          else if (!onR && D[i].n.some(function (v) { return route.indexOf(v) >= 0; }) && Math.random() < 0.4) r += 1;
          if (dist10[i] === 1) r = Math.max(1, r);
          if (distPort[i] === 1) r = Math.min(2, r);
          ses.risk[i] = clamp(r, 0, 3);
        }
      }
      function pickDests() {
        var h2 = [], h3 = [], h4 = [], all = [], out = [], i;
        for (i = 0; i < N; i++) {
          if (i === PORT || i === HQ || distPort[i] >= 99) continue;
          var d = distPort[i];
          if (d === 2) h2.push(i); else if (d === 3) h3.push(i); else if (d >= 4) h4.push(i);
          if (d >= 2) all.push(i);
        }
        shuffle(h2); shuffle(h3); shuffle(h4);
        out.push(h2.pop());
        out.push(h3.length ? h3.pop() : h2.pop());
        out.push(h3.length ? h3.pop() : h4.length ? h4.pop() : h2.pop());
        out.push(h4.length && (Math.random() < 0.65 || !h3.length) ? h4.pop() : h3.length ? h3.pop() : h2.pop());
        for (i = 0; i < CONVOYS; i++) if (out[i] == null) out[i] = all[(Math.random() * all.length) | 0];
        return out;
      }
      function newSession() {
        timers.length = 0;
        ses = { idx: 0, score: 0, risk: [], known: {}, results: [], conv: [], escVoiced: false, ended: false, endRes: null };
        genRisk();
        var dests = pickDests(), cg = shuffle(CARGO_IDS.slice());
        for (var i = 0; i < CONVOYS; i++) ses.conv.push({ dest: dests[i], cargo: cg[i] });
      }
      function startConvoy() {
        phase = "plan"; drive = null; scanFx = null;
        var z = [], z2 = [];
        for (var i = 0; i < N; i++) { z.push(0); z2.push(0); }
        plan = { route: [PORT], esc: z, escFlash: z2, escLeft: 2, drones: 2, mode: "route", path: null };
        setHud(true); setBar(true); setCargo(false);
        updateHUD();
        elMission.classList.remove("in"); void elMission.offsetWidth; elMission.classList.add("in");
        var pc = D[PORT].c, dc = D[cur().dest].c;
        focus(lerp(pc[0], dc[0], 0.35), lerp(pc[1], dc[1], 0.35), false);
        sfx("olay", 0.5);
        if (ses.idx === 0) hint(S.hintRoute, "ok", 4.5); else hint(S.adapt, "err", 3.5);
      }

      // ---------- arayüz ----------
      function setHud(v) { elTop.classList.toggle("off", !v); if (!v) { setBar(false); setCargo(false); } }
      function setBar(v) { elBar.classList.toggle("off", !v); }
      function setCargo(v) { elCargo.classList.toggle("show", !!v); }
      function hint(text, kind, dur) { elHint.textContent = text; elHint.className = "rbg-konvoy-hint show" + (kind ? " " + kind : ""); hintTemp = dur || 2.2; }
      function restHint() {
        hintTemp = 0;
        if (phase === "plan" && plan.mode === "drone") { elHint.textContent = S.hintDrone; elHint.className = "rbg-konvoy-hint show scan"; }
        else if (phase === "plan" && plan.mode === "escort") { elHint.textContent = S.hintEscort; elHint.className = "rbg-konvoy-hint show esc"; }
        else elHint.className = "rbg-konvoy-hint";
      }
      function banner(t, kind, sub) {
        elBanT.textContent = t; elBanS.textContent = sub || "";
        elBanner.className = "rbg-konvoy-banner " + (kind || "");
        void elBanner.offsetWidth;
        elBanner.className = "rbg-konvoy-banner " + (kind || "") + " go";
      }
      function estimate() {
        var cg = cargo(), exp = 100, risk = 0, unk = 0, r = plan.route;
        for (var i = 1; i < r.length; i++) {
          var id = r[i], k = ses.known[id], rv;
          exp -= cg.seg;
          if (k && k.at === ses.idx) { rv = k.v; risk += rv; } else { unk++; rv = k ? (k.v + 1.3) / 2 : 1.3; }
          var p = ambP(rv) + ses.idx * 0.02;
          exp -= plan.esc[id] ? p * 5 : p * 35 * cg.amb;
        }
        return { segs: r.length - 1, risk: risk, unk: unk, exp: Math.max(0, exp) };
      }
      function updateHUD() {
        if (!ses) return;
        var cv0 = cur(), cg = CARGO[cv0.cargo], h = "", i;
        elMk.textContent = S.convoy + " " + (ses.idx + 1) + "/" + CONVOYS;
        elMt.innerHTML = '<span class="rbg-konvoy-ic rbg-konvoy-c-' + cv0.cargo + '">' + ICON[cv0.cargo] + "</span>" + esc(up(cg[L])) + " <i>→</i> " + esc(up(D[cv0.dest].name));
        elMn.textContent = cg.note[L];
        for (i = 0; i < CONVOYS; i++) { var r = ses.results[i]; h += '<i class="' + (r ? colCls(r.del) : i === ses.idx ? "cur" : "") + '"></i>'; }
        elPips.innerHTML = h;
        elPts.innerHTML = S.score + " <b>" + fmt(ses.score) + "</b>";
        if (!plan) return;
        var pl = phase === "plan";
        btnDrone.querySelector(".n").textContent = plan.drones;
        btnDrone.disabled = !pl || plan.drones <= 0 || !!scanFx;
        btnDrone.classList.toggle("on", pl && plan.mode === "drone");
        btnEsc.querySelector(".n").textContent = plan.escLeft;
        btnEsc.disabled = !pl || (plan.escLeft <= 0 && !anyEsc());
        btnEsc.classList.toggle("on", pl && plan.mode === "escort");
        if (plan.route.length < 2) elEst.innerHTML = "<div>" + (narrow ? S.estStartN : S.estStart) + "</div>";
        else {
          var e = estimate(), more = routeDone() ? "" : " …";
          elEst.innerHTML = narrow
            ? "<div><b>" + e.segs + "</b> " + S.stages + ' · <b class="r">●' + e.risk + "</b>" + (e.unk ? " <b>?" + e.unk + "</b>" : "") + "</div><div>" + S.estShort + ' <b class="v">~' + pct(e.exp) + "</b>" + more + "</div>"
            : "<div><b>" + e.segs + "</b> " + S.stages + " · " + S.knownRisk + ' <b class="r">●' + e.risk + "</b>" + (e.unk ? " · <b>" + e.unk + "</b> " + S.unknown : "") + "</div><div>" + S.estDel + ' <b class="v">~' + pct(e.exp) + "</b>" + more + "</div>";
        }
        btnGo.classList.toggle("ready", pl && routeDone() && !scanFx);
      }
      function updateCargo(hit) {
        var v = drive ? Math.max(0, Math.round(drive.cargo)) : 100;
        elCargoBar.style.width = v + "%";
        elCargoBar.style.background = v >= 70 ? GOOD : v >= 50 ? AMBER : BAD;
        elCargoVal.textContent = pct(v);
        if (hit) { elCargo.classList.remove("hit"); void elCargo.offsetWidth; elCargo.classList.add("hit"); }
      }
      function showCard(html) {
        tweens.length = 0;
        elCard.innerHTML = '<div class="rbg-konvoy-paper">' + html + "</div>";
        elCard.classList.add("show");
        var cnt = elCard.querySelectorAll("[data-count]");
        for (var i = 0; i < cnt.length; i++) {
          tweens.push({ el: cnt[i], to: +cnt[i].getAttribute("data-count"), t: 0, d: 0.3, dur: 1.0, f: cnt[i].getAttribute("data-fmt") === "pct" ? pct : fmt });
        }
      }
      function hideCard() { elCard.classList.remove("show"); tweens.length = 0; }
      function introBtn() {
        var b = elCard.querySelector('[data-act="start"],[data-act="retry"]');
        if (!b) return;
        if (ready) { b.disabled = false; b.setAttribute("data-act", "start"); b.textContent = S.start; }
        else if (loadFail) { b.disabled = false; b.setAttribute("data-act", "retry"); b.textContent = S.fail; }
        else { b.disabled = true; b.textContent = S.loading; }
      }
      function showIntro() {
        phase = "intro"; setHud(false);
        var best = ctx.best ? ctx.best() : 0, how = "";
        for (var i = 0; i < S.how.length; i++) how += "<li><b>" + (i + 1) + "</b>" + S.how[i] + "</li>";
        showCard('<div class="rbg-konvoy-k">' + S.kicker + '</div><div class="rbg-konvoy-h">' + up(S.title) + "</div>" +
          '<p class="rbg-konvoy-p">' + S.lead + '</p><ol class="rbg-konvoy-how">' + how + "</ol>" +
          '<div class="rbg-konvoy-best">' + S.best + " <b>" + (best > 0 ? fmt(best) : "—") + "</b></div>" +
          '<button type="button" class="rbg-konvoy-btn" data-act="start" disabled>' + S.loading + "</button>");
        introBtn();
      }
      function row(a, b, cls) { return '<div class="rbg-konvoy-row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><span>" + b + "</span></div>"; }
      function resultHTML(r, isLast) {
        var cg = CARGO[r.cargo], col = r.lost ? "bad" : colCls(r.del);
        var st = r.lost ? S.stLost : r.del >= 70 ? S.stFull : S.stPart;
        var amb = r.rep + r.hits === 0 ? S.none : (r.rep ? r.rep + " " + S.rep : "") + (r.rep && r.hits ? " · " : "") + (r.hits ? r.hits + " " + S.hit : "");
        return '<div class="rbg-konvoy-k">' + S.convoy + " " + (ses.idx + 1) + "/" + CONVOYS + " · " + esc(up(cg[L])) + " → " + esc(up(D[r.dest].name)) + "</div>" +
          '<div class="rbg-konvoy-stamp ' + col + '">' + st + "</div>" +
          '<div class="rbg-konvoy-big ' + col + '" data-count="' + r.del + '" data-fmt="pct">' + pct(0) + "</div>" +
          '<div class="rbg-konvoy-k">' + S.deliveredCargo + '</div><div class="rbg-konvoy-rows">' +
          row(S.rRoute, r.segs + " " + S.stages + (r.segs > r.shortest ? " <i>(" + S.shortest + " " + r.shortest + ")</i>" : "")) +
          row(S.rAmbush, amb) + row(S.rCargo, fmt(r.del * 10)) + row(S.rClean, r.clean ? "+150" : "—") + row(S.rShort, r.short ? "+100" : "—") +
          row(S.rTotal, "+" + fmt(r.pts), "tot") + row(S.rSum, fmt(ses.score)) + "</div>" +
          (isLast ? "" : '<div class="rbg-konvoy-note">' + S.adapt + "</div>") +
          '<button type="button" class="rbg-konvoy-btn" data-act="' + (isLast ? "report" : "next") + '">' + (isLast ? S.report : S.next) + " →</button>";
      }
      function showSummary() {
        phase = "summary"; setHud(false);
        var good = 0, sum = 0, i;
        for (i = 0; i < ses.results.length; i++) { sum += ses.results[i].del; if (ses.results[i].del >= 50) good++; }
        var won = good >= 3, avg = sum / CONVOYS, stars = avg >= 80 ? 3 : avg >= 60 ? 2 : avg >= 40 ? 1 : 0;
        if (!ses.ended) { ses.ended = true; try { ses.endRes = ctx.onEnd ? ctx.onEnd({ score: ses.score, won: won }) : null; } catch (e) { ses.endRes = null; } }
        var r = ses.endRes || {}, best = r.best != null ? r.best : Math.max(ses.score, ctx.best ? ctx.best() : 0);
        var st = "", rows = "";
        for (i = 0; i < 3; i++) st += '<span class="rbg-konvoy-star' + (i < stars ? " on" : "") + '" style="animation-delay:' + (0.35 + i * 0.22).toFixed(2) + 's">' + ICON.star + "</span>";
        for (i = 0; i < ses.results.length; i++) {
          var x = ses.results[i];
          rows += '<div class="rbg-konvoy-srow" style="animation-delay:' + (0.15 + i * 0.1).toFixed(2) + 's"><span class="rbg-konvoy-ic rbg-konvoy-c-' + x.cargo + '">' + ICON[x.cargo] +
            '</span><span class="nm">' + esc(up(CARGO[x.cargo][L])) + " → " + esc(up(D[x.dest].name)) + '</span><span class="pc ' + colCls(x.del) + '">' + pct(x.del) + "</span></div>";
        }
        showCard('<div class="rbg-konvoy-k">' + S.sumKicker + '</div><div class="rbg-konvoy-h">' + (won ? S.win : S.lose) + "</div>" +
          '<p class="rbg-konvoy-p rbg-konvoy-sub">' + (won ? S.winSub : S.loseSub) + '</p><div class="rbg-konvoy-stars">' + st + "</div>" + rows +
          '<div class="rbg-konvoy-sc"><span class="rbg-konvoy-k">' + S.total + '</span><b data-count="' + ses.score + '">0</b></div>' +
          '<div class="rbg-konvoy-best">' + S.best + " <b>" + fmt(best) + "</b>" + (r.newBest ? '<span class="rbg-konvoy-nb">' + S.newBest + "</span>" : "") + "</div>" +
          '<button type="button" class="rbg-konvoy-btn" data-act="again">' + S.again + "</button>");
        sfx(won ? "basarim" : "kotu", 0.7);
        if (won && stars === 3) later(0.7, function () { voice("zafer_1"); });
        if (r.newBest) later(1.15, function () { sfx("damga", 0.8); });
      }
      function act(a) {
        if (a === "start" && phase === "intro" && ready) { sfx("ui_onay"); hideCard(); newSession(); startConvoy(); }
        else if (a === "retry" && phase === "intro" && !ready) { loadFail = false; introBtn(); load(); }
        else if (a === "next" && phase === "result") { sfx("ui_onay"); hideCard(); adaptRisk(plan.route, plan.esc); ses.idx++; startConvoy(); }
        else if (a === "report" && phase === "result") { sfx("ui_onay"); showSummary(); }
        else if (a === "again" && phase === "summary") { sfx("ui_onay"); hideCard(); newSession(); startConvoy(); }
      }

      // ---------- planlama ----------
      function tapFx(id, bad) { tapF.id = id; tapF.t = time; tapF.bad = bad; }
      function bad(id, msg) { sfx("ui_hata", 0.5); if (id >= 0) tapFx(id, true); hint(msg, "err", 2.4); }
      function rebuildRoute() {
        var r = plan.route;
        for (var i = 0; i < N; i++) if (plan.esc[i] && r.indexOf(i) < 0) { plan.esc[i] = 0; plan.escLeft++; }
        plan.path = r.length > 1 ? buildPath(r.map(function (id) { return D[id].c; })) : null;
      }
      function nudge(id) {
        if (mw <= W) return;
        var X = cam.tx + D[id].c[0] * K;
        if (X < W * 0.22 || X > W * 0.78) cam.tx = clampX(W / 2 - D[id].c[0] * K);
      }
      function tapRoute(id) {
        var r = plan.route, end = r[r.length - 1], idx = r.indexOf(id), dest = cur().dest;
        if (idx >= 0) {
          if (r.length === 1) { hint(S.hintRoute, "ok", 2.5); tapFx(id, false); sfx("ui_tik", 0.4); return; }
          if (idx === r.length - 1) r.pop(); else r.length = idx + 1;
          sfx("ui_tik", 0.5); tapFx(id, false); rebuildRoute(); updateHUD();
          return;
        }
        if (id === HQ) return bad(id, S.errHQ);
        if (end === dest) return bad(id, S.errDone);
        if (D[end].n.indexOf(id) < 0) return bad(id, S.errAdj);
        r.push(id); rebuildRoute(); tapFx(id, false); nudge(id);
        if (id === dest) { sfx("ui_onay"); hint(S.routeDone, "ok", 3); ring(D[id].c[0], D[id].c[1], 8, 46, 0.7, AMBER, 3, 0); }
        else sfx("ui_tik", 0.6);
        updateHUD();
      }
      function tapEscort(id) {
        if (plan.esc[id]) { plan.esc[id] = 0; plan.escLeft++; sfx("ui_tik", 0.6); tapFx(id, false); updateHUD(); return; }
        if (plan.route.indexOf(id) <= 0) return bad(id, S.errEscRoute);
        if (plan.escLeft <= 0) return bad(id, S.errNoEsc);
        plan.esc[id] = time; plan.escLeft--;
        sfx("ui_onay", 0.6); ring(D[id].c[0], D[id].c[1] + 8 / K, 6, 34, 0.55, GOOD, 2.5, 0);
        if (!ses.escVoiced) { ses.escVoiced = true; voice("koruma_1"); }
        else if (time - lastVoice > 12 && Math.random() < 0.25) voice("koruma_1");
        if (plan.escLeft === 0) { plan.mode = "route"; restHint(); }
        updateHUD();
      }
      function tapDrone(id) {
        if (scanFx) return bad(id, S.errBusy);
        if (id === PORT) return bad(id, S.errPort);
        if (id === HQ) return bad(id, S.errHQScan);
        var k = ses.known[id];
        if (k && k.at === ses.idx) return bad(id, S.errScanned);
        plan.drones--; plan.mode = "route"; restHint();
        var a = D[PORT].c, b = D[id].c;
        scanFx = { id: id, stage: 0, t: 0, fly: clamp(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2200, 0.45, 0.95) };
        sfx("telsiz", 0.6); updateHUD();
      }
      function toolPress(t) {
        if (phase !== "plan") return;
        if (t === "drone") {
          if (plan.drones <= 0 || scanFx) { sfx("ui_hata", 0.4); return; }
          plan.mode = plan.mode === "drone" ? "route" : "drone";
        } else {
          if (plan.mode !== "escort" && plan.route.length < 2) { bad(-1, S.errEscFirst); return; }
          if (plan.escLeft <= 0 && !anyEsc()) return;
          plan.mode = plan.mode === "escort" ? "route" : "escort";
        }
        sfx("ui_tik", 0.6); restHint(); updateHUD();
      }
      function tap(px, py) {
        if (phase !== "plan") return;
        var id = pickAt(px, py);
        if (id < 0) return;
        if (plan.mode === "drone") tapDrone(id);
        else if (plan.mode === "escort") tapEscort(id);
        else tapRoute(id);
      }
      function pickAt(px, py) {
        if (!ready) return -1;
        var mx = (px - cam.x) / K, my = (py - cam.y) / K, i;
        if (mx < 0 || my < 0 || mx > MW || my > MH) return -1;
        for (i = 0; i < N; i++) if (inPoly(polys[i], mx, my)) return i;
        var best = -1, bd = (40 / K) * (40 / K);
        for (i = 0; i < N; i++) { var dx = D[i].c[0] - mx, dy = D[i].c[1] - my, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } }
        return best;
      }

      // ---------- harekât ----------
      function dispatch() {
        if (phase !== "plan") return;
        if (!routeDone()) { bad(-1, S.errNoRoute); return; }
        if (scanFx) { bad(-1, S.errBusy); return; }
        var r = plan.route, path = plan.path, ev = [], a0 = posAt(path, 2, P1).a;
        for (var i = 1; i < r.length; i++) ev.push({ id: r[i], at: path.cum[Math.min(path.cum.length - 1, Math.round((i - 1 + 0.6) * path.seg))] });
        drive = { path: path, s: 0, v: 0, V: 300 * cargo().spd, ev: ev, next: 0, cargo: 100, stall: 0, hits: 0, rep: 0, voiced: false,
          done: false, lost: false, dustT: 0, tr: [0, 1, 2].map(function () { return { x: D[PORT].c[0], y: D[PORT].c[1], a: a0, d: 0, sm: 0 }; }) };
        phase = "drive"; plan.mode = "route"; restHint();
        setBar(false); setCargo(true);
        elCargoIc.className = "rbg-konvoy-ic rbg-konvoy-c-" + cur().cargo; elCargoIc.innerHTML = ICON[cur().cargo];
        updateCargo(false); updateHUD();
        sfx("ui_onay"); voice("hareket_1");
        ring(D[PORT].c[0], D[PORT].c[1], 6, 40, 0.6, AMBER, 2.5, 0);
      }
      function firefight(id, x, y, nx, ny) {
        var ex = D[id].c[0], ey = D[id].c[1] + 8 / K;
        var ax = x + nx * 46 / K + rnd(-10, 10) / K, ay = y + ny * 46 / K + rnd(-10, 10) / K;
        plan.escFlash[id] = time;
        for (var i = 0; i < 8; i++) {
          (function (i) {
            later(i * 0.12, function () {
              var fromA = i % 2 === 0, sx = fromA ? ax + rnd(-6, 6) / K : ex, sy = fromA ? ay + rnd(-6, 6) / K : ey;
              muzzle(sx, sy); tracer(sx, sy, fromA ? x : ax, fromA ? y : ay);
              if (i === 5) { sfx("patlama2", 0.28); spawn(0, ax, ay, 0, -14, 1.4, 14, 16, 0, 0.5); }
            });
          })(i);
        }
      }
      function enterDistrict(e) {
        var d = drive, cg = cargo(), id = e.id, lead = d.tr[0];
        d.cargo -= cg.seg;
        var r = ses.risk[id];
        if (Math.random() < AMB[r] + ses.idx * 0.02) {
          ses.known[id] = { v: r, at: ses.idx, t: time };
          var side = Math.random() < 0.5 ? -1 : 1, nx = -Math.sin(lead.a) * side, ny = Math.cos(lead.a) * side;
          if (plan.esc[id]) {
            d.rep++; d.cargo -= 5; d.stall = 0.8;
            banner(S.repelled, "", up(D[id].name));
            firefight(id, lead.x, lead.y, nx, ny);
            sfx("patlama2", 0.5);
            floatText(lead.x, lead.y - 14 / K, "-" + pct(5), AMBER, false);
            updateCargo(false);
          } else {
            d.hits++;
            var loss = rnd(25, 45) * cg.amb, bx = lead.x + nx * 12 / K, by = lead.y + ny * 12 / K;
            d.cargo -= loss; d.stall = 1.1;
            boom(bx, by);
            banner(S.ambush, "bad", up(D[id].name));
            sfx("patlama1", 0.9);
            if (!d.voiced) { d.voiced = true; voice("konvoy_pusu_1"); }
            d.tr[d.hits === 1 ? 1 : d.hits === 2 ? 2 : 0].d = 1;
            floatText(bx, by - 16 / K, "-" + pct(loss), "#ff6b5a", true);
            updateCargo(true);
          }
        } else {
          if (plan.esc[id]) plan.escFlash[id] = time;
          updateCargo(false);
        }
        if (d.cargo <= 0) {
          d.cargo = 0; d.lost = true; updateCargo(false);
          for (var k = 0; k < 3; k++) d.tr[k].d = 1;
          var lx = lead.x, ly = lead.y;
          later(0.55, function () { boom(lx + 8 / K, ly - 6 / K); sfx("patlama1", 0.7); });
          later(1.4, function () { banner(S.lost, "bad", ""); sfx("kotu", 0.8); });
          later(3.3, finishConvoy);
        }
      }
      function arrive() {
        var d = drive, del = Math.max(0, Math.round(d.cargo)), c = D[cur().dest].c;
        d.done = true;
        aidDrop(c[0], c[1]);
        floatText(c[0], c[1] - 34 / K, pct(del), del >= 70 ? "#86d68b" : del >= 50 ? AMBER : "#ff6b5a", true);
        banner(S.arrived, del >= 70 ? "good" : del >= 50 ? "" : "bad", S.delivered + " " + pct(del));
        sfx(del >= 50 ? "iyi" : "kotu", 0.8);
        if (del >= 70) voice("konvoy_vardi_1");
        later(2.6, finishConvoy);
      }
      function finishConvoy() {
        if (phase !== "drive") return;
        var c0 = cur(), d = drive, del = d.lost ? 0 : Math.max(0, Math.round(d.cargo));
        var segs = plan.route.length - 1, shortest = distPort[c0.dest];
        var clean = !d.lost && d.hits === 0, short = !d.lost && segs <= shortest;
        var pts = del * 10 + (clean ? 150 : 0) + (short ? 100 : 0);
        ses.score += pts;
        var res = { cargo: c0.cargo, dest: c0.dest, del: del, hits: d.hits, rep: d.rep, segs: segs, shortest: shortest, clean: clean, short: short, pts: pts, lost: d.lost };
        ses.results.push(res);
        phase = "result"; setCargo(false); updateHUD();
        showCard(resultHTML(res, ses.idx >= CONVOYS - 1));
        later(0.5, function () { sfx("damga", 0.8); });
      }

      // ---------- güncelleme ----------
      function updateDrive(dt) {
        var d = drive, k;
        if (phase === "drive" && !d.done) {
          if (d.lost || d.stall > 0) { d.stall -= dt; d.v = Math.max(0, d.v - (d.lost ? 900 : 700) * dt); }
          else {
            var vmax = Math.min(d.V, Math.sqrt(2 * 380 * Math.max(0, d.path.len - d.s)) + 14);
            d.v = d.v < vmax ? Math.min(vmax, d.v + 360 * dt) : vmax;
          }
          d.s = Math.min(d.path.len, d.s + d.v * dt);
          while (!d.lost && d.next < d.ev.length && d.s >= d.ev[d.next].at) { enterDistrict(d.ev[d.next]); d.next++; }
          if (!d.lost && d.next >= d.ev.length && d.s >= d.path.len - 0.5) arrive();
        }
        var gap = (clamp(0.85 + K * 0.8, 0.95, 1.35) * 20 + 7) / K;
        for (k = 0; k < 3; k++) {
          var t = d.tr[k];
          posAt(d.path, Math.max(0, d.s - k * gap), P1);
          t.x = P1.x; t.y = P1.y;
          var da = P1.a - t.a;
          while (da > Math.PI) da -= TAU;
          while (da < -Math.PI) da += TAU;
          t.a += da * Math.min(1, dt * 10);
          if (t.d) {
            t.sm -= dt;
            if (t.sm <= 0) { t.sm = 0.1; spawn(0, t.x, t.y, rnd(-6, 6), rnd(-26, -12), rnd(1.0, 1.6), rnd(6, 9), 14, 0, 0.5); if (Math.random() < 0.3) spawn(2, t.x, t.y, 0, -6, 0.3, rnd(5, 8), 6, 0, 0); }
          }
        }
        if (d.v > 40) {
          d.dustT -= dt;
          if (d.dustT <= 0) { d.dustT = 0.07; var tl = d.tr[2]; spawn(1, tl.x - Math.cos(tl.a) * 9 / K, tl.y - Math.sin(tl.a) * 9 / K, rnd(-8, 8), rnd(-8, 8), rnd(0.6, 1.0), rnd(6, 10), 16, 0, 1); }
        }
      }
      function updateScan(dt) {
        var f = scanFx, c = D[f.id].c;
        f.t += dt;
        if (f.stage === 0 && f.t >= f.fly) { f.stage = 1; f.t = 0; ring(c[0], c[1], 6, 56, 0.8, CYAN, 2, 0); ring(c[0], c[1], 6, 56, 0.8, CYAN, 1.5, 0.45); }
        else if (f.stage === 1 && f.t >= 1.05) {
          f.stage = 2; f.t = 0;
          var v = ses.risk[f.id];
          ses.known[f.id] = { v: v, at: ses.idx, t: time };
          floatText(c[0], c[1] - 34 / K, S.risk + " " + v, v >= 2 ? "#ff6b5a" : v === 1 ? AMBER : "#86d68b", false);
          sfx("ui_onay", 0.45); updateHUD();
        } else if (f.stage === 2 && f.t >= 0.55) { scanFx = null; updateHUD(); }
      }
      function update(dt) {
        var i;
        for (i = 0; i < timers.length; i++) { var tm = timers[i]; tm.t -= dt; if (tm.t <= 0) { timers.splice(i, 1); i--; tm.f(); } }
        for (i = tweens.length - 1; i >= 0; i--) {
          var tw = tweens[i]; tw.t += dt;
          var p = clamp((tw.t - tw.d) / tw.dur, 0, 1);
          tw.el.textContent = tw.f(tw.to * easeOut(p));
          if (p >= 1) tweens.splice(i, 1);
        }
        if (hintTemp > 0) { hintTemp -= dt; if (hintTemp <= 0) restHint(); }
        if (scanFx) updateScan(dt);
        if (drive && (phase === "drive" || phase === "result")) updateDrive(dt);
        if (camHold > 0) camHold -= dt;
        if (phase === "intro" && mw > W) cam.tx = clampX(W / 2 - (1050 + Math.sin(time * 0.12) * 600) * K);
        else if (phase === "drive" && drive && camHold <= 0) cam.tx = clampX(W / 2 - drive.tr[0].x * K);
        var kf = Math.min(1, dt * 4);
        cam.x += (cam.tx - cam.x) * kf; cam.y += (cam.ty - cam.y) * kf;
        for (i = 0; i < PART.length; i++) {
          var q0 = PART[i];
          if (!q0.on) continue;
          q0.age += dt;
          if (q0.age >= q0.life) { q0.on = false; continue; }
          if (q0.drag) { var fr = Math.max(0, 1 - q0.drag * dt); q0.vx *= fr; q0.vy *= fr; }
          q0.vy += q0.g * dt; q0.x += q0.vx * dt / K; q0.y += q0.vy * dt / K; q0.size += q0.grow * dt;
        }
        for (i = 0; i < RINGS.length; i++) if (RINGS[i].on && (RINGS[i].age += dt) >= RINGS[i].life) RINGS[i].on = false;
        for (i = 0; i < TRACERS.length; i++) if (TRACERS[i].on && (TRACERS[i].age += dt) >= TRACERS[i].life) TRACERS[i].on = false;
        for (i = 0; i < FLOATS.length; i++) if (FLOATS[i].on && (FLOATS[i].age += dt) >= FLOATS[i].life) FLOATS[i].on = false;
        shake = shake > 0.2 ? shake * Math.exp(-dt * 7) : 0;
        flash = Math.max(0, flash - dt * 2.4);
      }

      // ---------- çizim ----------
      function drawZones(g) {
        var i, pulse = 0.5 + 0.5 * Math.sin(time * 4), live = phase === "plan" || phase === "drive" || phase === "result";
        g.fillStyle = BAD; g.globalAlpha = 0.06 + 0.05 * Math.sin(time * 2.4); g.fill(paths[HQ]);
        if (live && plan) {
          var r = plan.route, dest = cur().dest;
          g.fillStyle = AMBER; g.globalAlpha = 0.1;
          for (i = 1; i < r.length; i++) g.fill(paths[r[i]]);
          g.globalAlpha = 0.05 + 0.07 * pulse; g.fill(paths[dest]);
          g.globalAlpha = 0.85; g.strokeStyle = AMBER; g.lineWidth = 2.2 / K;
          DASH[0] = 9 / K; DASH[1] = 7 / K; g.setLineDash(DASH); g.lineDashOffset = -time * 18 / K;
          g.stroke(paths[dest]); g.setLineDash(EMPTY); g.lineDashOffset = 0;
          if (phase === "plan") {
            if (plan.mode === "route" && !routeDone()) {
              var nb = D[r[r.length - 1]].n;
              g.fillStyle = CREAM; g.globalAlpha = 0.05 + 0.08 * pulse;
              for (i = 0; i < nb.length; i++) if (nb[i] !== HQ && r.indexOf(nb[i]) < 0) g.fill(paths[nb[i]]);
            } else if (plan.mode === "escort") {
              g.fillStyle = GOOD; g.globalAlpha = 0.08 + 0.1 * pulse;
              for (i = 1; i < r.length; i++) g.fill(paths[r[i]]);
            } else if (plan.mode === "drone") {
              g.fillStyle = CYAN; g.globalAlpha = 0.05 + 0.07 * pulse;
              for (i = 0; i < N; i++) { var k = ses.known[i]; if (i !== PORT && i !== HQ && !(k && k.at === ses.idx)) g.fill(paths[i]); }
            }
            if (hover >= 0) {
              g.globalAlpha = 0.08; g.fillStyle = CREAM; g.fill(paths[hover]);
              g.globalAlpha = 0.6; g.strokeStyle = CREAM; g.lineWidth = 2 / K; g.stroke(paths[hover]);
            }
          }
        }
        if (tapF.id >= 0) {
          var a = 1 - (time - tapF.t) / 0.4;
          if (a > 0) { g.globalAlpha = a * 0.35; g.fillStyle = tapF.bad ? BAD : AMBER; g.fill(paths[tapF.id]); } else tapF.id = -1;
        }
        g.globalAlpha = 1;
      }
      function drawRoute(g) {
        if (!plan || !plan.path || phase === "intro" || phase === "summary") return;
        var p = plan.path.p2d;
        g.lineJoin = "round"; g.lineCap = "round"; g.setLineDash(EMPTY);
        g.strokeStyle = "rgba(18,14,10,0.6)"; g.lineWidth = 10 / K; g.stroke(p);
        g.strokeStyle = "rgba(241,173,42,0.3)"; g.lineWidth = 6.5 / K; g.stroke(p);
        DASH[0] = 13 / K; DASH[1] = 9 / K; g.setLineDash(DASH); g.lineDashOffset = -time * 40 / K;
        g.strokeStyle = AMBER; g.lineWidth = 3.2 / K; g.stroke(p);
        g.setLineDash(EMPTY); g.lineDashOffset = 0;
      }
      function drawTruck(g, x, y, a, dmg, sc) {
        g.save(); g.translate(x, y); g.rotate(a); g.scale(sc, sc);
        g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(-8, -3, 19, 9.5);
        g.lineWidth = 1; g.strokeStyle = INK;
        g.fillStyle = dmg ? "#8d8270" : CREAM; g.fillRect(-9.5, -4.5, 12.5, 9); g.strokeRect(-9.5, -4.5, 12.5, 9);
        g.fillStyle = dmg ? "#6b5a3a" : AMBER; g.fillRect(-9.5, -1, 12.5, 2);
        g.fillStyle = dmg ? "#3d4232" : "#5d6b45"; g.fillRect(3.5, -4, 6, 8); g.strokeRect(3.5, -4, 6, 8);
        g.fillStyle = "#1d2a33"; g.fillRect(7.4, -3, 1.6, 6);
        g.fillStyle = "#ffd27a"; g.fillRect(9.3, -3.6, 1.2, 1.6); g.fillRect(9.3, 2, 1.2, 1.6);
        g.restore();
      }
      function drawDrone(g, x, y, a) {
        if (a <= 0) return;
        g.globalAlpha = a; g.save(); g.translate(x, y);
        g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.arc(6, 12, 5, 0, TAU); g.fill();
        g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, -6); g.lineTo(6, 6); g.moveTo(6, -6); g.lineTo(-6, 6); g.stroke();
        g.fillStyle = "rgba(236,228,208,0.6)";
        for (var i = 0; i < 4; i++) { g.beginPath(); g.arc(i % 2 ? 6 : -6, i < 2 ? -6 : 6, 3.8, 0, TAU); g.fill(); }
        g.fillStyle = "#33312f"; g.fillRect(-3.2, -3.2, 6.4, 6.4);
        g.fillStyle = (time * 4) % 1 < 0.5 ? CYAN : "#ff5a47"; g.fillRect(-1.2, -1.2, 2.4, 2.4);
        g.restore(); g.globalAlpha = 1;
      }
      function drawMarkers(g) {
        var c = D[HQ].c, X = vox + c[0] * K, Y = voy + c[1] * K, f = (time * 0.6) % 1, i;
        g.strokeStyle = BAD; g.globalAlpha = (1 - f) * 0.7; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, 10 + f * 26, 0, TAU); g.stroke();
        g.globalAlpha = 1;
        if (!ses || !plan || phase === "intro" || phase === "summary") return;
        // rota düğümleri
        var r = plan.route;
        for (i = 1; i < r.length; i++) {
          var rc = D[r[i]].c, rx = vox + rc[0] * K, ry = voy + rc[1] * K;
          g.beginPath(); g.arc(rx, ry, 4.5, 0, TAU); g.fillStyle = AMBER; g.fill(); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke();
        }
        if (phase === "plan" && plan.mode === "route" && !routeDone()) {
          var ec = D[r[r.length - 1]].c;
          g.globalAlpha = 0.9; g.strokeStyle = CREAM; g.lineWidth = 2;
          g.beginPath(); g.arc(vox + ec[0] * K, voy + ec[1] * K, 9 + 3 * Math.sin(time * 5), 0, TAU); g.stroke(); g.globalAlpha = 1;
        }
        // varış noktası: nabız gibi atan hardal halka ve bayrak
        var dc = D[cur().dest].c, dx = vox + dc[0] * K, dy = voy + dc[1] * K;
        g.strokeStyle = AMBER;
        for (i = 0; i < 2; i++) {
          f = (time * 0.8 + i * 0.5) % 1;
          g.globalAlpha = (1 - f) * 0.9; g.lineWidth = 2.5 * (1 - f) + 0.5;
          g.beginPath(); g.arc(dx, dy, 12 + f * 30, 0, TAU); g.stroke();
        }
        g.globalAlpha = 1; g.lineWidth = 2.5; g.beginPath(); g.arc(dx, dy, 11, 0, TAU); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(dx + 21, dy + 6); g.lineTo(dx + 21, dy - 18); g.stroke();
        var wv = Math.sin(time * 5) * 1.5;
        g.fillStyle = AMBER; g.beginPath(); g.moveTo(dx + 22, dy - 18); g.lineTo(dx + 35, dy - 14 + wv); g.lineTo(dx + 22, dy - 9); g.closePath(); g.fill();
        g.lineWidth = 1; g.stroke();
        drawDestArrow(g, dx, dy);
        // risk noktaları (taze: tam, eski: soluk + ?)
        g.textAlign = "center"; g.textBaseline = "middle";
        for (i = 0; i < N; i++) { if (i !== PORT && i !== HQ && ses.known[i]) drawRisk(g, i, ses.known[i]); }
        // eskortlar
        if (phase === "plan" || phase === "drive") for (i = 0; i < N; i++) if (plan.esc[i]) drawEscort(g, i);
      }
      function drawDestArrow(g, X, Y) {
        var top = rt + 8, bot = H - rb - 8, m = 26;
        if (X >= m && X <= W - m && Y >= top && Y <= bot) return;
        var cx0 = W / 2, cy0 = (top + bot) / 2, dx = X - cx0, dy = Y - cy0;
        var t = Math.min((W / 2 - m) / Math.max(1e-3, Math.abs(dx)), ((bot - top) / 2 - m) / Math.max(1e-3, Math.abs(dy)));
        var a = Math.atan2(dy, dx), b = Math.sin(time * 5) * 3;
        g.save(); g.translate(cx0 + dx * t + Math.cos(a) * b, cy0 + dy * t + Math.sin(a) * b); g.rotate(a);
        g.fillStyle = AMBER; g.strokeStyle = INK; g.lineWidth = 2;
        g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -10); g.lineTo(-3, 0); g.lineTo(-8, 10); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      function drawRisk(g, i, k) {
        var fresh = k.at === ses.idx, c = D[i].c, X = vox + c[0] * K, Y = voy + c[1] * K - 9;
        var sc = fresh ? easeBack(clamp((time - k.t) / 0.35, 0, 1)) : 1;
        if (sc <= 0.01) return;
        g.save(); g.translate(X, Y); g.scale(sc, sc); g.globalAlpha = fresh ? 1 : 0.55;
        rr(g, -17, -6, 34, 12, 6); g.fillStyle = "rgba(20,18,16,0.88)"; g.fill();
        if (fresh) { g.lineWidth = 1; g.strokeStyle = k.v >= 2 ? BAD : "rgba(236,228,208,0.35)"; g.stroke(); }
        g.lineWidth = 1.2;
        for (var j = 0; j < 3; j++) {
          g.beginPath(); g.arc(-9 + j * 9, 0, 3, 0, TAU);
          if (j < k.v) { g.fillStyle = BAD; g.fill(); } else { g.strokeStyle = "rgba(236,228,208,0.55)"; g.stroke(); }
        }
        if (!fresh) { g.fillStyle = CREAM; g.font = "700 11px 'Barlow Condensed',sans-serif"; g.fillText("?", 23, 0.5); }
        g.restore(); g.globalAlpha = 1;
      }
      function drawEscort(g, i) {
        var c = D[i].c, X = vox + c[0] * K, Y = voy + c[1] * K + 8;
        var sc = easeBack(clamp((time - plan.esc[i]) / 0.4, 0, 1)), fl = plan.escFlash[i] ? clamp(1 - (time - plan.escFlash[i]) / 0.9, 0, 1) : 0;
        if (sc <= 0.01) return;
        g.save(); g.translate(X, Y); g.scale(sc, sc);
        if (fl > 0) { g.globalAlpha = fl * 0.55; g.fillStyle = GOOD; g.beginPath(); g.arc(0, 0, 15 + (1 - fl) * 10, 0, TAU); g.fill(); g.globalAlpha = 1; }
        g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fillStyle = "#26301f"; g.fill(); g.lineWidth = 2; g.strokeStyle = GOOD; g.stroke();
        g.fillStyle = CREAM; g.beginPath(); g.arc(0, 1.5, 6, Math.PI, 0); g.closePath(); g.fill(); g.fillRect(-7.5, 1.2, 15, 2.2);
        g.strokeStyle = CREAM; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-3.5, 5.2); g.lineTo(0, 7.6); g.lineTo(3.5, 5.2); g.stroke();
        g.restore();
      }
      function drawScan(g) {
        if (!scanFx) return;
        var f = scanFx, c = D[f.id].c, X = vox + c[0] * K, Y = voy + c[1] * K;
        if (f.stage === 0) {
          var a = D[PORT].c, p = easeInOut(clamp(f.t / f.fly, 0, 1));
          drawDrone(g, lerp(vox + a[0] * K, X, p), lerp(voy + a[1] * K, Y - 26, p) - Math.sin(p * Math.PI) * 30, 1);
        } else if (f.stage === 1) {
          var R = 50, ang = f.t * 7.5;
          g.fillStyle = CYAN; g.globalAlpha = 0.12; g.beginPath(); g.arc(X, Y, R, 0, TAU); g.fill();
          g.globalAlpha = 0.7; g.strokeStyle = CYAN; g.lineWidth = 1.5; g.stroke();
          g.globalAlpha = 0.35; g.beginPath(); g.arc(X, Y, R * 0.55, 0, TAU); g.stroke();
          g.lineWidth = 2;
          for (var j = 0; j < 12; j++) {
            var aa = ang - j * 0.07;
            g.globalAlpha = 0.85 * (1 - j / 12); g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(aa) * R, Y + Math.sin(aa) * R); g.stroke();
          }
          g.globalAlpha = 1;
          drawDrone(g, X + Math.cos(time * 3) * 4, Y - 26 + Math.sin(time * 4) * 2, 1);
        } else {
          var q1 = f.t / 0.55;
          drawDrone(g, X + q1 * 30, Y - 26 - q1 * 60, 1 - q1);
        }
      }
      function drawTrucks(g) {
        if (!plan || !(phase === "plan" || phase === "drive" || phase === "result")) return;
        var ts = clamp(0.85 + K * 0.8, 0.95, 1.35), k;
        if (drive) {
          for (k = 2; k >= 0; k--) { var t = drive.tr[k]; drawTruck(g, vox + t.x * K, voy + t.y * K, t.a, t.d, ts); }
        } else {
          var c = D[PORT].c, a = plan.path ? posAt(plan.path, 2, P1).a : -0.6;
          drawTruck(g, vox + c[0] * K, voy + c[1] * K + Math.sin(time * 3) * 0.6, a, 0, ts);
        }
      }
      function drawFx(g) {
        var i, p, X, Y, z, a;
        for (i = 0; i < PART.length; i++) {
          p = PART[i];
          if (!p.on || p.t > 1 && p.t !== 6) continue;
          X = vox + p.x * K; Y = voy + p.y * K; a = 1 - p.age / p.life;
          if (p.t === 6) { g.globalAlpha = a; g.fillStyle = "#2a2420"; g.fillRect(X - p.size / 2, Y - p.size / 2, p.size, p.size); continue; }
          z = Math.max(0.5, p.size);
          g.globalAlpha = Math.min(1, p.age * 6) * a * (p.t === 0 ? 0.9 : 0.6);
          g.drawImage(SPR_BY[p.t], X - z / 2, Y - z / 2, z, z);
        }
        g.globalCompositeOperation = "lighter";
        for (i = 0; i < PART.length; i++) {
          p = PART[i];
          if (!p.on || p.t < 2 || p.t > 5) continue;
          X = vox + p.x * K; Y = voy + p.y * K; a = 1 - p.age / p.life; z = Math.max(0.5, p.size);
          g.globalAlpha = p.t === 2 ? a * a : p.t === 3 ? a : a * (0.55 + 0.45 * Math.sin(p.tw + p.age * 14));
          g.drawImage(SPR_BY[p.t], X - z / 2, Y - z / 2, z, z);
        }
        g.strokeStyle = "#ffd27a"; g.lineWidth = 1.6; g.lineCap = "round";
        for (i = 0; i < TRACERS.length; i++) {
          var tr = TRACERS[i];
          if (!tr.on) continue;
          var u = tr.age / tr.life * 1.3, u0 = clamp(u - 0.35, 0, 1), u1 = clamp(u, 0, 1);
          g.globalAlpha = 1 - tr.age / tr.life;
          g.beginPath();
          g.moveTo(vox + lerp(tr.x1, tr.x2, u0) * K, voy + lerp(tr.y1, tr.y2, u0) * K);
          g.lineTo(vox + lerp(tr.x1, tr.x2, u1) * K, voy + lerp(tr.y1, tr.y2, u1) * K);
          g.stroke();
        }
        g.globalCompositeOperation = "source-over";
        for (i = 0; i < RINGS.length; i++) {
          var r = RINGS[i];
          if (!r.on || r.age < 0) continue;
          var tt = r.age / r.life;
          g.globalAlpha = 1 - tt; g.strokeStyle = r.col; g.lineWidth = r.w * (1 - tt * 0.5);
          g.beginPath(); g.arc(vox + r.x * K, voy + r.y * K, r.r0 + (r.r1 - r.r0) * easeOut(tt), 0, TAU); g.stroke();
        }
        g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
        for (i = 0; i < FLOATS.length; i++) {
          var fl = FLOATS[i];
          if (!fl.on) continue;
          var ft = fl.age / fl.life;
          g.globalAlpha = ft < 0.75 ? Math.min(1, ft * 8) : 1 - (ft - 0.75) / 0.25;
          g.font = (fl.big ? 28 : 19) + "px Anton,Impact,sans-serif";
          X = vox + fl.x * K; Y = voy + fl.y * K - 34 * easeOut(ft);
          g.lineWidth = 4; g.strokeStyle = "rgba(20,18,16,0.9)"; g.strokeText(fl.txt, X, Y);
          g.fillStyle = fl.col; g.fillText(fl.txt, X, Y);
        }
        g.globalAlpha = 1;
      }
      function draw() {
        var g = cx;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
        g.fillStyle = "#191817"; g.fillRect(0, 0, W, H);
        if (!ready) return;
        var sx = shake ? (Math.random() * 2 - 1) * shake : 0, sy = shake ? (Math.random() * 2 - 1) * shake : 0;
        vox = Math.round((cam.x + sx) * dpr) / dpr; voy = Math.round((cam.y + sy) * dpr) / dpr;
        g.drawImage(stat, vox, voy, mw, mh);
        g.setTransform(dpr * K, 0, 0, dpr * K, dpr * vox, dpr * voy);
        drawZones(g); drawRoute(g);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawMarkers(g); drawScan(g); drawTrucks(g); drawFx(g);
        if (flash > 0.01) { g.globalAlpha = flash; g.fillStyle = flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      }
      function frame(now) {
        raf = 0;
        if (paused || destroyed) return;
        var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
        last = now; time += dt;
        update(dt); draw();
        raf = requestAnimationFrame(frame);
      }

      // ---------- giriş ----------
      function ptPos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
      on(cv, "pointerdown", function (e) {
        if (ptr.id !== null || !ready) return;
        var p = ptPos(e);
        ptr.id = e.pointerId; ptr.sx = p[0]; ptr.sy = p[1]; ptr.cx = cam.x; ptr.cy = cam.y; ptr.moved = false;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* yok */ }
        e.preventDefault();
      });
      on(cv, "pointermove", function (e) {
        var p = ptPos(e);
        if (ptr.id === null) {
          if (e.pointerType === "mouse") {
            var h = phase === "plan" ? pickAt(p[0], p[1]) : -1;
            if (h !== hover) { hover = h; cv.style.cursor = h >= 0 ? "pointer" : ""; }
          }
          return;
        }
        if (e.pointerId !== ptr.id) return;
        var dx = p[0] - ptr.sx, dy = p[1] - ptr.sy;
        if (!ptr.moved && dx * dx + dy * dy > 100) ptr.moved = true;
        if (ptr.moved && mw > W + 1) { cam.x = cam.tx = clampX(ptr.cx + dx); cam.y = cam.ty = clampY(ptr.cy + dy); camHold = 2.5; }
      });
      function endPtr(e, isTap) {
        if (e.pointerId !== ptr.id) return;
        ptr.id = null;
        try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* yok */ }
        if (isTap && !ptr.moved) { var p = ptPos(e); tap(p[0], p[1]); }
      }
      on(cv, "pointerup", function (e) { endPtr(e, true); });
      on(cv, "pointercancel", function (e) { endPtr(e, false); });
      on(cv, "pointerleave", function () { if (hover >= 0) { hover = -1; cv.style.cursor = ""; } });
      on(btnDrone, "click", function () { toolPress("drone"); });
      on(btnEsc, "click", function () { toolPress("escort"); });
      on(btnGo, "click", dispatch);
      on(elCard, "click", function (e) {
        var b = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
        if (b && !b.disabled) act(b.getAttribute("data-act"));
      });
      function onResize() { if (paused) needLayout = true; else layout(); }
      if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(root); }
      else on(window, "resize", onResize);

      layout();
      showIntro();
      load();
      last = performance.now();
      raf = requestAnimationFrame(frame);

      return {
        pause: function () {
          if (paused || destroyed) return;
          paused = true;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
        },
        resume: function () {
          if (!paused || destroyed) return;
          paused = false;
          if (needLayout) layout();
          last = performance.now();
          if (!raf) raf = requestAnimationFrame(frame);
        },
        destroy: function () {
          if (destroyed) return;
          destroyed = true; paused = true;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          if (ro) ro.disconnect();
          for (var i = 0; i < listeners.length; i++) { var l = listeners[i]; l[0].removeEventListener(l[1], l[2], l[3]); }
          listeners.length = 0; timers.length = 0; tweens.length = 0;
          if (root.parentNode) root.parentNode.removeChild(root);
          stat.width = stat.height = 0;
        }
      };
    }
  };
})();
