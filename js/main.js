/* ReBirth tanıtım sitesi — ana betik: dil, yükleme, gezinme, ses, kaydırmalı hikâye, videolar, efektler,
 * telsiz, kriz kartları, karşılaştırma, galeri, mini oyun salonu. GSAP yoksa da çalışır (yalnız süsler eksilir). */
(function () {
  "use strict";
  var doc = document.documentElement;
  var body = document.body;
  doc.classList.add("js");
  var I = window.RB_I18N || { tr: {}, en: {} };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hover = window.matchMedia("(hover: hover)").matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var G = window.gsap || null;
  /* sinematik giriş her açılışta baştan oynar; bağlantıda bölüm varsa perde kalkınca oraya gidilir */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  if (G && window.ScrollTrigger) { G.registerPlugin(window.ScrollTrigger); window.ScrollTrigger.clearScrollMemory("manual"); }

  /* ------------------------------------------------------------------ dil */
  var lang = (function () {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "tr" || q === "en") return q;
    try { var s = localStorage.getItem("rb_lang"); if (s === "tr" || s === "en") return s; } catch (e) {}
    var n = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    return /^tr/i.test(n) ? "tr" : "en";
  })();
  function t(k) {
    var v = (I[lang] || {})[k];
    if (v == null) v = (I.tr || {})[k];
    return v == null ? k : v;
  }
  window.RBSite = { t: t, lang: function () { return lang; } };

  function shot(name, small) { return "assets/img/shots/" + name + "_" + lang + (small ? "_k" : "") + ".webp"; }

  function applyLang(first) {
    doc.lang = lang;
    document.title = t("meta.title");
    var md = $('meta[name="description"]');
    if (md) md.setAttribute("content", t("meta.desc"));
    $$("[data-i18n]").forEach(function (e) { var v = t(e.getAttribute("data-i18n")); if (typeof v === "string") e.textContent = v; });
    $$("[data-i18n-html]").forEach(function (e) { e.innerHTML = t(e.getAttribute("data-i18n-html")); });
    splitTitles();
    $$("[data-i18n-attr]").forEach(function (e) {
      e.getAttribute("data-i18n-attr").split(",").forEach(function (p) {
        var kv = p.split(":");
        if (kv.length === 2) e.setAttribute(kv[0].trim(), t(kv[1].trim()));
      });
    });
    $("#soundBtn").setAttribute("aria-label", t("nav.sound"));
    $("#burger").setAttribute("aria-label", t("nav.menu"));
    $$("#langBtn [data-l]").forEach(function (s) { s.classList.toggle("is-on", s.getAttribute("data-l") === lang); });
    $$("a[data-keep-lang]").forEach(function (a) { a.href = a.getAttribute("data-keep-lang") + "?lang=" + lang; });
    buildTicker();
    buildCrisis(first);
    buildMoments();
    buildGallery();
    updateBests();
    if (!first) {
      document.dispatchEvent(new CustomEvent("rb:lang"));
      if (arc.started) mountGame(arc.id);
    }
  }
  $("#langBtn").addEventListener("click", function () {
    lang = lang === "tr" ? "en" : "tr";
    try { localStorage.setItem("rb_lang", lang); } catch (e) {}
    applyLang(false);
    sfx("ui_tik", 0.5);
  });

  function sfx(n, v) { if (window.RBHost) RBHost.sfx(n, v); }

  /* başlıklar kelime kelime maskeden yükselir */
  var titleIO = "IntersectionObserver" in window ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (!en.isIntersecting) return;
      titleIO.unobserve(en.target);
      en.target.classList.add("is-in");
      en.target.setAttribute("data-seen", "1");
    });
  }, { rootMargin: "0px 0px -10% 0px" }) : null;
  function splitTitles() {
    if (reduce || !titleIO) { doc.classList.add("no-split"); return; }
    $$(".title").forEach(function (h) {
      var txt = h.textContent.trim();
      h.innerHTML = txt.split(/\s+/).map(function (w, i) {
        return '<span class="w"><span style="--i:' + i + '">' + w + "</span></span>";
      }).join(" ");
      h.setAttribute("aria-label", txt);
      if (!h.getAttribute("data-seen")) titleIO.observe(h);
    });
  }

  /* ------------------------------------------------------------------ kayan şerit */
  function buildTicker() {
    var arr = t("ticker");
    if (!Array.isArray(arr)) return;
    var html = arr.map(function (s) { return "<span>" + s + "</span>"; }).join("");
    $("#ticker").innerHTML = html + html;
  }

  /* ------------------------------------------------------------------ kriz kartları */
  var CRISES = [
    { k: "c1", ico: "✚", c: "#66b86b", days: 120 }, { k: "c2", ico: "◎", c: "#db4738", days: 90 },
    { k: "c3", ico: "≋", c: "#52a1e0", days: 70 }, { k: "c4", ico: "☑", c: "#a985e6", days: 80 },
    { k: "c5", ico: "➜", c: "#f1ad2a", days: 100 }, { k: "c6", ico: "◉", c: "#5cc9d6", days: 150 },
    { k: "c7", ico: "❄", c: "#bfe0ff", days: 90 }
  ];
  function buildCrisis(first) {
    var grid = $("#crisisGrid");
    grid.innerHTML = CRISES.map(function (c) {
      var tag = t(c.k + ".t") + " · " + t(c.k + ".m");
      return '<article class="ccard" tabindex="0" style="--c:' + c.c + '">' +
        '<div class="ccard__face ccard__front"><div class="ccard__icon">' + c.ico + "</div>" +
        '<div class="ccard__tag">' + tag + '</div><div class="ccard__name">' + t(c.k + ".n") + "</div>" +
        '<div class="ccard__meta"><span>' + c.days + " " + t("crisis.days") + '</span><span class="ccard__stars">★★★</span></div></div>' +
        '<div class="ccard__face ccard__back"><div class="ccard__tag">' + tag + '</div><div class="ccard__name">' + t(c.k + ".n") + "</div>" +
        "<p>" + t(c.k + ".b") + '</p><div class="ccard__order">' + t("crisis.start") + "</div></div></article>";
    }).join("");
    if (first) grid.classList.add("reveal");
  }
  $("#crisisGrid").addEventListener("click", function (e) {
    var c = e.target.closest(".ccard");
    if (!c) return;
    c.classList.toggle("is-flip");
    sfx(c.classList.contains("is-flip") ? "damga" : "ui_tik", 0.45);
  });
  $("#crisisGrid").addEventListener("keydown", function (e) {
    var c = e.target.closest(".ccard");
    if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); c.click(); }
  });

  /* ------------------------------------------------------------------ anlar ve galeri */
  var GAL = ["02_acilis", "03_deprem_tarsel", "10_hava_saldirisi", "04_sel_kesra", "05_kuraklik_varzan", "06_yeniden_insa",
    "07_gunbatimi", "11_catisma", "08_gece", "12_bolge_paneli", "13_birlik_emri", "14_olay_secimi"];
  function buildMoments() {
    $$("#moments img[data-shot]").forEach(function (img) {
      img.src = shot(img.getAttribute("data-shot"), true);
      var b = img.parentNode.querySelector("b");
      img.alt = b ? b.textContent : "";
    });
  }
  function buildGallery() {
    $("#galleryGrid").innerHTML = GAL.map(function (g, i) {
      return '<figure data-i="' + i + '"><img src="' + shot(g, true) + '" alt="ReBirth" loading="lazy" decoding="async"></figure>';
    }).join("");
  }
  $("#galleryGrid").addEventListener("click", function (e) {
    var f = e.target.closest("figure");
    if (f) openLightbox(GAL, +f.getAttribute("data-i"));
  });
  $("#moments").addEventListener("click", function (e) {
    var f = e.target.closest(".moment");
    if (!f) return;
    var list = $$("#moments img[data-shot]").map(function (i) { return i.getAttribute("data-shot"); });
    openLightbox(list, list.indexOf(f.querySelector("img").getAttribute("data-shot")));
  });

  var lb = { el: $("#lightbox"), img: $("#lightboxImg"), list: [], i: 0 };
  function openLightbox(list, i) {
    lb.list = list; lb.i = i;
    lb.img.src = shot(list[i], false);
    lb.el.classList.add("is-open");
    lb.el.setAttribute("aria-hidden", "false");
    body.style.overflow = "hidden";
    sfx("ui_tik", 0.4);
  }
  function stepLightbox(d) {
    lb.i = (lb.i + d + lb.list.length) % lb.list.length;
    lb.img.src = shot(lb.list[lb.i], false);
    if (G) G.fromTo(lb.img, { opacity: 0.2, x: d * 30 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" });
  }
  function closeLightbox() {
    lb.el.classList.remove("is-open");
    lb.el.setAttribute("aria-hidden", "true");
    body.style.overflow = "";
  }
  lb.el.addEventListener("click", function (e) {
    if (e.target === lb.img) stepLightbox(1);
    else closeLightbox();
  });
  (function () {
    var x0 = null;
    lb.el.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    lb.el.addEventListener("pointerup", function (e) {
      if (x0 != null && Math.abs(e.clientX - x0) > 50) { stepLightbox(e.clientX < x0 ? 1 : -1); e.stopPropagation(); }
      x0 = null;
    });
  })();

  /* ------------------------------------------------------------------ mini oyun salonu */
  var arc = { stage: $("#arcStage"), cur: null, id: "hava", started: false, visible: false };
  function updateBests() {
    $$(".arc-tab").forEach(function (b) {
      var v = window.RBHost ? RBHost.best(b.getAttribute("data-game")) : 0;
      b.querySelector(".arc-tab__best").textContent = v > 0 ? t("arc.best") + " " + v : "";
    });
  }
  function loadGame(id, cb) {
    if (window.RBGames && window.RBGames[id]) return cb();
    var s = document.createElement("script");
    s.src = "js/games/" + id + ".js";
    s.onload = cb;
    s.onerror = function () { arc.stage.innerHTML = '<div class="arcade__loading">—</div>'; };
    body.appendChild(s);
  }
  function mountGame(id) {
    if (arc.cur) { try { arc.cur.destroy(); } catch (e) {} arc.cur = null; }
    arc.id = id;
    arc.started = true;
    arc.stage.innerHTML = '<div class="arcade__loading">' + t("arc.loading") + "</div>";
    loadGame(id, function () {
      if (arc.id !== id) return;
      arc.stage.innerHTML = "";
      try { arc.cur = RBHost.mount(id, arc.stage, function () { updateBests(); }); } catch (e) { console.error(e); }
      if (!arc.visible && arc.cur && arc.cur.pause) arc.cur.pause();
    });
  }
  $("#arcTabs").addEventListener("click", function (e) {
    var b = e.target.closest(".arc-tab");
    if (!b || (b.classList.contains("is-on") && arc.started)) return;
    $$(".arc-tab").forEach(function (x) { x.classList.toggle("is-on", x === b); });
    sfx("ui_onay", 0.45);
    mountGame(b.getAttribute("data-game"));
  });
  new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      arc.visible = en.isIntersecting;
      if (en.isIntersecting) {
        if (!arc.started) mountGame(arc.id);
        else if (arc.cur && arc.cur.resume) arc.cur.resume();
      } else if (arc.cur && arc.cur.pause) arc.cur.pause();
    });
  }, { rootMargin: "120px 0px" }).observe(arc.stage);

  /* ------------------------------------------------------------------ ses: müzik + efekt + seslendirme */
  var music = null, soundOn = false, duck = 1, musicTween = null;
  try { if (localStorage.getItem("rb_mute") == null && window.RBHost) RBHost.setMuted(true); } catch (e) {}
  soundOn = window.RBHost ? !RBHost.isMuted() : false;
  var soundBtn = $("#soundBtn");
  function musicTarget() { return soundOn && !document.hidden ? 0.32 * duck : 0; }
  function fadeMusic() {
    if (!music) return;
    var target = musicTarget();
    if (target > 0 && music.paused) { var p = music.play(); if (p && p.catch) p.catch(function () {}); }
    if (musicTween) clearInterval(musicTween);
    musicTween = setInterval(function () {
      var v = music.volume + (target - music.volume) * 0.18;
      if (Math.abs(v - target) < 0.01) { v = target; clearInterval(musicTween); musicTween = null; if (v === 0) music.pause(); }
      music.volume = clamp(v, 0, 1);
    }, 40);
  }
  function setSound(on) {
    soundOn = on;
    if (window.RBHost) RBHost.setMuted(!on);
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on && !music) { music = new Audio("assets/audio/muzik_menu.mp3"); music.loop = true; music.volume = 0; }
    fadeMusic();
  }
  function setDuck(d) { duck = d; fadeMusic(); }
  soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
  soundBtn.addEventListener("click", function () { setSound(!soundOn); if (soundOn) sfx("ui_onay", 0.5); });
  if (soundOn) {
    /* daha önce sesi açmış ziyaretçi: müzik ilk dokunuşta başlar (tarayıcı otomatik çalma kuralı) */
    var kick = function () { setSound(true); window.removeEventListener("pointerdown", kick); window.removeEventListener("keydown", kick); };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
  }
  document.addEventListener("visibilitychange", fadeMusic);

  /* ------------------------------------------------------------------ telsiz (oyun içi seslendirme + dalga) */
  var radio = { el: $("#radio"), cv: $("#radioWave"), audio: null, actx: null, an: null, buf: null, live: false, visible: false, raf: 0, btn: null };
  radio.cx = radio.cv.getContext("2d");
  function radioSize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    radio.cv.width = Math.round(radio.cv.clientWidth * dpr);
    radio.cv.height = Math.round(60 * dpr);
  }
  function radioDraw(ts) {
    radio.raf = 0;
    var c = radio.cx, w = radio.cv.width, h = radio.cv.height;
    c.clearRect(0, 0, w, h);
    c.strokeStyle = "rgba(82,161,224,.12)";
    c.lineWidth = 1;
    for (var gx = 0; gx < w; gx += w / 24) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, h); c.stroke(); }
    c.lineWidth = Math.max(1.5, h / 30);
    c.strokeStyle = radio.live ? "#7fc4ff" : "rgba(127,196,255,.45)";
    c.beginPath();
    var n = 160, i, y;
    if (radio.live && radio.an) radio.an.getByteTimeDomainData(radio.buf);
    for (i = 0; i <= n; i++) {
      var x = (i / n) * w;
      if (radio.live && radio.an) {
        var v = (radio.buf[Math.floor((i / n) * (radio.buf.length - 1))] - 128) / 128;
        y = h / 2 + v * h * 0.9;
      } else {
        y = h / 2 + Math.sin(i * 0.35 + ts * 0.004) * h * 0.03 + (Math.random() - 0.5) * h * 0.05;
      }
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    if (radio.visible || radio.live) radio.raf = requestAnimationFrame(radioDraw);
  }
  function radioLoop() { if (!radio.raf) radio.raf = requestAnimationFrame(radioDraw); }
  function radioStop() {
    radio.live = false;
    radio.el.classList.remove("is-live");
    if (radio.btn) radio.btn.classList.remove("is-playing");
    setDuck(1);
  }
  radio.el.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-voice]");
    if (!b) return;
    if (!soundOn) setSound(true);
    if (!radio.actx) {
      try {
        radio.actx = new (window.AudioContext || window.webkitAudioContext)();
        radio.an = radio.actx.createAnalyser();
        radio.an.fftSize = 1024;
        radio.buf = new Uint8Array(radio.an.fftSize);
        radio.an.connect(radio.actx.destination);
      } catch (err) { radio.actx = null; }
    }
    if (radio.actx && radio.actx.state === "suspended") radio.actx.resume();
    if (radio.audio) { radio.audio.pause(); radioStop(); }
    var a = new Audio("assets/audio/ses/" + lang + "/" + b.getAttribute("data-voice") + ".mp3");
    radio.audio = a;
    if (radio.actx) { try { radio.actx.createMediaElementSource(a).connect(radio.an); } catch (err) {} }
    a.addEventListener("ended", function () { if (radio.audio === a) radioStop(); });
    radio.btn = b;
    b.classList.add("is-playing");
    radio.el.classList.add("is-live");
    radio.live = true;
    setDuck(0.3);
    var p = a.play();
    if (p && p.catch) p.catch(function () { radioStop(); });
    radioLoop();
  });

  /* ------------------------------------------------------------------ felaket efektleri (canvas) */
  var fxCards = $$(".dis[data-fx]").map(function (card) {
    var cv = card.querySelector(".dis__fx");
    return { card: card, type: card.getAttribute("data-fx"), cv: cv, cx: cv.getContext("2d"), p: [], vis: false, w: 0, h: 0, next: 0, flash: 0, haze: null };
  });
  function fxSize(f) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    f.w = f.cv.width = Math.round(f.cv.clientWidth * dpr);
    f.h = f.cv.height = Math.round(f.cv.clientHeight * dpr);
    f.p = [];
    var i, n;
    if (f.type === "rain") {
      n = 150;
      for (i = 0; i < n; i++) f.p.push({ x: Math.random() * f.w * 1.3, y: Math.random() * f.h, l: (10 + Math.random() * 18) * dpr, s: (9 + Math.random() * 9) * dpr });
    } else if (f.type === "dust") {
      n = 110;
      for (i = 0; i < n; i++) f.p.push({ x: Math.random() * f.w, y: Math.random() * f.h, r: (0.6 + Math.random() * 2.2) * dpr, s: (0.6 + Math.random() * 2.6) * dpr, a: 0.15 + Math.random() * 0.45, o: Math.random() * 6 });
      f.haze = f.cx.createLinearGradient(0, 0, f.w, 0);
      f.haze.addColorStop(0, "rgba(216,176,113,0)");
      f.haze.addColorStop(0.5, "rgba(216,176,113,.16)");
      f.haze.addColorStop(1, "rgba(216,176,113,0)");
    } else {
      for (i = 0; i < 70; i++) f.p.push({ live: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0, a: 0, dust: false });
    }
  }
  function quake(f) {
    f.card.classList.remove("is-shaking");
    void f.card.offsetWidth;
    f.card.classList.add("is-shaking");
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var pts = [[0.35, 0.46], [0.65, 0.48], [0.5, 0.5], [0.15, 0.53], [0.8, 0.4]];
    f.p.forEach(function (q, i) {
      var c = pts[i % pts.length];
      q.live = 1; q.dust = i % 3 === 0;
      q.x = c[0] * f.w + (Math.random() - 0.5) * 60 * dpr; q.y = c[1] * f.h;
      q.vx = (Math.random() - 0.5) * 3 * dpr; q.vy = q.dust ? -(0.3 + Math.random()) * dpr : -(2 + Math.random() * 4) * dpr;
      q.r = q.dust ? (8 + Math.random() * 16) * dpr : (1.5 + Math.random() * 3) * dpr;
      q.a = q.dust ? 0.35 : 1;
    });
    if (f.vis && soundOn) sfx("patlama2", 0.18);
    setTimeout(function () { f.card.classList.remove("is-shaking"); }, 1100);
  }
  var fxRaf = 0, fxLast = 0;
  function fxFrame(ts) {
    fxRaf = 0;
    var dt = Math.min(2.5, (ts - (fxLast || ts)) / 16.67);
    fxLast = ts;
    var any = false;
    fxCards.forEach(function (f) {
      if (!f.vis) return;
      any = true;
      var c = f.cx, w = f.w, h = f.h;
      c.clearRect(0, 0, w, h);
      if (f.type === "rain") {
        c.strokeStyle = "rgba(190,215,255,.38)";
        c.lineWidth = Math.max(1, w / 900);
        c.beginPath();
        f.p.forEach(function (d) {
          d.y += d.s * dt; d.x -= d.s * 0.28 * dt;
          if (d.y > h) { d.y = -d.l; d.x = Math.random() * w * 1.3; }
          c.moveTo(d.x, d.y); c.lineTo(d.x + d.l * 0.28, d.y - d.l);
        });
        c.stroke();
        if (ts > f.next) { f.flash = 1; f.next = ts + 4500 + Math.random() * 5000; }
        if (f.flash > 0) {
          c.fillStyle = "rgba(220,235,255," + (f.flash * 0.35).toFixed(3) + ")";
          c.fillRect(0, 0, w, h);
          f.flash -= 0.06 * dt;
        }
      } else if (f.type === "dust") {
        c.fillStyle = f.haze;
        var off = (ts * 0.05) % w;
        c.save(); c.translate(off - w, 0); c.fillRect(0, 0, w, h); c.translate(w, 0); c.fillRect(0, 0, w, h); c.restore();
        f.p.forEach(function (d) {
          d.x += d.s * dt; d.y += Math.sin(ts * 0.001 + d.o) * 0.3 * dt;
          if (d.x > w + 4) { d.x = -4; d.y = Math.random() * h; }
          c.globalAlpha = d.a;
          c.fillStyle = "#e0bd84";
          c.fillRect(d.x, d.y, d.r * 2, d.r);
        });
        c.globalAlpha = 1;
      } else {
        if (ts > f.next) { quake(f); f.next = ts + 6000 + Math.random() * 3000; }
        f.p.forEach(function (q) {
          if (!q.live) return;
          q.x += q.vx * dt; q.y += q.vy * dt;
          if (q.dust) { q.r += 0.25 * dt; q.a -= 0.006 * dt; } else { q.vy += 0.25 * dt; q.a -= 0.012 * dt; }
          if (q.a <= 0 || q.y > h + 10) { q.live = 0; return; }
          c.globalAlpha = Math.max(0, q.a);
          c.fillStyle = q.dust ? "#8a7a66" : "#2a201a";
          if (q.dust) { c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); } else c.fillRect(q.x, q.y, q.r, q.r);
        });
        c.globalAlpha = 1;
      }
    });
    if (any) fxRaf = requestAnimationFrame(fxFrame);
  }
  var fxIO = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      var f = fxCards.filter(function (x) { return x.card === en.target; })[0];
      if (!f) return;
      f.vis = en.isIntersecting && !reduce;
      if (f.vis) { if (!f.w) fxSize(f); if (f.type === "quake") f.next = performance.now() + 900; fxLast = 0; if (!fxRaf) fxRaf = requestAnimationFrame(fxFrame); }
    });
  }, { threshold: 0.15 });
  fxCards.forEach(function (f) {
    fxIO.observe(f.card);
    if (f.type === "quake") {
      f.card.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse" && f.w) { quake(f); f.next = performance.now() + 6000; } });
      f.card.addEventListener("click", function () { if (f.w) { quake(f); f.next = performance.now() + 6000; } });
    }
  });

  /* ------------------------------------------------------------------ videolar: yakınken yükle, görünürken oynat */
  var allVideos = [];
  $$("[data-video]").forEach(function (holder) {
    var v = holder.querySelector("video");
    v.setAttribute("data-src", holder.getAttribute("data-video"));
    if (holder.getAttribute("data-poster")) v.setAttribute("data-poster", holder.getAttribute("data-poster"));
  });
  $$("video[data-src]").forEach(function (v) { if (v.id !== "heroVideo") allVideos.push(v); });
  var noLoops = saveData || reduce;
  function ensureSrc(v) {
    if (!v.getAttribute("poster") && v.getAttribute("data-poster")) v.poster = v.getAttribute("data-poster");
    if (v.getAttribute("src") || noLoops) return;
    v.src = v.getAttribute("data-src");
  }
  function play(v) { if (noLoops || !v.getAttribute("src")) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  var loadIO = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) { if (en.isIntersecting) { ensureSrc(en.target); loadIO.unobserve(en.target); } });
  }, { rootMargin: "500px 0px" });
  var playIO = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (en.isIntersecting) { ensureSrc(en.target); play(en.target); } else en.target.pause();
    });
  }, { threshold: 0.12 });
  allVideos.forEach(function (v) { loadIO.observe(v); playIO.observe(v); });

  var heroVideo = $("#heroVideo");
  function startHeroVideo() {
    if (noLoops) return;
    var small = window.innerWidth < 900 || window.innerHeight < 500;
    heroVideo.src = small ? "assets/video/hero_m.mp4" : heroVideo.getAttribute("data-src");
    play(heroVideo);
    playIO.observe(heroVideo);
  }

  /* ------------------------------------------------------------------ yükleme perdesi */
  var loader = $("#loader"), loaderBar = $("#loaderBar");
  var need = ["assets/video/hero.jpg", "assets/img/cine/s1.webp", "assets/img/ui/menu_hero.svg"];
  var done = 0, total = need.length + 1, finished = false, t0 = Date.now();
  function tick() {
    done++;
    loaderBar.style.width = Math.round((done / total) * 100) + "%";
    if (done >= total) finish();
  }
  function refreshST() {
    if (!window.ScrollTrigger) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { window.ScrollTrigger.refresh(); }); });
  }
  window.addEventListener("load", refreshST);
  function finish() {
    if (finished) return;
    var wait = Math.max(0, 900 - (Date.now() - t0));
    finished = true;
    setTimeout(function () {
      loaderBar.style.width = "100%";
      loader.classList.add("is-done");
      body.classList.remove("is-loading");
      var target = location.hash && location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
      if (target) window.scrollTo({ top: target.offsetTop, behavior: "instant" });
      heroIntro();
      startHeroVideo();
      setTimeout(loadStory, 2600);
      refreshST();
    }, wait);
  }
  need.forEach(function (src) { var im = new Image(); im.onload = im.onerror = tick; im.src = src; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(tick); else tick();
  setTimeout(finish, 4500);

  /* ------------------------------------------------------------------ kahraman girişi + kaydırma süsleri */
  function heroIntro() {
    if (!G || reduce) return;
    var tl = G.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero__video", { scale: 1.22, duration: 2.6, ease: "power2.out" }, 0)
      .from(".hero__silhouette", { x: 90, opacity: 0, duration: 1.6 }, 0.3)
      .from(".hero__kicker", { y: 20, opacity: 0, duration: 0.7 }, 0.2)
      .from(".wordmark span", { y: 90, opacity: 0, duration: 1.1, stagger: 0.14 }, 0.3)
      .from(".hero__rule", { scaleX: 0, duration: 0.9, stagger: 0.1 }, 0.7)
      .from(".hero__sun .sunmark__disc", { y: 30, duration: 1.1, ease: "power2.out" }, 0.8)
      .from(".hero__sun .sunmark__bars rect", { scaleX: 0, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.08 }, 1.0)
      .from(".hero__slogan", { y: 30, opacity: 0, duration: 0.9 }, 1.0)
      .from(".hero__lead", { y: 20, opacity: 0, duration: 0.8 }, 1.15)
      .from(".hero__ctas > *", { y: 20, opacity: 0, duration: 0.7, stagger: 0.1, clearProps: "transform" }, 1.3)
      .from(".hero__meta", { opacity: 0, duration: 0.8 }, 1.5)
      .from(".ticker", { yPercent: 100, duration: 0.8 }, 1.4);
  }
  if (G && window.ScrollTrigger && !reduce) {
    G.to(".hero__media", { yPercent: 16, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });
    G.to(".hero__content", { y: -90, opacity: 0, ease: "none", scrollTrigger: { trigger: "#hero", start: "30% top", end: "bottom top", scrub: true } });
    G.fromTo(".air__frame", { rotateX: 14, scale: 0.92, transformPerspective: 1200 }, { rotateX: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".air__frame", start: "top bottom", end: "center center", scrub: true } });
    G.fromTo(".opsmap__stage", { scale: 0.94 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".opsmap__stage", start: "top bottom", end: "top 30%", scrub: true } });
    G.fromTo(".paper__photo", { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".paper__photo", start: "top bottom", end: "bottom top", scrub: true } });
    G.fromTo(".final__logo", { scale: 0.82, opacity: 0.4 }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: "#indir", start: "top bottom", end: "center center", scrub: true } });
    $$(".dis__maps img").forEach(function (img, i) {
      G.fromTo(img, { yPercent: -6 - i * 2, scale: 1.14 }, { yPercent: 6 + i * 2, scale: 1.14, ease: "none", scrollTrigger: { trigger: ".dis__maps", start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* ------------------------------------------------------------------ kaydırmalı hikâye */
  var story = { el: $("#hikaye"), frames: $$(".story__frame"), caps: $$(".story__cap"), num: $("#storyNum"), bar: $("#storyBar"), flash: $("#storyFlash"), wrap: $(".story__frames"), idx: -1, ticking: false };
  function storyUpdate() {
    story.ticking = false;
    var r = story.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    var total = story.el.offsetHeight - window.innerHeight;
    var p = clamp(-r.top / total, 0, 1);
    var N = story.frames.length, f = p * N * 0.999, idx = Math.floor(f);
    story.frames.forEach(function (fr, i) {
      var op = i === idx ? 1 : i === idx + 1 ? clamp((f - i + 0.22) / 0.22, 0, 1) : 0;
      if (fr._op !== op) { fr.style.opacity = op; fr._op = op; }
      if (op > 0) {
        var local = clamp((f - i + 0.22) / 1.22, 0, 1);
        fr.style.transform = reduce ? "" : "scale(" + (1.14 - local * 0.12).toFixed(4) + ") translate3d(" + ((i % 2 ? -1 : 1) * local * 1.6).toFixed(3) + "%,0,0)";
      }
      fr.classList.toggle("is-on", op > 0);
    });
    if (idx !== story.idx) {
      story.idx = idx;
      story.caps.forEach(function (c, i) { c.classList.toggle("is-on", i === idx); });
      story.num.textContent = (idx + 1 < 10 ? "0" : "") + (idx + 1);
    }
    story.bar.style.width = (p * 100).toFixed(2) + "%";
    /* deprem anı: ışık çakması ve sarsıntı */
    var q = Math.max(0, 1 - Math.abs(f - 1.02) / 0.16);
    story.flash.style.opacity = (q * 0.75).toFixed(3);
    var s = reduce ? 0 : Math.max(0, 1 - Math.abs(f - 1.1) / 0.3) * 10;
    story.wrap.style.transform = s > 0.2 ? "translate3d(" + ((Math.random() - 0.5) * s).toFixed(1) + "px," + ((Math.random() - 0.5) * s).toFixed(1) + "px,0)" : "";
  }
  /* 2–7. kareler perde kalktıktan sonra ya da hikâyeye yaklaşınca yüklenir (açılışta çözümleme yükü olmasın) */
  var storyLoaded = false;
  function loadStory() {
    if (storyLoaded) return;
    storyLoaded = true;
    $$(".story__frame img[data-src]").forEach(function (img) { img.src = img.getAttribute("data-src"); img.removeAttribute("data-src"); });
  }
  new IntersectionObserver(function (ents, o) {
    if (ents[0].isIntersecting) { o.disconnect(); loadStory(); }
  }, { rootMargin: "25% 0px" }).observe(story.el);
  function onScroll() {
    if (!story.ticking) { story.ticking = true; requestAnimationFrame(storyUpdate); }
    navSolid();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    storyUpdate();
    radioSize();
    fxCards.forEach(function (f) { if (f.w) fxSize(f); });
  });

  /* ------------------------------------------------------------------ gezinme */
  var nav = $("#nav"), burger = $("#burger"), links = $("#navLinks");
  function navSolid() {
    nav.classList.toggle("is-solid", window.scrollY > 40);
    var max = doc.scrollHeight - window.innerHeight;
    nav.style.setProperty("--prog", max > 0 ? (window.scrollY / max).toFixed(4) : 0);
  }
  function menu(open) {
    links.classList.toggle("is-open", open);
    clearTimeout(menu.t);
    if (open) nav.classList.add("is-menu");
    else menu.t = setTimeout(function () { nav.classList.remove("is-menu"); }, 380);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { menu(!links.classList.contains("is-open")); });
  links.addEventListener("click", function (e) { if (e.target.closest("a")) menu(false); });
  var navMap = {};
  $$("#navLinks a").forEach(function (a) { navMap[a.getAttribute("href").slice(1)] = a; });
  var secIO = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (!en.isIntersecting) return;
      $$("#navLinks a").forEach(function (a) { a.classList.remove("is-active"); });
      if (navMap[en.target.id]) navMap[en.target.id].classList.add("is-active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main > section[id]").forEach(function (s) { secIO.observe(s); });

  /* ------------------------------------------------------------------ belirme ve sayaçlar */
  var revIO = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      revIO.unobserve(el);
      el.classList.add("is-in");
      var d = parseFloat(el.style.transitionDelay) || 0;
      setTimeout(function () { el.classList.remove("reveal", "is-in"); el.style.transitionDelay = ""; }, 1100 + d * 1000);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  function observeReveals() {
    $$(".reveal").forEach(function (el) {
      var sib = Array.prototype.filter.call(el.parentNode.children, function (x) { return x.classList.contains("reveal"); });
      var i = sib.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(0.45, i * 0.09) + "s";
      revIO.observe(el);
    });
  }
  var cntIO = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (!en.isIntersecting) return;
      cntIO.unobserve(en.target);
      var el = en.target, n = +el.getAttribute("data-count"), pre = el.getAttribute("data-prefix") || "", s = performance.now();
      (function step(now) {
        var k = clamp((now - s) / 1600, 0, 1), e = 1 - Math.pow(1 - k, 3);
        el.textContent = pre + Math.round(n * e);
        if (k < 1) requestAnimationFrame(step);
      })(s);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach(function (el) { cntIO.observe(el); });

  /* ------------------------------------------------------------------ gündüz / gece karşılaştırma */
  var cmp = $("#compare"), dragging = false;
  function setX(clientX) {
    var r = cmp.getBoundingClientRect();
    cmp.style.setProperty("--x", clamp(((clientX - r.left) / r.width) * 100, 2, 98) + "%");
  }
  cmp.addEventListener("pointerdown", function (e) { dragging = true; try { cmp.setPointerCapture(e.pointerId); } catch (err) {} setX(e.clientX); });
  cmp.addEventListener("pointermove", function (e) { if (dragging || e.pointerType === "mouse") setX(e.clientX); });
  cmp.addEventListener("pointerup", function () { dragging = false; });
  cmp.addEventListener("pointercancel", function () { dragging = false; });
  new IntersectionObserver(function (ents, o) {
    ents.forEach(function (en) {
      if (!en.isIntersecting) return;
      o.disconnect();
      if (!G || reduce) return;
      var st = { x: 88 };
      G.to(st, { x: 50, duration: 1.8, ease: "power3.inOut", delay: 0.3, onUpdate: function () { if (!dragging) cmp.style.setProperty("--x", st.x + "%"); } });
    });
  }, { threshold: 0.5 }).observe(cmp);

  /* ------------------------------------------------------------------ fragman */
  var modal = $("#trailerModal"), tv = $("#trailerVideo"), musicWas = false;
  function openTrailer() {
    tv.poster = "assets/video/fragman_" + lang + ".jpg";
    tv.src = "assets/video/fragman_" + lang + ".mp4";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    body.style.overflow = "hidden";
    musicWas = soundOn;
    setDuck(0);
    var p = tv.play();
    if (p && p.catch) p.catch(function () {});
  }
  function closeTrailer() {
    tv.pause();
    tv.removeAttribute("src");
    tv.load();
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    body.style.overflow = "";
    setDuck(1);
  }
  $$("[data-trailer]").forEach(function (b) { b.addEventListener("click", openTrailer); });
  modal.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeTrailer(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (modal.classList.contains("is-open")) closeTrailer();
      if (lb.el.classList.contains("is-open")) closeLightbox();
      if (links.classList.contains("is-open")) menu(false);
    } else if (lb.el.classList.contains("is-open")) {
      if (e.key === "ArrowRight") stepLightbox(1);
      if (e.key === "ArrowLeft") stepLightbox(-1);
    }
  });

  /* ------------------------------------------------------------------ mıknatıslı düğmeler, imleç ışığı */
  if (hover && !reduce) {
    $$(".magnetic").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
    var glow = $(".cursor-glow"), gx = -999, gy = -999, tx = -999, ty = -999, gRaf = 0;
    var gStep = function () {
      gx += (tx - gx) * 0.14; gy += (ty - gy) * 0.14;
      glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
      gRaf = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5 ? requestAnimationFrame(gStep) : 0;
    };
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      if (gx < -900) { gx = tx; gy = ty; }
      if (!gRaf) gRaf = requestAnimationFrame(gStep);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ başlat */
  applyLang(true);
  observeReveals();
  navSolid();
  radioSize();
  storyUpdate();
  new IntersectionObserver(function (ents) {
    ents.forEach(function (en) { radio.visible = en.isIntersecting; if (radio.visible) radioLoop(); });
  }).observe(radio.el);
})();
