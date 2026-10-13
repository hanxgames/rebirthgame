/* ReBirth — mini oyun «Yeniden İnşa / Rebuild» (id: insa).
 * Tarsel'de 12 aylık yeniden yapılanma: bölgeye dokun, girişim seç, Gölge Cephesi'nin yayılmasını durdur.
 * Sözleşme: js/games/CONTRACT.md. createSim (SIM işaretleri arası) DOM'dan bağımsızdır; denge sayıları RULES'ta. */
(function () {
  "use strict";
  window.RBGames = window.RBGames || {};

  /*SIM>*/
  var RULES = {
    monthSec: 6, months: 12, startBudget: 12, income: 6, incomePer: 3,
    cost: { hosp: 4, post: 5, school: 3 },
    hosp: 22, post: 8, postMonths: 3, school: 6, schoolGrow: 3, schoolMonths: 4,
    decay: 2.0, decayNear: 2.2, insDrift: 3,
    fall: 15, retake: 60, danger: 20, contested: 30,
    spreadHq: 0.5, spread: 0.38, spreadEsc: 0.015, spreadMin: 6, spreadVar: 5,
    eventP: 0.7, quake: 15, quakeN: 6, attack: 20, donor: 3, panic: 4, relief: 3,
    winHeld: 10, loseIns: 6, star2: 1600, star3: 1850
  };

  function createSim(map, rng, emit) {
    var R = RULES, D = [], byId = {}, totalPop = 0, j;
    emit = emit || function () {};
    map.districts.forEach(function (s, i) {
      var d = { i: i, id: s.id, name: s.name, pop: s.pop || 1, n: (s.n || []).slice(), role: s.role || "",
        terrain: s.terrain || "", hq: s.id === 10, stab: 0, ins: false, post: 0, grow: 0, fresh: false };
      D.push(d); byId[d.id] = d; totalPop += d.pop;
    });
    D.forEach(function (d) { // komşuluk iki yönlü olsun
      d.n = d.n.filter(function (id) { return byId[id] && id !== d.id; });
      d.n.forEach(function (id) { if (byId[id].n.indexOf(d.id) < 0) byId[id].n.push(d.id); });
    });
    var hqN = byId[10] ? byId[10].n : [];
    D.forEach(function (d) {
      if (d.hq) { d.ins = true; d.stab = 0; }
      else if (d.role === "capital") d.stab = 50;
      else if (hqN.indexOf(d.id) >= 0) d.stab = 19 + Math.floor(rng() * 9);
      else d.stab = 30 + Math.floor(rng() * 26);
    });
    var S = { budget: R.startBudget, month: 0, t: 0, over: false, won: false, reason: "" };

    function add(d, v) { var x = d.stab + v; d.stab = x < 0 ? 0 : x > 100 ? 100 : x; }
    function insN(d) { var k = 0; for (var q = 0; q < d.n.length; q++) if (byId[d.n[q]].ins) k++; return k; }
    function decayRate(d) {
      if (d.hq) return 0;
      if (d.ins) return R.insDrift;
      return R.decay + (d.post > 0 ? 0 : R.decayNear * Math.min(2, insN(d)));
    }
    function insCount() { var k = 0; for (var q = 0; q < D.length; q++) if (D[q].ins) k++; return k; }
    function held() { return D.length - insCount(); }
    function counts(o) {
      o = o || {}; o.gov = 0; o.con = 0; o.ins = 0;
      for (var q = 0; q < D.length; q++) {
        if (D[q].ins) o.ins++; else if (D[q].stab < R.contested) o.con++; else o.gov++;
      }
      return o;
    }
    function legit() {
      var s = 0;
      for (var q = 0; q < D.length; q++) if (!D[q].ins) s += D[q].pop * D[q].stab;
      return Math.round(s / totalPop);
    }
    function income() {
      var k = 0;
      for (var q = 0; q < D.length; q++) if (!D[q].ins && D[q].stab >= R.contested) k++;
      return R.income + Math.floor(k / R.incomePer);
    }
    function score() { return legit() * 10 + held() * 100 + S.budget * 5; }
    function stars() { if (!S.won) return 0; var sc = score(); return sc >= R.star3 ? 3 : sc >= R.star2 ? 2 : 1; }
    function pick(a) { return a[Math.min(a.length - 1, Math.floor(rng() * a.length))]; }

    function retakeCheck(d) {
      if (!d.ins || d.hq || d.stab <= R.retake) return;
      d.ins = false;
      d.n.forEach(function (id) { var x = byId[id]; if (!x.ins) add(x, R.relief); });
      emit("retake", d);
    }
    function fall(d) {
      d.ins = true; d.fresh = true; d.stab = Math.min(d.stab, 10); d.post = 0; d.grow = 0;
      d.n.forEach(function (id) { var x = byId[id]; if (!x.ins) add(x, -R.panic); });
      emit("fall", d);
    }
    function end(won, reason) { S.over = true; S.won = won; S.reason = reason; emit("end", won, reason); }

    function event(m) {
      var live = D.filter(function (d) { return !d.ins; }), t, a;
      if (!live.length) return;
      var wq = 0.34, wd = 0.26, wa = 0.4 + 0.01 * m, r = rng() * (wq + wd + wa);
      if (r < wq) {
        t = pick(live); add(t, -R.quake);
        t.n.forEach(function (id) { var x = byId[id]; if (!x.ins) add(x, -R.quakeN); });
        emit("quake", t);
      } else if (r < wq + wd) {
        S.budget += R.donor; emit("donor", R.donor);
      } else {
        var front = live.filter(function (d) { return insN(d) > 0; });
        t = pick(front.length ? front : live);
        a = t.post > 0 ? R.attack / 2 : R.attack;
        add(t, -a); emit("attack", t, a, t.post > 0);
      }
    }

    function tick() {
      var m = S.month + 1, src, t, a, q, b;
      D.filter(function (d) { return !d.ins && d.stab < R.fall; }).forEach(fall);
      if (insCount() >= R.loseIns) { S.month = m; end(false, "fallen"); return; }
      if (m >= R.months) { S.month = m; end(held() >= R.winHeld, "time"); return; }
      for (j = 0; j < D.length; j++) {
        t = D[j];
        if (t.grow > 0) { t.grow--; b = t.stab; add(t, R.schoolGrow); emit("grow", t, t.stab - b); retakeCheck(t); }
      }
      for (j = 0; j < D.length; j++) {
        src = D[j];
        if (!src.ins || src.fresh) continue;
        for (q = 0; q < src.n.length; q++) {
          t = byId[src.n[q]];
          if (t.ins || rng() >= (src.hq ? R.spreadHq : R.spread) + R.spreadEsc * m) continue;
          if (t.post > 0) { emit("blocked", src, t); continue; }
          a = R.spreadMin + Math.floor(rng() * R.spreadVar) + Math.floor(m / 3);
          add(t, -a); emit("spread", src, t, a);
        }
      }
      if (rng() < R.eventP) event(m);
      for (j = 0; j < D.length; j++) { if (D[j].post > 0) D[j].post--; D[j].fresh = false; }
      a = income(); S.budget += a; emit("income", a);
      S.month = m;
      emit("month", m);
    }

    function advance(dt) {
      if (S.over || !(dt > 0)) return;
      var f = dt / R.monthSec, r;
      for (var q = 0; q < D.length; q++) { r = decayRate(D[q]); if (r) add(D[q], -r * f); }
      S.t += f;
      if (S.t >= 1) { S.t -= 1; tick(); }
    }

    function can(d, k) { return !!d && !S.over && !d.hq && R.cost[k] != null && S.budget >= R.cost[k]; }
    function act(i, k) {
      var d = D[i];
      if (!can(d, k)) return false;
      S.budget -= R.cost[k];
      var before = d.stab, gain;
      if (k === "hosp") gain = R.hosp;
      else if (k === "post") { d.post = Math.min(R.postMonths * 2, d.post + R.postMonths); gain = R.post; }
      else { d.grow = Math.min(R.schoolMonths * 2, d.grow + R.schoolMonths); gain = R.school; }
      add(d, gain);
      emit("act", d, k, d.stab - before);
      retakeCheck(d);
      return true;
    }

    return { R: R, S: S, D: D, byId: byId, advance: advance, act: act, can: can, legit: legit, held: held,
      insCount: insCount, counts: counts, income: income, score: score, stars: stars, insN: insN, decayRate: decayRate };
  }
  /*<SIM*/

  var LANG = {
    tr: {
      budget: "BÜTÇE", legit: "MEŞRUİYET", control: "KONTROL", month: "AY", close: "Kapat",
      speed: ["Duraklat", "Normal hız", "Hızlı"], paused: "DURAKLATILDI", year: "YIL 1",
      months: ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"],
      leg: ["İSTİKRAR", "ÇEKİŞMELİ", "İSYANCI"], stab: "İSTİKRAR", pop: "NÜFUS",
      popU: function (p) { return p + " BİN"; }, mo: function (n) { return n + " AY"; },
      st: { gov: "HÜKÜMET", con: "ÇEKİŞMELİ", ins: "İSYANCI", hq: "KARARGÂH" },
      roles: { capital: "BAŞKENT", port: "LİMAN", bridge: "KÖPRÜ", lake: "GÖL", border: "SINIR", spa: "KAPLICA",
        strait: "BOĞAZ", hq: "KARARGÂH", plateau: "PLATO", forest: "ORMAN" },
      terr: { "vadi": "VADİ", "kıyı": "KIYI", "nehir": "NEHİR", "ova": "OVA", "bozkır": "BOZKIR", "göl": "GÖL",
        "tepe": "TEPE", "boğaz": "BOĞAZ", "dağ": "DAĞ", "plato": "PLATO", "orman": "ORMAN", "sınır": "SINIR" },
      acts: {
        hosp: ["SAHRA HASTANESİ", "+22 istikrar, hemen", "+22 istikrar"],
        post: ["KARAKOL", "İsyanın yayılmasını 3 ay keser · +8", "3 ay kalkan"],
        school: ["OKUL VE İŞ", "+6 şimdi, sonra 4 ay boyunca +3/ay", "+6, sonra +3/ay"]
      },
      noteIns: "Geri almak için istikrarı 60'ın üstüne çıkar.",
      noteHq: "Gölge Cephesi karargâhı. Sivil girişimler burada işe yaramaz; komşu bölgeleri karakolla koru.",
      noteDanger: "Ay sonunda 15'in altındaysa düşer!",
      hStart: "Tarsel'de yeniden inşa başladı",
      hFinal: "Son ay: dayan, Koordinatör",
      hEdge: "Vilayet pamuk ipliğinde: bir bölge daha düşerse Tarsel kaybedilir",
      hFall: function (n) { return n + ", Gölge Cephesi'nin eline geçti"; },
      hRetake: function (n) { return n + " geri alındı"; },
      hQuake: function (n) { return "Artçı sarsıntı: " + n; },
      hDonor: "Bağışçılar ek fon gönderdi (+3)",
      hAttack: function (n) { return "Gölge Cephesi saldırısı: " + n; },
      hAttackHeld: function (n) { return "Gölge Cephesi saldırısı: " + n + " — karakol direndi"; },
      tagBad: "SON DAKİKA", tagGood: "MÜJDE", tagNews: "HABER",
      fltFall: "DÜŞTÜ", fltRetake: "GERİ ALINDI", tap: "DOKUN",
      intro: {
        kick: "KOORDİNATÖR BRİFİNGİ · TARSEL", title: "YENİDEN İNŞA", note: "12 ay. 14 bölge. Tek koordinatör.",
        stamp: "GİZLİ",
        lines: ["Bir bölgeye dokun, girişim seç: hastane hızla toparlar, karakol isyanın yayılmasını keser, okul zamanla büyür.",
          "Ay sonunda istikrarı 15'in altında kalan bölge Gölge Cephesi'ne düşer.",
          "12 ayın sonunda en az 10 bölgeyi elde tut. Altı bölge düşerse Tarsel kaybedilir."],
        best: "EN İYİ", start: "BAŞLA", loading: "YÜKLENİYOR…", error: "Harita yüklenemedi"
      },
      end: {
        win: "VİLAYET AYAĞA KALKTI", lose: "TARSEL DÜŞTÜ", short: "YETERSİZ KONTROL",
        winSub: function (n) { return "12 ayın sonunda " + n + " bölge hükümetin elinde."; },
        loseSub: function (n) { return "Gölge Cephesi " + n + " bölgeyi ele geçirdi."; },
        shortSub: function (n) { return "Vilayetin ayakta kalması için en az 10 bölge gerekiyordu; elde " + n + " kaldı."; },
        stampWin: "GÖREV TAMAM", stampLose: "GÖREV BAŞARISIZ",
        rows: ["Meşruiyet", "Elde tutulan bölge", "Kalan bütçe"],
        score: "SKOR", best: "En iyi", newBest: "Yeni rekor!", again: "TEKRAR"
      }
    },
    en: {
      budget: "BUDGET", legit: "LEGITIMACY", control: "CONTROL", month: "MONTH", close: "Close",
      speed: ["Pause", "Normal speed", "Fast"], paused: "PAUSED", year: "YEAR 1",
      months: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"],
      leg: ["STABILITY", "CONTESTED", "INSURGENT"], stab: "STABILITY", pop: "POP.",
      popU: function (p) { return p + "K"; }, mo: function (n) { return n + " MO"; },
      st: { gov: "GOVERNMENT", con: "CONTESTED", ins: "INSURGENT", hq: "HQ" },
      roles: { capital: "CAPITAL", port: "PORT", bridge: "BRIDGE", lake: "LAKE", border: "BORDER", spa: "SPA",
        strait: "STRAIT", hq: "HEADQUARTERS", plateau: "PLATEAU", forest: "FOREST" },
      terr: { "vadi": "VALLEY", "kıyı": "COAST", "nehir": "RIVER", "ova": "PLAINS", "bozkır": "STEPPE", "göl": "LAKE",
        "tepe": "HILLS", "boğaz": "GORGE", "dağ": "MOUNTAIN", "plato": "PLATEAU", "orman": "FOREST", "sınır": "BORDER" },
      acts: {
        hosp: ["FIELD HOSPITAL", "+22 stability, right away", "+22 stability"],
        post: ["POLICE POST", "Blocks insurgent spread for 3 months · +8", "3-month shield"],
        school: ["SCHOOL & JOBS", "+6 now, then +3/month for 4 months", "+6, then +3/mo"]
      },
      noteIns: "Raise stability above 60 to retake it.",
      noteHq: "Shadow Front headquarters. Civil projects won't work here; shield the neighboring districts with police posts.",
      noteDanger: "Falls if below 15 at month end!",
      hStart: "Rebuilding begins in Tarsel",
      hFinal: "Final month: hold on, Coordinator",
      hEdge: "Tarsel hangs by a thread: one more fallen district and the province is lost",
      hFall: function (n) { return n + " falls to the Shadow Front"; },
      hRetake: function (n) { return n + " retaken"; },
      hQuake: function (n) { return "Aftershock: " + n; },
      hDonor: "Donors sent extra funds (+3)",
      hAttack: function (n) { return "Shadow Front attack: " + n; },
      hAttackHeld: function (n) { return "Shadow Front attack: " + n + " — the police post held"; },
      tagBad: "BREAKING", tagGood: "GOOD NEWS", tagNews: "NEWS",
      fltFall: "FALLEN", fltRetake: "RETAKEN", tap: "TAP",
      intro: {
        kick: "COORDINATOR BRIEFING · TARSEL", title: "REBUILD", note: "12 months. 14 districts. One coordinator.",
        stamp: "CLASSIFIED",
        lines: ["Tap a district and pick a project: hospitals heal fast, police posts block the insurgency, schools grow over time.",
          "A district below 15 stability at month end falls to the Shadow Front.",
          "Hold at least 10 districts when the 12 months are up. If six fall, Tarsel is lost."],
        best: "BEST", start: "START", loading: "LOADING…", error: "Couldn't load the map"
      },
      end: {
        win: "THE PROVINCE STANDS", lose: "TARSEL HAS FALLEN", short: "NOT ENOUGH CONTROL",
        winSub: function (n) { return "After 12 months, " + n + " districts are in government hands."; },
        loseSub: function (n) { return "The Shadow Front seized " + n + " districts."; },
        shortSub: function (n) { return "The province needed at least 10 districts; only " + n + " held."; },
        stampWin: "MISSION COMPLETE", stampLose: "MISSION FAILED",
        rows: ["Legitimacy", "Districts held", "Budget left"],
        score: "SCORE", best: "Best", newBest: "New best!", again: "AGAIN"
      }
    }
  };

  var SHIELD_D = "M12 2 20 5v6c0 5-3.4 8.6-8 10.5C7.4 19.6 4 16 4 11V5z";
  var ICON = {
    coin: '<svg class="rbg-insa-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#f1ad2a"/>' +
      '<circle cx="12" cy="12" r="6.6" fill="none" stroke="#b37a1a" stroke-width="2"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1"/><rect x="13.8" y="5" width="4.2" height="14" rx="1"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7.5 5.2 19 12 7.5 18.8z"/></svg>',
    fast: '<svg viewBox="0 0 24 24"><path d="M3 5.5 11.5 12 3 18.5zM12 5.5 20.5 12 12 18.5z"/></svg>',
    hosp: '<svg viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
    post: '<svg viewBox="0 0 24 24"><path d="' + SHIELD_D + '"/></svg>',
    school: '<svg viewBox="0 0 24 24"><path d="M12 3.5 1.5 9 12 14.5 22.5 9zM5.5 12v4.3c0 1.7 3 3.2 6.5 3.2s6.5-1.5 6.5-3.2V12L12 15.4z"/></svg>',
    grow: '<svg viewBox="0 0 24 24"><path d="M12 20V7M6 12l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6-4.8-4.6 6.6-.9z"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2.8 22.6 21H1.4zM10.9 9h2.2v6.2h-2.2zm0 7.6h2.2v2.2h-2.2z"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M5 2.5h2.2v19H5zM8 3.5h11.5l-2.8 4.3 2.8 4.3H8z"/></svg>'
  };

  var CAPS = '"Barlow Condensed", "Arial Narrow", sans-serif';
  var FC = "font:700 10px/1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.08em;";
  var CSS = [
    ".rbg-insa-root{position:absolute;inset:0;overflow:hidden;background:#191817;color:var(--text,#f2ebd9);font-family:var(--f-body,'Barlow',system-ui,sans-serif);line-height:1.3;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;--hud:54px;--strip:58px}",
    ".rbg-insa-root *{box-sizing:border-box}",
    ".rbg-insa-b{font:inherit;color:inherit;border:0;background:none;margin:0;padding:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}",
    ".rbg-insa-root svg{display:block;fill:currentColor}",
    ".rbg-insa-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:auto}",
    /* üst çubuk */
    ".rbg-insa-hud{position:absolute;left:0;right:0;top:0;height:var(--hud);display:flex;z-index:6;background:linear-gradient(180deg,rgba(25,24,23,.95),rgba(25,24,23,.8));border-bottom:1px solid rgba(242,230,199,.1);box-shadow:0 6px 18px rgba(0,0,0,.25)}",
    ".rbg-insa-st{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:center;padding:0 14px;border-right:1px solid rgba(242,230,199,.08)}",
    ".rbg-insa-st:last-child{flex:0 0 auto;border-right:0;align-items:flex-end}",
    ".rbg-insa-lbl{" + FC + "color:var(--muted,#a8a091);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".rbg-insa-val{display:flex;align-items:center;gap:6px;margin-top:4px;font:400 21px/1 var(--f-display,'Anton',sans-serif);letter-spacing:.02em;white-space:nowrap}",
    ".rbg-insa-val small{font:700 12px/1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.06em;color:var(--muted,#a8a091)}",
    ".rbg-insa-val.pulse{animation:rbg-insa-pulse .45s ease-out}",
    ".rbg-insa-coin{width:17px;height:17px;flex:0 0 auto}",
    ".rbg-insa-mbar{display:block;max-width:110px;height:3px;margin-top:5px;border-radius:2px;overflow:hidden;background:rgba(242,230,199,.12)}",
    ".rbg-insa-mbar i{display:block;width:100%;height:100%;transform-origin:0 50%;transform:scaleX(0);background:#f1ad2a;transition:transform .45s,background-color .45s}",
    ".rbg-insa-k{display:inline-flex;align-items:center;gap:3px}",
    ".rbg-insa-k:before{content:'';width:8px;height:8px;border-radius:2px;background:currentColor}",
    ".rbg-insa-k.g{color:#66b86b}.rbg-insa-k.c{color:#f1ad2a}.rbg-insa-k.r{color:#db4738}",
    ".rbg-insa-k b{font-weight:400;color:var(--text,#f2ebd9)}",
    ".rbg-insa-st.crit .rbg-insa-k.r b{color:#ff7a66;animation:rbg-insa-blink 1s infinite}",
    ".rbg-insa-chip{position:absolute;left:14px;top:100%;margin-top:4px;font:800 15px/1 var(--f-caps,'Barlow Condensed',sans-serif);opacity:0;pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,.8)}",
    ".rbg-insa-chip.up{color:#8ee092;animation:rbg-insa-chip 1.3s ease-out forwards}",
    ".rbg-insa-chip.dn{color:#ff8a76;animation:rbg-insa-chip 1.3s ease-out forwards}",
    /* manşet */
    ".rbg-insa-head{position:absolute;left:50%;top:calc(var(--hud) + 8px);z-index:5;display:flex;align-items:stretch;width:max-content;max-width:calc(100% - 20px);background:#ece4d0;color:#201d1b;border-radius:3px;overflow:hidden;box-shadow:0 10px 26px rgba(0,0,0,.5);pointer-events:none;opacity:0;transform:translate(-50%,-140%);transition:transform .42s cubic-bezier(.2,.7,.1,1),opacity .3s}",
    ".rbg-insa-head.on{opacity:1;transform:translate(-50%,0)}",
    ".rbg-insa-htag{flex:0 0 auto;display:flex;align-items:center;padding:0 10px;background:#db4738;color:#fff;font:800 11px/1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.12em}",
    ".rbg-insa-head.good .rbg-insa-htag{background:#3d8a4c}.rbg-insa-head.news .rbg-insa-htag{background:#201d1b;color:#f1ad2a}",
    ".rbg-insa-htx{min-width:0;padding:9px 14px 8px;font:800 17px/1.15 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.03em}",
    /* alt şerit: hız ve takvim */
    ".rbg-insa-strip{position:absolute;left:0;right:0;bottom:0;height:var(--strip);display:flex;align-items:center;gap:12px;padding:0 10px;z-index:6;background:linear-gradient(180deg,rgba(25,24,23,.8),rgba(25,24,23,.95));border-top:1px solid rgba(242,230,199,.1)}",
    ".rbg-insa-spd{flex:0 0 auto;display:flex;gap:3px;padding:3px;background:rgba(0,0,0,.3);border:1px solid rgba(242,230,199,.1);border-radius:7px}",
    ".rbg-insa-spd button{width:44px;height:44px;display:grid;place-items:center;border-radius:5px;color:#d8cfbb;transition:background-color .15s,color .15s}",
    ".rbg-insa-spd button svg{width:17px;height:17px}",
    ".rbg-insa-spd button:hover{background:rgba(242,230,199,.08)}",
    ".rbg-insa-spd button.on{background:#f1ad2a;color:#201d1b}",
    ".rbg-insa-cal{flex:1;min-width:0}",
    ".rbg-insa-cl{display:flex;align-items:baseline;gap:8px;white-space:nowrap;overflow:hidden}",
    ".rbg-insa-cl b{font:400 18px/1 var(--f-display,'Anton',sans-serif);letter-spacing:.04em}",
    ".rbg-insa-cl span{" + FC.replace("10px", "11px") + "color:var(--muted,#a8a091)}",
    ".rbg-insa-cl em{margin-left:auto;font:800 11px/1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.12em;font-style:normal;color:#f1ad2a;opacity:0;transition:opacity .2s}",
    ".rbg-insa-strip.paused .rbg-insa-cl em{opacity:1;animation:rbg-insa-blink 1.2s infinite}",
    ".rbg-insa-cal.flip b{animation:rbg-insa-flip .5s ease-out}",
    ".rbg-insa-pips{display:flex;gap:3px;height:7px;margin-top:7px}",
    ".rbg-insa-pip{position:relative;flex:1;border-radius:2px;overflow:hidden;background:rgba(242,230,199,.1)}",
    ".rbg-insa-pip i{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:0 50%;transform:scaleX(0);background:#f1ad2a}",
    ".rbg-insa-pip.done i{background:#b37a1a}",
    /* lejant */
    ".rbg-insa-leg{position:absolute;left:10px;bottom:calc(var(--strip) + 8px);z-index:4;display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:7px 9px;background:rgba(25,24,23,.74);border:1px solid rgba(242,230,199,.1);border-radius:5px;pointer-events:none;" + FC.replace("10px", "9.5px") + "color:var(--muted,#a8a091);white-space:nowrap}",
    ".rbg-insa-leg span{display:inline-flex;align-items:center;gap:6px}",
    ".rbg-insa-sw{display:inline-block;width:16px;height:10px;border-radius:2px}",
    ".rbg-insa-sw.grad{width:34px;background:linear-gradient(90deg,#d64032 18%,#e26e2c 27%,#f1a52a 38%,#eebe3c 50%,#b2be4e 58%,#66b86b 68%,#40a060)}",
    ".rbg-insa-sw.hatch{background:repeating-linear-gradient(135deg,#eb503e 0 2px,rgba(90,23,18,.7) 2px 5px)}",
    ".rbg-insa-sw.dash{border:2px dashed #f1ad2a}",
    /* bölge kartı */
    ".rbg-insa-card{position:absolute;left:8px;top:60px;width:266px;max-height:calc(100% - var(--hud) - var(--strip) - 12px);overflow:auto;z-index:7;padding:10px 10px 9px;background:linear-gradient(180deg,rgba(45,43,41,.98),rgba(30,29,27,.98));border:1px solid rgba(242,230,199,.16);border-top:2px solid #f1ad2a;border-radius:6px;box-shadow:0 16px 40px rgba(0,0,0,.55);opacity:0;transform:translateY(8px) scale(.96);transition:opacity .16s,transform .22s cubic-bezier(.2,.7,.1,1);pointer-events:none}",
    ".rbg-insa-card.on{opacity:1;transform:none;pointer-events:auto}",
    ".rbg-insa-card.ins{border-top-color:#db4738}",
    ".rbg-insa-chd{display:flex;align-items:flex-start;gap:8px}",
    ".rbg-insa-cnm{flex:1;min-width:0}",
    ".rbg-insa-cnm b{display:block;font:800 21px/1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".rbg-insa-cnm span{display:block;margin-top:4px;" + FC + "letter-spacing:.12em;color:var(--muted,#a8a091);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".rbg-insa-cx{flex:0 0 auto;width:44px;height:44px;margin:-9px -9px -6px 0;display:grid;place-items:center;border-radius:6px;color:#a8a091}",
    ".rbg-insa-cx svg{width:16px;height:16px}.rbg-insa-cx:hover{color:#f2ebd9;background:rgba(242,230,199,.06)}",
    ".rbg-insa-cst{display:flex;align-items:center;gap:8px;margin:6px 0 2px}",
    ".rbg-insa-csv{min-width:26px;font:400 20px/1 var(--f-display,'Anton',sans-serif)}",
    ".rbg-insa-cbar{position:relative;flex:1;min-width:50px;height:6px;border-radius:3px;background:rgba(0,0,0,.45)}",
    ".rbg-insa-cbar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:3px;background:#f1ad2a;transition:width .3s,background-color .3s}",
    ".rbg-insa-cbar u{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:#ece4d0;opacity:.8}",
    ".rbg-insa-tagc{flex:0 0 auto;padding:4px 6px 3px;border-radius:3px;font:800 10px/1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.1em;background:rgba(102,184,107,.18);color:#86d38a}",
    ".rbg-insa-tagc.con{background:rgba(241,173,42,.16);color:#f1ad2a}.rbg-insa-tagc.ins,.rbg-insa-tagc.hq{background:rgba(219,71,56,.2);color:#ff8a76}",
    ".rbg-insa-cmeta{display:flex;flex-wrap:wrap;gap:12px;margin:6px 0 1px;" + FC.replace("10px", "10.5px") + "color:var(--muted,#a8a091)}",
    ".rbg-insa-cmeta span{display:inline-flex;align-items:center;gap:4px}.rbg-insa-cmeta svg{width:12px;height:12px}.rbg-insa-cmeta em{font-style:normal}",
    ".rbg-insa-bp{color:#6cb4ee}.rbg-insa-bg{color:#86d38a}",
    ".rbg-insa-note{display:none;margin:6px 0 1px;font:500 12.5px/1.3 var(--f-body,'Barlow',sans-serif);color:#d8cfbb}",
    ".rbg-insa-note.on{display:block}.rbg-insa-note.warn{color:#ff8a76}",
    ".rbg-insa-acts{margin-top:4px}",
    ".rbg-insa-card.hq .rbg-insa-acts{display:none}",
    ".rbg-insa-act{position:relative;display:flex;align-items:center;gap:10px;width:100%;min-height:50px;margin-top:6px;padding:6px 8px;text-align:left;background:rgba(242,230,199,.05);border:1px solid rgba(242,230,199,.1);border-radius:5px;transition:background-color .15s,border-color .15s,transform .08s,opacity .2s}",
    ".rbg-insa-act:hover{background:rgba(241,173,42,.1);border-color:rgba(241,173,42,.45)}",
    ".rbg-insa-act:active{transform:scale(.97)}",
    ".rbg-insa-act.off{opacity:.42}.rbg-insa-act.off:hover{background:rgba(242,230,199,.05);border-color:rgba(242,230,199,.1)}",
    ".rbg-insa-act.nope{animation:rbg-insa-nope .35s}",
    ".rbg-insa-aic{flex:0 0 auto;width:32px;height:32px;display:grid;place-items:center;border-radius:6px}",
    ".rbg-insa-aic svg{width:18px;height:18px}",
    ".rbg-insa-act[data-k=hosp] .rbg-insa-aic{background:rgba(92,181,140,.16);color:#5cb58c}",
    ".rbg-insa-act[data-k=post] .rbg-insa-aic{background:rgba(82,161,224,.16);color:#6cb4ee}",
    ".rbg-insa-act[data-k=school] .rbg-insa-aic{background:rgba(241,173,42,.16);color:#f1ad2a}",
    ".rbg-insa-atx{flex:1;min-width:0}",
    ".rbg-insa-atx b{display:block;font:800 13.5px/1.05 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.06em}",
    ".rbg-insa-atx small{display:block;margin-top:3px;font:500 11.5px/1.2 var(--f-body,'Barlow',sans-serif);color:var(--muted,#a8a091)}",
    ".rbg-insa-ds{display:none !important}",
    ".rbg-insa-acost{flex:0 0 auto;display:flex;align-items:center;gap:4px;font:400 18px/1 var(--f-display,'Anton',sans-serif);color:#f1ad2a}",
    ".rbg-insa-acost svg{width:14px;height:14px}",
    /* dar ekran */
    ".rbg-insa-narrow .rbg-insa-st{padding:0 8px}",
    ".rbg-insa-narrow .rbg-insa-val{font-size:17px;gap:4px}",
    ".rbg-insa-narrow .rbg-insa-coin{width:14px;height:14px}",
    ".rbg-insa-narrow .rbg-insa-chip{left:8px}",
    ".rbg-insa-narrow .rbg-insa-htx{padding:8px 10px 7px;font-size:14.5px}",
    ".rbg-insa-narrow .rbg-insa-htag{padding:0 7px;font-size:10px}",
    ".rbg-insa-narrow .rbg-insa-strip{gap:9px;padding:0 6px}",
    ".rbg-insa-narrow .rbg-insa-cl b{font-size:16px}",
    ".rbg-insa-narrow .rbg-insa-leg{flex-direction:row;gap:10px;padding:5px 8px;left:8px}",
    ".rbg-insa-narrow .rbg-insa-card{padding:8px 10px}",
    ".rbg-insa-narrow .rbg-insa-cnm b{font-size:18px}",
    ".rbg-insa-narrow .rbg-insa-acts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:7px}",
    ".rbg-insa-narrow .rbg-insa-card.hq .rbg-insa-acts{display:none}",
    ".rbg-insa-narrow .rbg-insa-act{flex-direction:column;align-items:flex-start;gap:5px;min-height:72px;margin:0;padding:7px 6px 6px}",
    ".rbg-insa-narrow .rbg-insa-aic{width:26px;height:26px}",
    ".rbg-insa-narrow .rbg-insa-aic svg{width:15px;height:15px}",
    ".rbg-insa-narrow .rbg-insa-acost{position:absolute;right:6px;top:8px;font-size:16px}",
    ".rbg-insa-narrow .rbg-insa-atx b{font-size:11.5px;letter-spacing:.04em}",
    ".rbg-insa-narrow .rbg-insa-atx small{font-size:10.5px}",
    ".rbg-insa-narrow .rbg-insa-dl{display:none !important}",
    ".rbg-insa-narrow .rbg-insa-ds{display:block !important}",
    /* giriş / bitiş kâğıdı */
    ".rbg-insa-ov{position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;padding:12px;background:radial-gradient(ellipse at center,rgba(25,24,23,.3),rgba(12,11,10,.84));opacity:0;pointer-events:none;transition:opacity .35s}",
    ".rbg-insa-ov.on{opacity:1;pointer-events:auto}",
    ".rbg-insa-paper{position:relative;width:100%;max-width:440px;max-height:100%;overflow:auto;padding:24px 24px 20px;color:#201d1b;background-color:#ece4d0;background-image:radial-gradient(ellipse at 18% 8%,rgba(255,255,255,.4),transparent 55%),radial-gradient(ellipse at 88% 92%,rgba(150,115,60,.18),transparent 60%),repeating-linear-gradient(0deg,transparent 0 27px,rgba(32,29,27,.055) 27px 28px);border-radius:3px;box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.25);transform:rotate(-.7deg) translateY(14px);transition:transform .5s cubic-bezier(.2,.7,.1,1)}",
    ".rbg-insa-ov.on .rbg-insa-paper{transform:rotate(-.7deg)}",
    ".rbg-insa-paper:before{content:'';position:absolute;left:50%;top:0;width:92px;height:16px;margin-left:-46px;background:rgba(241,173,42,.36);transform:rotate(1.5deg)}",
    ".rbg-insa-stamp{position:absolute;right:14px;top:16px;padding:5px 8px 4px;border:3px solid currentColor;border-radius:3px;color:rgba(200,56,44,.78);font:800 13px/1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.16em;transform:rotate(8deg)}",
    ".rbg-insa-kick{" + FC.replace("10px", "11px") + "letter-spacing:.14em;color:#61594f}",
    ".rbg-insa-stamp+.rbg-insa-kick{padding-right:110px}",
    ".rbg-insa-h1{margin:9px 0 3px;font:400 38px/1 var(--f-display,'Anton',sans-serif);letter-spacing:.01em}",
    ".rbg-insa-script{font:400 22px/1.1 var(--f-script,'Caveat',cursive);color:#a86f14}",
    ".rbg-insa-li{display:flex;align-items:flex-start;gap:10px;margin:10px 0;font:500 14.5px/1.35 var(--f-body,'Barlow',sans-serif)}",
    ".rbg-insa-lic{flex:0 0 auto;width:26px;height:26px;display:grid;place-items:center;border-radius:5px;background:#201d1b;color:#f1ad2a}",
    ".rbg-insa-lic svg{width:15px;height:15px}",
    ".rbg-insa-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:12px;border-top:1px dashed rgba(32,29,27,.28)}",
    ".rbg-insa-best{" + FC.replace("10px", "12px") + "color:#61594f}.rbg-insa-best b{font:400 20px/1 var(--f-display,'Anton',sans-serif);color:#201d1b;margin-left:4px}",
    ".rbg-insa-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;min-width:148px;padding:0 22px;border-radius:4px;background:#f1ad2a;color:#201d1b;font:800 17px/1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.14em;box-shadow:0 3px 0 #b37a1a,0 8px 18px rgba(0,0,0,.25);transition:transform .1s,box-shadow .1s,background-color .15s}",
    ".rbg-insa-btn:hover{background:#ffc247}.rbg-insa-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #b37a1a}",
    ".rbg-insa-btn[disabled]{opacity:.55;cursor:default}",
    ".rbg-insa-badge{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:42px;margin:12px 0 8px}",
    ".rbg-insa-big{position:relative;display:inline-block;padding:6px 9px 5px;border:3px solid currentColor;border-radius:3px;font:800 14px/1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.16em;opacity:0;transform:rotate(-7deg) scale(2.4)}",
    ".rbg-insa-big.win{color:rgba(52,128,66,.85)}.rbg-insa-big.lose{color:rgba(200,56,44,.85)}",
    ".rbg-insa-ov.on .rbg-insa-big{animation:rbg-insa-stamp .42s .3s cubic-bezier(.3,1.5,.5,1) forwards}",
    ".rbg-insa-sub{margin:6px 0 2px;font:500 14px/1.35 var(--f-body,'Barlow',sans-serif);color:#3d3731}",
    ".rbg-insa-stars{display:flex;gap:6px}",
    ".rbg-insa-star{width:32px;height:32px;color:rgba(32,29,27,.16)}.rbg-insa-star svg{width:100%;height:100%}",
    ".rbg-insa-star.on{color:#f1ad2a;filter:drop-shadow(0 1px 0 #b37a1a);animation:rbg-insa-pop .45s cubic-bezier(.3,1.6,.5,1) backwards}",
    ".rbg-insa-rows{margin-top:6px;border-top:1px dashed rgba(32,29,27,.28)}",
    ".rbg-insa-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed rgba(32,29,27,.28);font:500 14px/1.1 var(--f-body,'Barlow',sans-serif)}",
    ".rbg-insa-row b{font:700 15px/1.1 var(--f-caps,'Barlow Condensed',sans-serif);letter-spacing:.04em;white-space:nowrap}",
    ".rbg-insa-score{display:flex;align-items:baseline;justify-content:space-between;margin-top:10px}",
    ".rbg-insa-score span{" + FC.replace("10px", "13px") + "letter-spacing:.14em;color:#61594f}",
    ".rbg-insa-score b{font:400 44px/1 var(--f-display,'Anton',sans-serif)}",
    ".rbg-insa-nb{font:400 23px/1 var(--f-script,'Caveat',cursive);color:#61594f}.rbg-insa-nb.new{color:#c0392b;transform:rotate(-3deg);display:inline-block}",
    ".rbg-insa-narrow .rbg-insa-paper{padding:20px 16px 16px}",
    ".rbg-insa-narrow .rbg-insa-h1{font-size:31px}",
    ".rbg-insa-narrow .rbg-insa-li{margin:8px 0;font-size:13.5px}",
    ".rbg-insa-narrow .rbg-insa-score b{font-size:38px}",
    "@keyframes rbg-insa-chip{0%{opacity:0;transform:translateY(-12px)}15%{opacity:1;transform:translateY(-3px)}70%{opacity:1}100%{opacity:0;transform:translateY(8px)}}",
    "@keyframes rbg-insa-pulse{0%{transform:scale(1)}35%{transform:scale(1.14)}100%{transform:scale(1)}}",
    "@keyframes rbg-insa-blink{50%{opacity:.35}}",
    "@keyframes rbg-insa-flip{0%{opacity:0;transform:translateY(-6px)}100%{opacity:1;transform:none}}",
    "@keyframes rbg-insa-nope{20%{transform:translateX(-5px)}45%{transform:translateX(5px)}70%{transform:translateX(-3px)}100%{transform:none}}",
    "@keyframes rbg-insa-stamp{0%{opacity:0;transform:rotate(-7deg) scale(2.4)}100%{opacity:.92;transform:rotate(-7deg) scale(1)}}",
    "@keyframes rbg-insa-pop{0%{opacity:0;transform:scale(.2) rotate(-40deg)}100%{opacity:1;transform:none}}"
  ].join("\n");

  /* istikrar merceği: kırmızı <25, hardal 25–55, yeşil >55, yumuşak geçiş (101 renk) */
  var LUT = (function () {
    var st = [[0, [150, 34, 30]], [18, [214, 64, 50]], [27, [226, 110, 44]], [38, [241, 165, 42]], [50, [238, 190, 60]],
      [58, [178, 190, 78]], [68, [102, 184, 107]], [100, [64, 160, 96]]], out = [];
    for (var v = 0; v <= 100; v++) {
      var k = 1;
      while (k < st.length - 1 && st[k][0] < v) k++;
      var a = st[k - 1], b = st[k], t = Math.max(0, Math.min(1, (v - a[0]) / (b[0] - a[0])));
      out.push("rgb(" + Math.round(a[1][0] + (b[1][0] - a[1][0]) * t) + "," + Math.round(a[1][1] + (b[1][1] - a[1][1]) * t) +
        "," + Math.round(a[1][2] + (b[1][2] - a[1][2]) * t) + ")");
    }
    return out;
  })();
  var SPARK = ["#ffd27a", "#f1ad2a", "#fff4d6", "#ffc247"], FIRE = ["#ff6a3d", "#db4738", "#ffb347", "#5a1712"],
    DUST = ["#c7bba3", "#a8987c", "#e3d6bb"], CONF = ["#66b86b", "#9be39f", "#f1ad2a", "#fff4d6"], BLOOD = ["#db4738", "#ff8a66"];
  var FLASH = ["#fff4d6", "#ff4a36", "#7fe08a"], DOTS = [0.5, 3.6], DASH = [7, 5], NODASH = [], TAU = Math.PI * 2;

  function trUp(s) { return String(s).replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function segDist(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1];
    return Math.sqrt(x * x + y * y);
  }

  function parsePath(d) {
    var tok = String(d).match(/[MLZmlz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [], polys = [], cur = null, cmd = "M", i = 0;
    while (i < tok.length) {
      var t = tok[i];
      if (/^[MLZmlz]$/.test(t)) { cmd = t.toUpperCase(); i++; if (cmd === "Z") cur = null; continue; }
      var x = parseFloat(tok[i]), y = parseFloat(tok[i + 1]);
      i += 2;
      if (isNaN(x) || isNaN(y)) continue;
      if (cmd === "M" || !cur) { cur = []; polys.push(cur); cmd = "L"; }
      cur.push([x, y]);
    }
    return polys;
  }

  function markup(T) {
    var pips = "", acts = "", i;
    for (i = 0; i < 12; i++) pips += '<span class="rbg-insa-pip"><i></i></span>';
    ["hosp", "post", "school"].forEach(function (k) {
      var a = T.acts[k];
      acts += '<button class="rbg-insa-b rbg-insa-act" data-k="' + k + '"><span class="rbg-insa-aic">' + ICON[k] + '</span>' +
        '<span class="rbg-insa-atx"><b>' + a[0] + '</b><small class="rbg-insa-dl">' + a[1] + '</small><small class="rbg-insa-ds">' + a[2] +
        '</small></span><span class="rbg-insa-acost">' + ICON.coin + RULES.cost[k] + '</span></button>';
    });
    return '<canvas class="rbg-insa-cv"></canvas>' +
      '<div class="rbg-insa-hud">' +
        '<div class="rbg-insa-st"><span class="rbg-insa-lbl">' + T.budget + '</span><span class="rbg-insa-val rbg-insa-vb">' + ICON.coin +
          '<b>0</b></span><span class="rbg-insa-chip"></span></div>' +
        '<div class="rbg-insa-st"><span class="rbg-insa-lbl">' + T.legit + '</span><span class="rbg-insa-val rbg-insa-vl"><b>0%</b></span>' +
          '<span class="rbg-insa-mbar"><i></i></span></div>' +
        '<div class="rbg-insa-st rbg-insa-sc"><span class="rbg-insa-lbl">' + T.control + '</span><span class="rbg-insa-val">' +
          '<span class="rbg-insa-k g"><b>0</b></span><span class="rbg-insa-k c"><b>0</b></span><span class="rbg-insa-k r"><b>0</b></span></span></div>' +
        '<div class="rbg-insa-st"><span class="rbg-insa-lbl">' + T.month + '</span><span class="rbg-insa-val rbg-insa-vm"><b>1</b><small>/12</small></span></div>' +
      '</div>' +
      '<div class="rbg-insa-head"><span class="rbg-insa-htag"></span><span class="rbg-insa-htx"></span></div>' +
      '<div class="rbg-insa-leg"><span><i class="rbg-insa-sw grad"></i>' + T.leg[0] + '</span><span><i class="rbg-insa-sw dash"></i>' + T.leg[1] +
        '</span><span><i class="rbg-insa-sw hatch"></i>' + T.leg[2] + '</span></div>' +
      '<div class="rbg-insa-strip"><div class="rbg-insa-spd">' +
        '<button class="rbg-insa-b" data-s="0" aria-label="' + T.speed[0] + '">' + ICON.pause + '</button>' +
        '<button class="rbg-insa-b on" data-s="1" aria-label="' + T.speed[1] + '">' + ICON.play + '</button>' +
        '<button class="rbg-insa-b" data-s="2" aria-label="' + T.speed[2] + '">' + ICON.fast + '</button></div>' +
        '<div class="rbg-insa-cal"><div class="rbg-insa-cl"><b>' + T.months[0] + '</b><span>· ' + T.year + '</span><em>' + T.paused + '</em></div>' +
        '<div class="rbg-insa-pips">' + pips + '</div></div></div>' +
      '<div class="rbg-insa-card" role="dialog">' +
        '<div class="rbg-insa-chd"><div class="rbg-insa-cnm"><b></b><span></span></div><button class="rbg-insa-b rbg-insa-cx" aria-label="' + T.close + '">' + ICON.x + '</button></div>' +
        '<div class="rbg-insa-cst"><span class="rbg-insa-lbl">' + T.stab + '</span><b class="rbg-insa-csv">0</b><span class="rbg-insa-cbar"><i></i><u></u></span>' +
          '<span class="rbg-insa-tagc"></span></div>' +
        '<div class="rbg-insa-cmeta"><span class="rbg-insa-bp">' + ICON.post + '<em></em></span>' +
          '<span class="rbg-insa-bg">' + ICON.grow + '<em></em></span></div>' +
        '<div class="rbg-insa-note"></div><div class="rbg-insa-acts">' + acts + '</div>' +
      '</div>' +
      '<div class="rbg-insa-ov on"><div class="rbg-insa-paper"></div></div>';
  }

  window.RBGames.insa = {
    title: { tr: "Yeniden İnşa", en: "Rebuild" },
    mount: function (el, ctx) {
      var L = ctx.lang === "en" ? "en" : "tr", T = LANG[L], up = L === "tr" ? trUp : function (s) { return String(s).toUpperCase(); };
      var reduce = false;
      try { reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
      var root = document.createElement("div");
      root.className = "rbg-insa-root";
      root.setAttribute("lang", L);
      root.innerHTML = "<style>" + CSS + "</style>" + markup(T);
      el.appendChild(root);
      function $(s) { return root.querySelector(s); }
      function $$(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }

      var cv = $(".rbg-insa-cv"), g = cv.getContext("2d");
      var bgc = document.createElement("canvas"), bgx = bgc.getContext("2d");
      var SHIELD = new Path2D(SHIELD_D), ARROW = new Path2D("M12 20V7M6 12l6-6 6 6");
      var hVb = $(".rbg-insa-vb"), hB = hVb.querySelector("b"), hChip = $(".rbg-insa-chip"), hL = $(".rbg-insa-vl b"),
        hLB = $(".rbg-insa-mbar i"), hSc = $(".rbg-insa-sc"), hK = $$(".rbg-insa-k b"), hM = $(".rbg-insa-vm b");
      var head = $(".rbg-insa-head"), hTag = $(".rbg-insa-htag"), hTx = $(".rbg-insa-htx");
      var strip = $(".rbg-insa-strip"), spdBtns = $$(".rbg-insa-spd button"), calEl = $(".rbg-insa-cal"), cMn = $(".rbg-insa-cl b"),
        pips = $$(".rbg-insa-pip"), pipI = pips.map(function (p) { return p.firstChild; });
      var card = $(".rbg-insa-card"), cNm = $(".rbg-insa-cnm b"), cRole = $(".rbg-insa-cnm span"), cSv = $(".rbg-insa-csv"),
        cBarI = $(".rbg-insa-cbar i"), cBarU = $(".rbg-insa-cbar u"), cTag = $(".rbg-insa-tagc"), cMeta = $(".rbg-insa-cmeta"),
        cBp = $(".rbg-insa-bp"), cBpN = cBp.querySelector("em"), cBg = $(".rbg-insa-bg"), cBgN = cBg.querySelector("em"),
        cNote = $(".rbg-insa-note"), actBtns = $$(".rbg-insa-act");
      var ov = $(".rbg-insa-ov"), paper = $(".rbg-insa-paper"), snum = null;

      var dead = false, hostPaused = false, raf = 0, last = 0, time = 0, ro = null;
      var state = "intro", speed = 1, sim = null, map = null, img = null, ready = false, failed = false;
      var W = 0, H = 0, dpr = 1, narrow = false, hudH = 54, stripH = 58, s = 1, ox = 0, oy = 0, kk = 1, labelFs = 11;
      var BX = 0, BY = 0, BW = 1, BH = 1, VW = 2100, VH = 1400;
      var pts = [], scr = [], paths = [], borderLines = [], borderPath = null, pairPt = {}, UPN = [], hatch = null;
      var disp = [], flashV = [], flashC = [];
      var sel = -1, hov = -1, hintOn = true, dirty = true, endT = 0, countT = 1, endScore = 0;
      var shakeA = 0, shx = 0, shy = 0, chipAmt = 0, chipT = 9, spreadSnd = false, bigSnd = false, fellSnd = false;
      var downId = null, dx0 = 0, dy0 = 0, BP = { x: 0, y: 0 }, PT = { x: 0, y: 0 }, cnt = {}, lat = [];
      var hc = {}, cc = {}, ck = {};

      /* ---------- efekt havuzları ---------- */
      function mk(n, f) { var a = []; for (var i = 0; i < n; i++) a.push(f()); return a; }
      var parts = mk(260, function () { return { on: false, x: 0, y: 0, vx: 0, vy: 0, g: 0, t: 0, d: 1, z: 2, c: "#fff" }; });
      var rings = mk(28, function () { return { on: false, x: 0, y: 0, r0: 0, r1: 0, t: 0, d: 1, c: "#fff", w: 2, a: 1 }; });
      var flts = mk(36, function () { return { on: false, x: 0, y: 0, t: 0, d: 1, s: "", c: "#fff", z: 14 }; });
      var strk = mk(18, function () { return { on: false, x1: 0, y1: 0, x2: 0, y2: 0, t: 0, d: 0.5, a: 0 }; });
      var pI = 0;
      function grab(pool) { for (var i = 0; i < pool.length; i++) if (!pool[i].on) return pool[i]; return pool[0]; }
      function part() {
        for (var k = 0; k < parts.length; k++) { pI = (pI + 1) % parts.length; if (!parts[pI].on) return parts[pI]; }
        return parts[pI];
      }
      function burst(x, y, n, cols, sp, life, size, grav, upv) {
        for (var i = 0; i < n; i++) {
          var p = part(), a = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.7) * kk;
          p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - (upv || 0) * kk;
          p.g = grav * kk; p.t = 0; p.d = life * (0.6 + Math.random() * 0.6);
          p.z = size * (0.6 + Math.random() * 0.8) * Math.max(0.8, kk); p.c = cols[i % cols.length];
        }
      }
      function ring(x, y, r0, r1, dur, col, w, a) {
        var r = grab(rings);
        r.on = true; r.x = x; r.y = y; r.r0 = r0 * kk; r.r1 = r1 * kk; r.t = 0; r.d = dur; r.c = col; r.w = w; r.a = a;
      }
      function flt(x, y, txt, col, z, dur) {
        var f = grab(flts);
        f.on = true; f.x = x; f.y = y; f.s = txt; f.c = col; f.z = z; f.t = 0; f.d = dur || 1.3;
      }
      function streak(a, b, amt) {
        var st = grab(strk), pa = scr[a.i], pb = scr[b.i];
        st.on = true; st.x1 = pa.x; st.y1 = pa.y; st.x2 = pb.x; st.y2 = pb.y; st.t = 0; st.d = 0.55 + Math.random() * 0.2; st.a = amt;
      }
      function shake(v) { if (!reduce) shakeA = Math.max(shakeA, v); }
      function later(t, f) { lat.push({ t: t, f: f }); }

      /* ---------- harita hazırlığı ---------- */
      function prepMap() {
        VW = (map.view && map.view[0]) || 2100; VH = (map.view && map.view[1]) || 1400;
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        pts = map.districts.map(function (d) {
          var polys = parsePath(d.d);
          polys.forEach(function (poly) {
            poly.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
          });
          return polys;
        });
        BX = x0; BY = y0; BW = Math.max(1, x1 - x0); BH = Math.max(1, y1 - y0);
        UPN = map.districts.map(function (d) { return up(d.name); });
        /* komşu sınırları yalnız yaklaşık çakışır (≈4 px): ortak kenarı bir kez çiz, cephe okları için çift başına sınır noktası topla */
        var TOL = 6, segs = [], boxes = [], acc = {}, lines = [];
        function edge(a, b) {
          var e = 2.5;
          return (a[0] < x0 + e && b[0] < x0 + e) || (a[0] > x1 - e && b[0] > x1 - e) || (a[1] < y0 + e && b[1] < y0 + e) || (a[1] > y1 - e && b[1] > y1 - e);
        }
        pts.forEach(function (polys) {
          var bb = [1e9, 1e9, -1e9, -1e9], list = [];
          polys.forEach(function (poly) {
            for (var j = 0; j < poly.length; j++) {
              var a = poly[j], b = poly[(j + 1) % poly.length];
              list.push([a, b]);
              bb[0] = Math.min(bb[0], a[0]); bb[1] = Math.min(bb[1], a[1]); bb[2] = Math.max(bb[2], a[0]); bb[3] = Math.max(bb[3], a[1]);
            }
          });
          segs.push(list); boxes.push([bb[0] - TOL, bb[1] - TOL, bb[2] + TOL, bb[3] + TOL]);
        });
        function near(m, j) {
          var bb = boxes[j], L = segs[j];
          if (m[0] < bb[0] || m[0] > bb[2] || m[1] < bb[1] || m[1] > bb[3]) return false;
          for (var q = 0; q < L.length; q++) if (segDist(m, L[q][0], L[q][1]) < TOL) return true;
          return false;
        }
        segs.forEach(function (list, i) {
          var cur = null;
          list.forEach(function (sg) {
            var a = sg[0], b = sg[1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dup = false;
            for (var j = 0; j < segs.length; j++) {
              if (j === i || !near(m, j)) continue;
              var pk = Math.min(i, j) * 64 + Math.max(i, j);
              (acc[pk] || (acc[pk] = [])).push(m);
              if (j < i) dup = true;
            }
            if (dup || edge(a, b)) { cur = null; return; }
            if (!cur || cur[cur.length - 1] !== a) { cur = [a]; lines.push(cur); }
            cur.push(b);
          });
        });
        borderLines = lines;
        pairPt = {};
        Object.keys(acc).forEach(function (pk) {
          var l = acc[pk], mx = 0, my = 0, best = l[0], bd = 1e18;
          l.forEach(function (p) { mx += p[0]; my += p[1]; });
          mx /= l.length; my /= l.length;
          l.forEach(function (p) { var dd = (p[0] - mx) * (p[0] - mx) + (p[1] - my) * (p[1] - my); if (dd < bd) { bd = dd; best = p; } });
          pairPt[pk] = best;
        });
      }

      function fit() {
        var x0 = 8, x1 = W - 8, y0 = hudH + 8, y1 = H - stripH - 8;
        var aw = Math.max(40, x1 - x0), ah = Math.max(40, y1 - y0);
        s = Math.min(aw / BW, ah / BH);
        ox = x0 + (aw - BW * s) / 2 - BX * s;
        oy = y0 + (ah - BH * s) / 2 - BY * s;
        kk = clamp(s / 0.32, 0.65, 1.3);
        labelFs = clamp(Math.round(6 + s * 16), 9, 13);
      }

      function buildPaths() {
        paths = []; scr = [];
        pts.forEach(function (polys, i) {
          var P = new Path2D();
          polys.forEach(function (poly) {
            for (var j = 0; j < poly.length; j++) {
              var x = ox + poly[j][0] * s, y = oy + poly[j][1] * s;
              if (j) P.lineTo(x, y); else P.moveTo(x, y);
            }
            P.closePath();
          });
          paths.push(P);
          var c = map.districts[i].c || polys[0][0];
          scr.push({ x: ox + c[0] * s, y: oy + c[1] * s });
        });
        borderPath = new Path2D();
        borderLines.forEach(function (ln) {
          for (var j = 0; j < ln.length; j++) {
            var x = ox + ln[j][0] * s, y = oy + ln[j][1] * s;
            if (j) borderPath.lineTo(x, y); else borderPath.moveTo(x, y);
          }
        });
      }

      function buildBg() {
        bgc.width = cv.width; bgc.height = cv.height;
        var b = bgx, x, y;
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        b.fillStyle = "#191817"; b.fillRect(0, 0, W, H);
        b.strokeStyle = "rgba(242,230,199,.035)"; b.lineWidth = 1; b.beginPath();
        for (x = 0.5; x < W; x += 28) { b.moveTo(x, 0); b.lineTo(x, H); }
        for (y = 0.5; y < H; y += 28) { b.moveTo(0, y); b.lineTo(W, y); }
        b.stroke();
        if (map) {
          var iw = VW * s, ih = VH * s;
          b.save(); b.shadowColor = "rgba(0,0,0,.65)"; b.shadowBlur = 28; b.fillStyle = "#0f0e0d"; b.fillRect(ox, oy, iw, ih); b.restore();
          if (img) {
            b.drawImage(img, ox, oy, iw, ih);
            b.fillStyle = "rgba(22,20,18,.16)"; b.fillRect(ox, oy, iw, ih);
          }
        }
        var gr = b.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.78);
        gr.addColorStop(0, "rgba(10,9,8,0)"); gr.addColorStop(1, "rgba(10,9,8,.5)");
        b.fillStyle = gr; b.fillRect(0, 0, W, H);
      }

      function buildHatch() {
        var c = document.createElement("canvas"), n = Math.max(6, Math.round(9 * dpr)), x = c.getContext("2d");
        c.width = c.height = n;
        x.strokeStyle = "rgba(235,80,62,.95)"; x.lineWidth = 1.7 * dpr; x.beginPath();
        x.moveTo(-2, n + 2); x.lineTo(n + 2, -2); x.moveTo(-2, 2); x.lineTo(2, -2); x.moveTo(n - 2, n + 2); x.lineTo(n + 2, n - 2);
        x.stroke();
        hatch = g.createPattern(c, "repeat");
        if (hatch && hatch.setTransform && window.DOMMatrix) {
          try { hatch.setTransform(new window.DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0])); } catch (e) {}
        }
      }

      function layout() {
        var r = root.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
        var nd = Math.min(2, window.devicePixelRatio || 1);
        if (w === W && h === H && nd === dpr) return;
        W = w; H = h; dpr = nd;
        narrow = W < 560;
        hudH = narrow || H < 420 ? 46 : 54; stripH = narrow || H < 420 ? 54 : 58;
        root.classList.toggle("rbg-insa-narrow", narrow);
        root.style.setProperty("--hud", hudH + "px"); root.style.setProperty("--strip", stripH + "px");
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        if (map) { fit(); buildPaths(); }
        buildBg(); buildHatch();
        if (sel >= 0) placeCard();
        dirty = true;
      }

      /* ---------- simülasyon olayları → görsel/ses ---------- */
      function P(d) { return scr[d.i]; }
      function border(i, j) {
        var p = pairPt[Math.min(i, j) * 64 + Math.max(i, j)];
        if (p) { BP.x = ox + p[0] * s; BP.y = oy + p[1] * s; } else { BP.x = (scr[i].x + scr[j].x) / 2; BP.y = (scr[i].y + scr[j].y) / 2; }
        return BP;
      }
      function onSim(type, a, b, c) {
        var p;
        if (!scr.length) return;
        switch (type) {
          case "act":
            p = P(a); flashV[a.i] = 0.9; flashC[a.i] = 0;
            ctx.sfx("insaat", 0.6);
            ring(p.x, p.y, 6, 36, 0.6, "#f1ad2a", 2.5, 0.9);
            burst(p.x, p.y, 18, SPARK, 70, 0.9, 3, 25, 45);
            flt(p.x, p.y - 14 * kk, "+" + Math.round(c), "#9be39f", 21, 1.3);
            budgetChip(-RULES.cost[b]);
            break;
          case "fall":
            p = P(a); flashV[a.i] = 1; flashC[a.i] = 1;
            ring(p.x, p.y, 8, 74, 0.95, "#db4738", 4, 1); ring(p.x, p.y, 4, 40, 0.6, "#ff8a66", 2, 0.8);
            burst(p.x, p.y, 26, FIRE, 95, 1.1, 3.5, 40, 25);
            flt(p.x, p.y - 16 * kk, T.fltFall, "#ff6b57", 19, 1.9);
            shake(9);
            headline(T.hFall(a.name), "bad");
            if (!fellSnd) { ctx.voice("dusme_1"); ctx.sfx("kotu", 0.7); }
            fellSnd = true; bigSnd = true;
            if (sim && sim.insCount() === RULES.loseIns - 1) headline(T.hEdge, "bad");
            if (a.i === sel) fillCard();
            break;
          case "retake":
            p = P(a); flashV[a.i] = 1; flashC[a.i] = 2;
            ring(p.x, p.y, 8, 82, 1.0, "#66b86b", 4, 1);
            burst(p.x, p.y, 30, CONF, 115, 1.3, 3.5, 70, 60);
            flt(p.x, p.y - 16 * kk, T.fltRetake, "#9be39f", 19, 1.9);
            headline(T.hRetake(a.name), "good");
            ctx.voice("geri_alindi_1"); ctx.sfx("iyi", 0.7);
            if (a.i === sel) fillCard();
            break;
          case "spread":
            streak(a, b, c); spreadSnd = true;
            break;
          case "blocked":
            p = border(a.i, b.i);
            ring(p.x, p.y, 4, 22, 0.6, "#6cb4ee", 2.5, 1);
            break;
          case "quake":
            p = P(a); flashV[a.i] = 0.8; flashC[a.i] = 0;
            shake(14); ctx.sfx("olay", 0.8); bigSnd = true;
            ring(p.x, p.y, 10, 120, 1.2, "#e3d6bb", 3, 0.9); ring(p.x, p.y, 6, 70, 0.8, "#c7bba3", 2, 0.7);
            burst(p.x, p.y, 34, DUST, 80, 1.4, 4, 12, 18);
            flt(p.x, p.y - 14 * kk, "−" + RULES.quake, "#ff8a76", 21, 1.5);
            a.n.forEach(function (id) {
              var d = sim.byId[id];
              if (!d.ins) { var q = P(d); flt(q.x, q.y - 12 * kk, "−" + RULES.quakeN, "#ffb4a6", 15, 1.3); burst(q.x, q.y, 8, DUST, 40, 1, 3, 10, 10); }
            });
            headline(T.hQuake(a.name), "bad");
            break;
          case "donor":
            ctx.sfx("iyi", 0.6); headline(T.hDonor, "good"); budgetChip(a); bigSnd = true;
            break;
          case "attack":
            p = P(a); flashV[a.i] = 1; flashC[a.i] = 1;
            shake(11); ctx.sfx("patlama2", 0.75); bigSnd = true;
            ring(p.x, p.y, 6, 60, 0.7, "#ffb347", 3.5, 1);
            burst(p.x, p.y, 34, FIRE, 130, 1.0, 4, 60, 30);
            if (c) ring(p.x, p.y, 10, 30, 0.9, "#6cb4ee", 3, 1);
            flt(p.x, p.y - 14 * kk, "−" + b, "#ff6b57", 22, 1.5);
            headline(c ? T.hAttackHeld(a.name) : T.hAttack(a.name), "bad");
            break;
          case "grow":
            if (b > 0) { p = P(a); flt(p.x + 10 * kk, p.y - 8 * kk, "+" + Math.round(b), "#9be39f", 14, 1.2); }
            break;
          case "income":
            budgetChip(a);
            break;
          case "month":
            calEl.classList.remove("flip"); void calEl.offsetWidth; calEl.classList.add("flip");
            sim.D.forEach(function (d) { if (d.ins) { var q = P(d); ring(q.x, q.y, 4, 30, 0.9, "#db4738", 2, 0.55); } });
            if (spreadSnd && !bigSnd) ctx.sfx("kotu", 0.3);
            spreadSnd = bigSnd = fellSnd = false;
            if (a === RULES.months - 1) headline(T.hFinal, "news");
            if (sel >= 0) updateCard(true);
            break;
          case "end":
            state = "ending"; endT = 1.6;
            spreadSnd = bigSnd = fellSnd = false;
            closeCard();
            break;
        }
      }

      function budgetChip(v) {
        if (chipT < 0.4 && (chipAmt > 0) === (v > 0)) chipAmt += v; else chipAmt = v;
        chipT = 0;
        hChip.textContent = (chipAmt > 0 ? "+" : "−") + Math.abs(chipAmt);
        hChip.className = "rbg-insa-chip"; void hChip.offsetWidth; hChip.className = "rbg-insa-chip " + (chipAmt > 0 ? "up" : "dn");
        hVb.classList.remove("pulse"); void hVb.offsetWidth; hVb.classList.add("pulse");
      }

      /* ---------- manşet ---------- */
      var hq = [], hOn = false, hT = 0, hGap = 0;
      function headline(txt, kind) { hq.push({ txt: txt, kind: kind }); if (hq.length > 4) hq.shift(); }
      function heads(dt) {
        if (hOn) { hT -= dt; if (hT <= 0) { hOn = false; head.classList.remove("on"); hGap = 0.42; } return; }
        if (hGap > 0) { hGap -= dt; return; }
        if (!hq.length) return;
        var h = hq.shift();
        hTag.textContent = h.kind === "good" ? T.tagGood : h.kind === "news" ? T.tagNews : T.tagBad;
        hTx.textContent = h.txt;
        head.className = "rbg-insa-head " + h.kind;
        void head.offsetWidth;
        head.classList.add("on");
        hOn = true; hT = hq.length ? 1.9 : 2.7;
      }

      /* ---------- HUD ve takvim ---------- */
      function hud() {
        var S = sim.S, l = sim.legit(), m = Math.min(RULES.months, S.month + 1);
        if (S.budget !== hc.b) { hc.b = S.budget; hB.textContent = S.budget; }
        if (l !== hc.l) { hc.l = l; hL.textContent = l + "%"; hLB.style.transform = "scaleX(" + (l / 100) + ")"; hLB.style.backgroundColor = LUT[clamp(l, 0, 100)]; }
        sim.counts(cnt);
        if (cnt.gov !== hc.g) { hc.g = cnt.gov; hK[0].textContent = cnt.gov; }
        if (cnt.con !== hc.c) { hc.c = cnt.con; hK[1].textContent = cnt.con; }
        if (cnt.ins !== hc.i) { hc.i = cnt.ins; hK[2].textContent = cnt.ins; hSc.classList.toggle("crit", cnt.ins >= RULES.loseIns - 2); }
        if (m !== hc.m) { hc.m = m; hM.textContent = m; }
      }
      function cal() {
        var S = sim.S, m = Math.min(11, S.month), i;
        if (m !== cc.m) {
          cc.m = m; cc.f = -1; cMn.textContent = T.months[m];
          for (i = 0; i < 12; i++) { pips[i].classList.toggle("done", i < S.month); pipI[i].style.transform = i < S.month ? "scaleX(1)" : "scaleX(0)"; }
        }
        if (S.month >= 12) {
          if (!cc.full) { cc.full = 1; for (i = 0; i < 12; i++) { pips[i].classList.add("done"); pipI[i].style.transform = "scaleX(1)"; } }
          return;
        }
        if (Math.abs(S.t - cc.f) > 0.004) { cc.f = S.t; pipI[S.month].style.transform = "scaleX(" + S.t.toFixed(3) + ")"; }
      }
      function setSpeed(v) {
        speed = v;
        spdBtns.forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-s") === v); });
        strip.classList.toggle("paused", v === 0);
      }

      /* ---------- bölge kartı ---------- */
      function roleText(d) { return (d.role && T.roles[d.role]) || T.terr[d.terrain] || ""; }
      function select(i) {
        if (!sim || state !== "play") return;
        sel = i; hintOn = false;
        ctx.sfx("ui_tik", 0.5);
        fillCard();
        card.classList.add("on");
        placeCard();
      }
      function closeCard() { sel = -1; card.classList.remove("on"); }
      function fillCard() {
        var d = sim.D[sel];
        cNm.textContent = UPN[sel];
        cRole.textContent = roleText(d) + " · " + T.pop + " " + T.popU(d.pop);
        updateCard(true);
      }
      function updateCard(force) {
        var d = sim.D[sel], sv = Math.round(d.stab), b = sim.S.budget, j;
        if (!force && sv === ck.sv && d.ins === ck.ins && d.post === ck.post && d.grow === ck.grow && b === ck.b) return;
        ck.sv = sv; ck.ins = d.ins; ck.post = d.post; ck.grow = d.grow; ck.b = b;
        card.classList.toggle("hq", d.hq); card.classList.toggle("ins", d.ins);
        cSv.textContent = d.hq ? "—" : sv;
        cBarI.style.width = (d.hq ? 0 : sv) + "%";
        cBarI.style.backgroundColor = d.ins ? "#db4738" : LUT[clamp(sv, 0, 100)];
        cBarU.style.left = (d.ins ? RULES.retake : RULES.fall) + "%";
        cBarU.style.display = d.hq ? "none" : "";
        var st = d.hq ? "hq" : d.ins ? "ins" : sv < RULES.contested ? "con" : "gov";
        cTag.textContent = T.st[st]; cTag.className = "rbg-insa-tagc " + st;
        cMeta.style.display = d.post > 0 || d.grow > 0 ? "" : "none";
        cBp.style.display = d.post > 0 ? "" : "none"; cBpN.textContent = T.mo(d.post);
        cBg.style.display = d.grow > 0 ? "" : "none"; cBgN.textContent = T.mo(d.grow);
        var note = d.hq ? T.noteHq : d.ins ? T.noteIns : sv < RULES.danger ? T.noteDanger : "";
        var nk = (note ? note.length * 4 : 0) + (d.post > 0 ? 2 : 0) + (d.grow > 0 ? 1 : 0);
        cNote.textContent = note;
        cNote.className = "rbg-insa-note" + (note ? " on" : "") + (note && !d.hq && !d.ins ? " warn" : "");
        for (j = 0; j < actBtns.length; j++) {
          var off = !sim.can(d, actBtns[j].getAttribute("data-k"));
          actBtns[j].classList.toggle("off", off);
          actBtns[j].setAttribute("aria-disabled", off ? "true" : "false");
        }
        if (nk !== ck.nk || force) { ck.nk = nk; placeCard(); }
      }
      function placeCard() {
        if (sel < 0 || !scr.length) return;
        var top = hudH + 6, bot = H - stripH - 6, cw = narrow ? W - 16 : Math.min(268, W - 16), ch, x, y, p = scr[sel];
        card.style.width = cw + "px";
        ch = Math.min(card.offsetHeight, bot - top);
        if (narrow) {
          x = 8;
          var yTop = top, yBot = bot - ch, mid = (top + bot) / 2;
          var okTop = p.y > yTop + ch + 12, okBot = p.y < yBot - 12;
          if (p.y > mid) y = okTop ? yTop : okBot ? yBot : yTop;
          else y = okBot ? yBot : okTop ? yTop : yBot;
        } else {
          var gap = 26 * kk + 12;
          x = p.x + gap;
          if (x + cw > W - 8) x = p.x - gap - cw;
          y = p.y - ch / 2;
        }
        x = clamp(x, 8, Math.max(8, W - 8 - cw));
        y = clamp(y, top, Math.max(top, bot - ch));
        card.style.left = Math.round(x) + "px"; card.style.top = Math.round(y) + "px";
      }
      function doAct(k, btn) {
        if (state !== "play" || sel < 0 || !sim) return;
        var d = sim.D[sel];
        if (d.hq) return;
        if (!sim.can(d, k)) {
          ctx.sfx("ui_hata", 0.6);
          btn.classList.remove("nope"); void btn.offsetWidth; btn.classList.add("nope");
          return;
        }
        sim.act(sel, k);
        if (sel >= 0) updateCard(true);
      }

      /* ---------- akış ---------- */
      function introHtml() {
        var ic = [ICON.hosp, ICON.warn, ICON.flag], li = "";
        T.intro.lines.forEach(function (t, i) { li += '<div class="rbg-insa-li"><span class="rbg-insa-lic">' + ic[i] + '</span><span>' + t + '</span></div>'; });
        var lbl = failed ? T.intro.error : ready ? T.intro.start : T.intro.loading;
        return '<span class="rbg-insa-stamp">' + T.intro.stamp + '</span>' +
          '<div class="rbg-insa-kick">' + T.intro.kick + '</div><div class="rbg-insa-h1">' + T.intro.title + '</div>' +
          '<div class="rbg-insa-script">' + T.intro.note + '</div>' + li +
          '<div class="rbg-insa-foot"><span class="rbg-insa-best">' + T.intro.best + '<b>' + (ctx.best() || 0) + '</b></span>' +
          '<button class="rbg-insa-b rbg-insa-btn" data-a="start"' + (ready ? "" : " disabled") + '>' + lbl + '</button></div>';
      }
      function endHtml(r) {
        var S = sim.S, legit = sim.legit(), held = sim.held(), st = sim.stars(), E = T.end, title, sub, i, stars = "";
        if (S.won) { title = E.win; sub = E.winSub(held); }
        else if (S.reason === "fallen") { title = E.lose; sub = E.loseSub(sim.insCount() - 1); }
        else { title = E.short; sub = E.shortSub(held); }
        for (i = 0; i < 3; i++) stars += '<span class="rbg-insa-star' + (i < st ? " on" : "") + '" style="animation-delay:' + (0.75 + i * 0.22).toFixed(2) + 's">' + ICON.star + '</span>';
        var nb = r.newBest ? '<span class="rbg-insa-nb new">' + E.newBest + '</span>' : '<span class="rbg-insa-nb">' + E.best + ': ' + (r.best || 0) + '</span>';
        return '<div class="rbg-insa-kick">' + T.intro.kick + '</div><div class="rbg-insa-h1">' + title + '</div>' +
          '<div class="rbg-insa-sub">' + sub + '</div>' +
          '<div class="rbg-insa-badge"><span class="rbg-insa-big ' + (S.won ? "win" : "lose") + '">' + (S.won ? E.stampWin : E.stampLose) + '</span>' +
            (S.won ? '<div class="rbg-insa-stars">' + stars + '</div>' : "") + '</div>' +
          '<div class="rbg-insa-rows">' +
            '<div class="rbg-insa-row"><span>' + E.rows[0] + '</span><b>' + legit + '% × 10 = ' + legit * 10 + '</b></div>' +
            '<div class="rbg-insa-row"><span>' + E.rows[1] + '</span><b>' + held + '/' + sim.D.length + ' × 100 = ' + held * 100 + '</b></div>' +
            '<div class="rbg-insa-row"><span>' + E.rows[2] + '</span><b>' + S.budget + ' × 5 = ' + S.budget * 5 + '</b></div>' +
          '</div>' +
          '<div class="rbg-insa-score"><span>' + E.score + '</span><b class="rbg-insa-snum">0</b></div>' +
          '<div class="rbg-insa-foot">' + nb + '<button class="rbg-insa-b rbg-insa-btn" data-a="again">' + E.again + '</button></div>';
      }
      function resetFx() {
        [parts, rings, flts, strk].forEach(function (pool) { pool.forEach(function (o) { o.on = false; }); });
        hq.length = 0; hOn = false; hGap = 0; head.classList.remove("on");
        lat.length = 0; shakeA = 0; chipT = 9;
      }
      function newSim() {
        sim = createSim(map, Math.random, onSim);
        disp = sim.D.map(function (d) { return d.stab; });
        flashV = sim.D.map(function () { return 0; }); flashC = sim.D.map(function () { return 0; });
        hc = {}; cc = {}; ck = {};
      }
      function start() {
        if (!ready || dead) return;
        if (state === "end" || !sim || sim.S.over || sim.S.month > 0 || sim.S.t > 0) newSim();
        resetFx(); closeCard();
        state = "play"; hintOn = true; setSpeed(1);
        cv.style.touchAction = "none";
        ov.classList.remove("on");
        ctx.sfx("ui_onay", 0.7); ctx.sfx("telsiz", 0.35);
        headline(T.hStart, "news");
        hud(); cal();
        dirty = true;
      }
      function showEnd() {
        state = "end";
        cv.style.touchAction = "auto";
        var S = sim.S, sc = sim.score();
        var r = ctx.onEnd({ score: sc, won: S.won }) || {};
        endScore = sc; countT = 0;
        paper.innerHTML = endHtml(r);
        snum = paper.querySelector(".rbg-insa-snum");
        paper.scrollTop = 0;
        ov.classList.add("on");
        later(0.36, function () { ctx.sfx("damga", 0.8); });
        if (S.won) later(0.95, function () { ctx.voice("zafer_1"); });
        if (r.newBest) later(1.5, function () { ctx.sfx("basarim", 0.7); });
        dirty = true;
      }

      /* ---------- giriş ---------- */
      function local(e) { var r = cv.getBoundingClientRect(); PT.x = e.clientX - r.left; PT.y = e.clientY - r.top; return PT; }
      function hitTest(x, y) {
        var i;
        g.setTransform(1, 0, 0, 1, 0, 0);
        for (i = 0; i < paths.length; i++) if (g.isPointInPath(paths[i], x, y)) return i;
        if (g.isPointInStroke) {
          g.lineWidth = 10;
          for (i = 0; i < paths.length; i++) if (g.isPointInStroke(paths[i], x, y)) return i;
        }
        return -1;
      }
      function onDown(e) {
        if (state !== "play") return;
        downId = e.pointerId; var p = local(e); dx0 = p.x; dy0 = p.y;
      }
      function onUp(e) {
        if (state !== "play" || e.pointerId !== downId) return;
        downId = null;
        var p = local(e);
        if (Math.abs(p.x - dx0) + Math.abs(p.y - dy0) > 16) return;
        var i = hitTest(p.x, p.y);
        if (i < 0 || i === sel) { if (sel >= 0) ctx.sfx("ui_tik", 0.3); closeCard(); }
        else select(i);
      }
      function onMove(e) {
        if (e.pointerType !== "mouse") return;
        var i = state === "play" ? hitTest(local(e).x, PT.y) : -1;
        if (i !== hov) { hov = i; cv.style.cursor = i >= 0 ? "pointer" : "default"; }
      }
      function onLeave() { hov = -1; downId = null; }
      function noMenu(e) { e.preventDefault(); }
      cv.addEventListener("pointerdown", onDown);
      cv.addEventListener("pointerup", onUp);
      cv.addEventListener("pointermove", onMove);
      cv.addEventListener("pointerleave", onLeave);
      cv.addEventListener("pointercancel", onLeave);
      cv.addEventListener("contextmenu", noMenu);
      card.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest("button") : null;
        if (!b) return;
        if (b.classList.contains("rbg-insa-cx")) { ctx.sfx("ui_tik", 0.3); closeCard(); return; }
        var k = b.getAttribute("data-k");
        if (k) doAct(k, b);
      });
      strip.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest("[data-s]") : null;
        if (!b || state !== "play") return;
        ctx.sfx("ui_tik", 0.4);
        setSpeed(+b.getAttribute("data-s"));
      });
      ov.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest("[data-a]") : null;
        if (!b || b.disabled) return;
        start();
      });

      /* ---------- çizim ---------- */
      function drawShield(x, y, z, al) {
        g.save(); g.globalAlpha = al; g.translate(x - z / 2, y - z / 2); g.scale(z / 24, z / 24);
        g.lineWidth = 5; g.strokeStyle = "rgba(16,14,12,.85)"; g.lineJoin = "round"; g.stroke(SHIELD);
        g.fillStyle = "#52a1e0"; g.fill(SHIELD);
        g.restore();
      }
      function drawFront() {
        var D = sim.D, ph = (time * 0.8) % 1, i, q, c;
        g.lineCap = "round"; g.lineJoin = "round";
        for (i = 0; i < D.length; i++) {
          var a = D[i];
          if (!a.ins) continue;
          for (q = 0; q < a.n.length; q++) {
            var b = sim.byId[a.n[q]];
            if (b.ins) continue;
            var pa = scr[a.i], pb = scr[b.i], bp = border(a.i, b.i), bx = bp.x, by = bp.y;
            var ux = pb.x - pa.x, uy = pb.y - pa.y, ln = Math.sqrt(ux * ux + uy * uy) || 1;
            ux /= ln; uy /= ln;
            if (b.post > 0) { drawShield(bx, by, 13 * kk, 0.95); continue; }
            g.strokeStyle = "#ff5a45"; g.lineWidth = 2.3;
            for (c = 0; c < 2; c++) {
              var f = (c + ph) / 2, off = (f - 0.5) * 18 * kk, w = 4.5 * kk, cx = bx + ux * off, cy = by + uy * off;
              g.globalAlpha = Math.sin(f * Math.PI) * 0.95;
              g.beginPath();
              g.moveTo(cx - ux * w - uy * w, cy - uy * w + ux * w); g.lineTo(cx, cy); g.lineTo(cx - ux * w + uy * w, cy - uy * w - ux * w);
              g.stroke();
            }
            g.globalAlpha = 1;
          }
        }
      }
      function drawLabels(pulse) {
        var D = sim.D, fs = labelFs, bw = Math.round(fs * 2.7), bh = Math.max(3, Math.round(fs * 0.34)), iz = Math.round(fs * 0.95), i;
        var nameFont = "700 " + fs + "px " + CAPS, smallFont = "800 " + Math.max(8, fs - 2) + "px " + CAPS;
        g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
        for (i = 0; i < D.length; i++) {
          var d = D[i], p = scr[i], y = p.y - fs * 0.4, danger = !d.ins && d.stab < RULES.danger;
          g.font = nameFont; g.lineWidth = 3; g.strokeStyle = "rgba(16,14,12,.88)";
          g.strokeText(UPN[i], p.x, y);
          g.fillStyle = d.ins ? "#ff9c8c" : danger ? (pulse > 0.5 ? "#ffc0b4" : "#ff7a66") : i === sel ? "#ffd27a" : "#f4ecd8";
          g.fillText(UPN[i], p.x, y);
          var by = y + fs * 0.75;
          if (d.hq) {
            g.font = smallFont; g.lineWidth = 3; g.strokeText(T.st.hq, p.x, by + 3);
            g.fillStyle = "#ff5a45"; g.fillText(T.st.hq, p.x, by + 3);
            continue;
          }
          var x0 = Math.round(p.x - bw / 2), sv = clamp(Math.round(disp[i]), 0, 100), mk = d.ins ? RULES.retake : RULES.fall;
          g.fillStyle = "rgba(16,14,12,.85)"; g.fillRect(x0 - 1, by - 1, bw + 2, bh + 2);
          g.fillStyle = d.ins ? "#db4738" : LUT[sv]; g.fillRect(x0, by, bw * sv / 100, bh);
          g.fillStyle = "rgba(244,236,216,.9)"; g.fillRect(x0 + Math.round(bw * mk / 100), by - 2, 1, bh + 4);
          var nb = (d.post > 0 ? 1 : 0) + (d.grow > 0 ? 1 : 0);
          if (!nb) continue;
          var itemW = iz + fs * 0.7, bx = p.x - nb * itemW / 2, cy = by + bh + 3 + iz / 2;
          g.font = smallFont; g.textAlign = "left";
          if (d.post > 0) {
            drawShield(bx + iz / 2, cy, iz, 1);
            g.lineWidth = 3; g.strokeText(d.post, bx + iz + 1, cy + 0.5); g.fillStyle = "#9fd0f7"; g.fillText(d.post, bx + iz + 1, cy + 0.5);
            bx += itemW;
          }
          if (d.grow > 0) {
            g.save(); g.translate(bx, cy - iz / 2); g.scale(iz / 24, iz / 24);
            g.lineCap = "round"; g.lineJoin = "round";
            g.lineWidth = 8; g.strokeStyle = "rgba(16,14,12,.85)"; g.stroke(ARROW);
            g.lineWidth = 3.6; g.strokeStyle = "#86d38a"; g.stroke(ARROW);
            g.restore();
            g.lineWidth = 3; g.strokeStyle = "rgba(16,14,12,.88)"; g.strokeText(d.grow, bx + iz + 1, cy + 0.5);
            g.fillStyle = "#b6ecb8"; g.fillText(d.grow, bx + iz + 1, cy + 0.5);
          }
          g.textAlign = "center";
        }
      }
      function drawFx() {
        var i, p, k, e;
        g.lineCap = "round";
        for (i = 0; i < strk.length; i++) {
          p = strk[i];
          if (!p.on) continue;
          k = Math.min(1, p.t / p.d); e = 1 - (1 - k) * (1 - k);
          var tl = Math.max(0, e - 0.4), x1 = p.x1 + (p.x2 - p.x1) * tl, y1 = p.y1 + (p.y2 - p.y1) * tl,
            x2 = p.x1 + (p.x2 - p.x1) * e, y2 = p.y1 + (p.y2 - p.y1) * e;
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
          g.strokeStyle = "#ff4a36"; g.globalAlpha = 0.3; g.lineWidth = 7 * kk; g.stroke();
          g.globalAlpha = 1; g.strokeStyle = "#ffb09e"; g.lineWidth = 2.4 * kk; g.stroke();
          g.fillStyle = "#fff0e0"; g.beginPath(); g.arc(x2, y2, 2.8 * kk, 0, TAU); g.fill();
        }
        for (i = 0; i < rings.length; i++) {
          p = rings[i];
          if (!p.on) continue;
          k = p.t / p.d; e = 1 - Math.pow(1 - k, 3);
          g.globalAlpha = (1 - k) * p.a; g.strokeStyle = p.c; g.lineWidth = p.w * (1 - k * 0.5);
          g.beginPath(); g.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * e, 0, TAU); g.stroke();
        }
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          if (!p.on) continue;
          k = p.t / p.d;
          var z = p.z * (1 - k * 0.5);
          g.globalAlpha = 1 - k; g.fillStyle = p.c; g.fillRect(p.x - z / 2, p.y - z / 2, z, z);
        }
        g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
        var fk = clamp(kk, 0.75, 1.15);
        for (i = 0; i < flts.length; i++) {
          p = flts[i];
          if (!p.on) continue;
          k = p.t / p.d;
          var al = k < 0.12 ? k / 0.12 : k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1, pop = k < 0.12 ? 1.35 - (k / 0.12) * 0.35 : 1;
          var y = p.y - 30 * kk * (1 - (1 - k) * (1 - k));
          g.globalAlpha = Math.max(0, al);
          g.font = "800 " + Math.round(p.z * pop * fk) + "px " + CAPS;
          g.lineWidth = 3.5; g.strokeStyle = "rgba(16,14,12,.9)"; g.strokeText(p.s, p.x, y);
          g.fillStyle = p.c; g.fillText(p.s, p.x, y);
        }
        g.globalAlpha = 1;
      }
      function drawHint() {
        if (state !== "play" || !hintOn || sel >= 0) return;
        var D = sim.D, best = -1, bv = 1e9, i;
        for (i = 0; i < D.length; i++) if (!D[i].ins && D[i].stab < bv) { bv = D[i].stab; best = i; }
        if (best < 0) return;
        var p = scr[best], k = (time * 0.9) % 1, bob = Math.sin(time * 4) * 2.5;
        g.strokeStyle = "#f1ad2a"; g.lineWidth = 2.5; g.globalAlpha = 1 - k;
        g.beginPath(); g.arc(p.x, p.y, (10 + 28 * k) * kk, 0, TAU); g.stroke();
        g.globalAlpha = 1;
        g.font = "800 " + (labelFs + 1) + "px " + CAPS; g.textAlign = "center"; g.textBaseline = "middle";
        var tw = g.measureText(T.tap).width + 14, th = labelFs + 9, ty = p.y - labelFs * 2.4 - th + bob;
        g.fillStyle = "#f1ad2a"; g.fillRect(p.x - tw / 2, ty, tw, th);
        g.beginPath(); g.moveTo(p.x - 5, ty + th); g.lineTo(p.x + 5, ty + th); g.lineTo(p.x, ty + th + 5); g.fill();
        g.fillStyle = "#201d1b"; g.fillText(T.tap, p.x, ty + th / 2 + 0.5);
      }
      function draw() {
        dirty = false;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = 1;
        g.fillStyle = "#191817"; g.fillRect(0, 0, W, H);
        if (shakeA > 0.2) g.translate(shx, shy);
        g.drawImage(bgc, 0, 0, W, H);
        if (!sim || !paths.length) return;
        var D = sim.D, i, d, pulse = 0.5 + 0.5 * Math.sin(time * 5.5), live = state === "play";
        for (i = 0; i < D.length; i++) {
          d = D[i];
          if (d.ins) {
            g.globalAlpha = 0.42; g.fillStyle = "#5a1712"; g.fill(paths[i]);
            if (hatch) { g.globalAlpha = 0.72; g.fillStyle = hatch; g.fill(paths[i]); }
          } else {
            g.globalAlpha = i === sel ? 0.56 : i === hov ? 0.5 : 0.42;
            g.fillStyle = LUT[clamp(Math.round(disp[i]), 0, 100)]; g.fill(paths[i]);
            if (live && d.stab < RULES.danger) { g.globalAlpha = 0.1 + 0.26 * pulse; g.fillStyle = "#e0402f"; g.fill(paths[i]); }
          }
          if (flashV[i] > 0.01) { g.globalAlpha = flashV[i] * 0.5; g.fillStyle = FLASH[flashC[i]]; g.fill(paths[i]); }
        }
        g.globalAlpha = 1; g.lineJoin = "round"; g.lineCap = "round";
        g.setLineDash(NODASH); g.strokeStyle = "rgba(18,16,14,.42)"; g.lineWidth = 2.4; g.stroke(borderPath);
        g.setLineDash(DOTS); g.strokeStyle = "rgba(236,228,208,.72)"; g.lineWidth = 1.3; g.stroke(borderPath);
        g.setLineDash(DASH); g.lineDashOffset = -time * 14; g.lineWidth = 2; g.strokeStyle = "#f1ad2a";
        for (i = 0; i < D.length; i++) if (!D[i].ins && D[i].stab < RULES.contested) g.stroke(paths[i]);
        g.lineDashOffset = 0; g.setLineDash(NODASH);
        g.strokeStyle = "rgba(219,71,56,.9)"; g.lineWidth = 1.6;
        for (i = 0; i < D.length; i++) if (D[i].ins) g.stroke(paths[i]);
        if (hov >= 0 && hov !== sel) { g.globalAlpha = 0.6; g.strokeStyle = "#ece4d0"; g.lineWidth = 1.6; g.stroke(paths[hov]); }
        if (sel >= 0) {
          var sp = paths[sel], gp = 0.75 + 0.25 * Math.sin(time * 4);
          g.strokeStyle = "#f1ad2a";
          g.globalAlpha = 0.16 * gp; g.lineWidth = 12; g.stroke(sp);
          g.globalAlpha = 0.32 * gp; g.lineWidth = 6; g.stroke(sp);
          g.globalAlpha = 1; g.strokeStyle = "#fff4d6"; g.lineWidth = 2; g.stroke(sp);
        }
        g.globalAlpha = 1;
        drawFront();
        drawLabels(pulse);
        drawFx();
        drawHint();
      }

      /* ---------- döngü ---------- */
      function update(dt) {
        var i, p, alive = 0;
        if (sim) {
          var a = Math.min(1, dt * 7);
          for (i = 0; i < sim.D.length; i++) {
            disp[i] += (sim.D[i].stab - disp[i]) * a;
            if (flashV[i] > 0) { flashV[i] = Math.max(0, flashV[i] - dt * 1.6); alive++; }
          }
        }
        if (shakeA > 0.2) {
          shakeA *= Math.exp(-dt * 7); shx = (Math.random() - 0.5) * shakeA; shy = (Math.random() - 0.5) * shakeA; alive++;
        } else { shakeA = 0; shx = shy = 0; }
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          if (!p.on) continue;
          p.t += dt;
          if (p.t >= p.d) { p.on = false; continue; }
          p.vy += p.g * dt; p.vx *= 1 - Math.min(1, dt * 1.4); p.x += p.vx * dt; p.y += p.vy * dt; alive++;
        }
        for (i = 0; i < rings.length; i++) { p = rings[i]; if (p.on) { p.t += dt; if (p.t >= p.d) p.on = false; else alive++; } }
        for (i = 0; i < flts.length; i++) { p = flts[i]; if (p.on) { p.t += dt; if (p.t >= p.d) p.on = false; else alive++; } }
        for (i = 0; i < strk.length; i++) {
          p = strk[i];
          if (!p.on) continue;
          p.t += dt; alive++;
          if (p.t >= p.d) {
            p.on = false;
            ring(p.x2, p.y2, 4, 28, 0.6, "#ff5a45", 2.5, 1);
            burst(p.x2, p.y2, 10, BLOOD, 60, 0.8, 3, 30, 15);
            flt(p.x2, p.y2 - 12 * kk, "−" + p.a, "#ff7a66", 17, 1.3);
          }
        }
        return alive;
      }
      function runLater(dt) {
        for (var i = lat.length - 1; i >= 0; i--) {
          if (!lat[i]) continue;
          lat[i].t -= dt;
          if (lat[i].t <= 0) { var f = lat[i].f; lat.splice(i, 1); f(); }
        }
      }
      function frame(ts) {
        raf = 0;
        if (dead || hostPaused) return;
        var dt = last ? (ts - last) / 1000 : 1 / 60;
        last = ts;
        dt = clamp(dt, 0, 0.1);
        time += dt; chipT += dt;
        if (state === "play" && sim) sim.advance(dt * speed);
        else if (state === "ending") { endT -= dt; if (endT <= 0) showEnd(); }
        var alive = update(dt);
        runLater(dt);
        heads(dt);
        if (sim && (state === "play" || state === "ending")) { hud(); cal(); if (sel >= 0) updateCard(false); }
        if (state === "end" && countT < 1 && snum) {
          countT = Math.min(1, countT + dt / 1.1);
          snum.textContent = Math.round(endScore * (1 - Math.pow(1 - countT, 3)));
        }
        if (state === "play" || state === "ending" || alive || dirty) draw();
        raf = requestAnimationFrame(frame);
      }

      /* ---------- yükleme ---------- */
      paper.innerHTML = introHtml();
      layout();
      if (window.ResizeObserver) { ro = new window.ResizeObserver(function () { if (!dead) layout(); }); ro.observe(root); }
      else window.addEventListener("resize", layout);
      raf = requestAnimationFrame(frame);

      var useK = (el.clientWidth || 800) * Math.min(2, window.devicePixelRatio || 1) <= 1100;
      var pJson = fetch(ctx.assets + "data/map_tarsel.json").then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
      var pImg = new Promise(function (res) {
        var im = new Image();
        im.decoding = "async";
        im.onload = function () { res(im); };
        im.onerror = function () { res(null); };
        im.src = ctx.assets + "img/map/tarsel_gun" + (useK ? "_k" : "") + ".webp";
      });
      var pFont = (document.fonts && document.fonts.load) ? Promise.all([
        document.fonts.load('700 12px "Barlow Condensed"'), document.fonts.load('800 12px "Barlow Condensed"'), document.fonts.load('12px "Anton"')
      ]).catch(function () {}) : Promise.resolve();
      Promise.all([pJson, pImg, pFont]).then(function (res) {
        if (dead) return;
        var m = res[0];
        if (!m || !m.districts || !m.districts.length) throw new Error("map");
        map = m; img = res[1];
        prepMap();
        W = 0; layout();
        newSim();
        hud(); cal();
        ready = true;
        if (state === "intro") paper.innerHTML = introHtml();
        dirty = true;
      }).catch(function () {
        if (dead) return;
        failed = true; ready = false;
        if (state === "intro") paper.innerHTML = introHtml();
      });

      return {
        pause: function () {
          hostPaused = true;
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
        },
        resume: function () {
          if (dead || !hostPaused) return;
          hostPaused = false; last = 0;
          if (!raf) raf = requestAnimationFrame(frame);
        },
        destroy: function () {
          dead = true;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          if (ro) ro.disconnect(); else window.removeEventListener("resize", layout);
          cv.removeEventListener("pointerdown", onDown);
          cv.removeEventListener("pointerup", onUp);
          cv.removeEventListener("pointermove", onMove);
          cv.removeEventListener("pointerleave", onLeave);
          cv.removeEventListener("pointercancel", onLeave);
          cv.removeEventListener("contextmenu", noMenu);
          lat.length = 0; hq.length = 0;
          if (root.parentNode) root.parentNode.removeChild(root);
          sim = null; map = null; img = null;
        }
      };
    }
  };
})();
