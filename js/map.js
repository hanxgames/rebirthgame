/* ReBirth — etkileşimli harekât haritası. Bölge sınırları oyunun kendi harita verisinden (assets/data/map_tarsel.json),
 * görüntü ile birebir hizalı (2100×1400). Katman değerleri tanıtım içindir: oyunun açılış durumuna benzer bir tablo. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var root = document.getElementById("opsmap");
  if (!root) return;
  var svg = document.getElementById("mapSvg");
  var stage = document.getElementById("mapStage");
  var tip = document.getElementById("mapTip");
  var dossier = document.getElementById("dossier");
  var legend = document.getElementById("legend");
  var data = null, lens = "stab", sel = -1, paths = [], drawn = false;

  function t(k) { return window.RBSite ? window.RBSite.t(k) : k; }
  function tr(k, fb) { var v = t(k); return v === k ? fb : v; }

  /* tanıtım durumu: başkent ve çevresi hükümette, karargâh ve boğaz isyancıda, sınırlar çekişmeli */
  var CTRL = { 0: "gov", 1: "gov", 2: "gov", 3: "cont", 4: "gov", 5: "cont", 6: "gov", 7: "cont", 8: "gov", 9: "ins", 10: "ins", 11: "cont", 12: "ins", 13: "cont" };
  function hash(i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); }
  function stats(d) {
    var c = CTRL[d.id] || "cont";
    var base = c === "gov" ? 58 : c === "cont" ? 36 : 12;
    if (d.role === "capital") base = 72;
    if (d.role === "hq") base = 6;
    return {
      ctrl: c,
      stab: Math.round(base + hash(d.id, 1) * 14),
      sup: Math.round(base - 6 + hash(d.id, 2) * 22),
      sec: Math.round((c === "gov" ? 66 : c === "cont" ? 34 : 10) + hash(d.id, 3) * 16)
    };
  }
  function ramp(v) { /* 0 kırmızı → 50 hardal → 100 yeşil */
    var a = [219, 71, 56], b = [241, 173, 42], c = [102, 184, 107], p = Math.max(0, Math.min(1, v / 100)), x, y, k;
    if (p < 0.5) { x = a; y = b; k = p / 0.5; } else { x = b; y = c; k = (p - 0.5) / 0.5; }
    return "rgb(" + Math.round(x[0] + (y[0] - x[0]) * k) + "," + Math.round(x[1] + (y[1] - x[1]) * k) + "," + Math.round(x[2] + (y[2] - x[2]) * k) + ")";
  }
  var CCOL = { gov: "#52a1e0", cont: "#f1ad2a", ins: "#db4738" };
  function fillFor(d) {
    var s = d._s;
    if (lens === "none") return "transparent";
    if (lens === "ctrl") return CCOL[s.ctrl];
    return ramp(lens === "stab" ? s.stab : s.sec);
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function build() {
    var gFill = el("g", { "class": "fills" }, svg);
    var gLbl = el("g", { "class": "lbls" }, svg);
    data.districts.forEach(function (d) {
      d._s = stats(d);
      var p = el("path", { d: d.d, "class": "d", "data-id": d.id, tabindex: "0", role: "button", "aria-label": d.name }, gFill);
      p.style.fillOpacity = "0";
      paths[d.id] = p;
      var lbl = el("text", { x: d.c[0], y: d.c[1] + 10, "class": "lbl" }, gLbl);
      lbl.textContent = d.name;
      if (d.role === "hq") {
        el("circle", { cx: d.c[0], cy: d.c[1] - 62, r: 26, "class": "hq-ring" }, gLbl);
        el("circle", { cx: d.c[0], cy: d.c[1] - 62, r: 26, "class": "hq-ring", style: "animation-delay:1s" }, gLbl);
        el("circle", { cx: d.c[0], cy: d.c[1] - 62, r: 16, fill: "#db4738", stroke: "#201d1b", "stroke-width": 4, "class": "pin" }, gLbl);
        el("path", { d: "M" + (d.c[0] - 30) + "," + (d.c[1] - 62) + " h60 M" + d.c[0] + "," + (d.c[1] - 92) + " v60", stroke: "#ece4d0", "stroke-width": 4, "class": "pin" }, gLbl);
      } else if (d.role === "capital") {
        el("path", { d: "M" + d.c[0] + "," + (d.c[1] - 90) + " l22,30 l-22,30 l-22,-30 z", fill: "#f1ad2a", stroke: "#201d1b", "stroke-width": 4, "class": "pin" }, gLbl);
      }
      p.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") showTip(d, e); });
      p.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse") moveTip(e); });
      p.addEventListener("pointerleave", hideTip);
      p.addEventListener("click", function () { select(d.id); });
      p.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(d.id); } });
    });
    applyLens(false);
    renderLegend();
  }

  function showTip(d, e) { tip.textContent = d.name; tip.style.opacity = "1"; moveTip(e); }
  function moveTip(e) {
    var r = stage.getBoundingClientRect();
    tip.style.left = (e.clientX - r.left) + "px";
    tip.style.top = (e.clientY - r.top) + "px";
  }
  function hideTip() { tip.style.opacity = "0"; }

  function applyLens(anim) {
    if (!data) return;
    var night = root.classList.contains("is-night");
    data.districts.forEach(function (d, i) {
      var p = paths[d.id];
      p.style.fill = fillFor(d);
      var op = lens === "none" ? 0 : (sel >= 0 && sel !== d.id ? 0.16 : night ? 0.3 : 0.38);
      p.style.transitionDelay = anim ? (i * 0.03) + "s" : "0s";
      if (drawn) p.style.fillOpacity = String(op);
    });
  }

  function renderLegend() {
    var items;
    if (lens === "ctrl") items = [[CCOL.gov, t("map.c.gov")], [CCOL.cont, t("map.c.cont")], [CCOL.ins, t("map.c.ins")]];
    else if (lens === "none") items = [["#f1ad2a", t("role.capital")], ["#db4738", t("role.hq")]];
    else items = [[ramp(10), "0–33"], [ramp(50), "34–66"], [ramp(90), "67–100"]];
    legend.innerHTML = items.map(function (it) { return '<span><i style="background:' + it[0] + '"></i>' + it[1] + "</span>"; }).join("");
  }

  function bar(label, v) {
    return '<div class="dossier__row"><span>' + label + "</span><b>" + v + '</b></div><div class="dossier__bar"><i style="width:0;background:' + ramp(v) + '" data-w="' + v + '"></i></div>';
  }
  function renderDossier() {
    if (sel < 0 || !data) {
      dossier.innerHTML = '<div class="dossier__empty">' + t("map.hint") + "</div>";
      return;
    }
    var d = data.districts[sel], s = d._s;
    var names = d.n.map(function (i) { return data.districts[i].name; }).join(", ");
    var stampTxt = s.ctrl === "gov" ? t("map.c.gov") : s.ctrl === "cont" ? t("map.c.cont") : t("map.c.ins");
    dossier.innerHTML =
      '<div class="dossier__stamp" style="color:' + CCOL[s.ctrl] + '">' + stampTxt + "</div>" +
      '<div class="dossier__kicker">' + t("role." + (d.role || "")) + "</div>" +
      '<div class="dossier__name">' + d.name + "</div>" +
      '<div class="dossier__row"><span>' + t("map.pop") + "</span><b>" + d.pop + " " + t("map.k") + "</b></div>" +
      '<div class="dossier__row"><span>' + t("map.terrain") + "</span><b>" + tr("terrain." + d.terrain, d.terrain) + "</b></div>" +
      '<div class="dossier__row"><span>' + t("map.neighbors") + '</span><b style="text-align:right;max-width:60%">' + names + "</b></div>" +
      bar(t("map.l.stab"), s.stab) + bar(t("map.l.sec"), s.sec);
    requestAnimationFrame(function () {
      dossier.querySelectorAll(".dossier__bar i").forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; });
    });
    if (window.gsap) gsap.from(dossier.children, { y: 12, opacity: 0, duration: 0.45, stagger: 0.04, ease: "power2.out" });
  }

  function select(id) {
    if (sel >= 0 && paths[sel]) paths[sel].classList.remove("is-sel");
    sel = sel === id ? -1 : id;
    if (sel >= 0) {
      paths[sel].classList.add("is-sel");
      if (window.RBHost) RBHost.sfx("ui_tik", 0.5);
    }
    applyLens(false);
    renderDossier();
  }

  /* sınırları sırayla çizip renkleri doldur */
  function drawIn() {
    if (drawn || !data) return;
    drawn = true;
    data.districts.forEach(function (d, i) {
      var p = paths[d.id];
      setTimeout(function () { p.style.fillOpacity = String(lens === "none" ? 0 : 0.38); }, 120 + i * 70);
    });
    if (window.gsap) {
      gsap.from(svg.querySelectorAll(".lbl"), { opacity: 0, y: 20, duration: 0.6, stagger: 0.05, ease: "power2.out", delay: 0.3 });
      gsap.from(svg.querySelectorAll(".d"), { opacity: 0, duration: 0.8, stagger: 0.05, ease: "none" });
    }
  }

  function upgradeImages() {
    ["mapDay", "mapNight"].forEach(function (id) {
      var img = document.getElementById(id);
      if (!img || !img.dataset.hi || window.innerWidth < 700) return;
      var hi = new Image();
      hi.onload = function () { img.src = img.dataset.hi; };
      hi.src = img.dataset.hi;
    });
  }

  document.getElementById("lensSeg").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-lens]");
    if (!b) return;
    this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("is-on", x === b); });
    lens = b.dataset.lens;
    applyLens(true);
    renderLegend();
    if (window.RBHost) RBHost.sfx("ui_tik", 0.4);
  });
  document.getElementById("todSeg").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-tod]");
    if (!b) return;
    this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("is-on", x === b); });
    root.classList.toggle("is-night", b.dataset.tod === "night");
    applyLens(false);
    if (window.RBHost) RBHost.sfx("ui_tik", 0.4);
  });
  document.addEventListener("rb:lang", function () { renderLegend(); renderDossier(); });

  var io = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.disconnect();
      upgradeImages();
      fetch((window.RBHost ? RBHost.root : "") + "assets/data/map_tarsel.json")
        .then(function (r) { return r.json(); })
        .then(function (j) { data = j; build(); setTimeout(drawIn, 200); })
        .catch(function () {});
    });
  }, { rootMargin: "300px" });
  io.observe(root);
})();
