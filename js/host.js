/* ReBirth — mini oyun ana makinesi: ses, seslendirme, dil ve en iyi skor. Oyunlar window.RBGames'e kaydolur
 * (sözleşme: js/games/CONTRACT.md). Sesler kullanıcı ilk dokunuşta açılır (tarayıcı otomatik çalma kuralı). */
(function () {
  "use strict";
  var cache = {};
  var muted = false;
  try { muted = localStorage.getItem("rb_mute") === "1"; } catch (e) {}

  function play(src, vol) {
    if (muted) return;
    try {
      var base = cache[src];
      if (!base) {
        base = new Audio(src);
        base.preload = "auto";
        cache[src] = base;
      }
      var a = base.paused && base.currentTime === 0 ? base : base.cloneNode(true);
      a.volume = Math.max(0, Math.min(1, vol == null ? 1 : vol));
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  var voiceAudio = null;
  window.RBHost = {
    root: (document.currentScript && document.currentScript.dataset.root) || "",
    lang: function () { return document.documentElement.lang === "tr" ? "tr" : "en"; },   // mini oyunlar yalnız tr/en: diğer diller İngilizce
    isMuted: function () { return muted; },
    setMuted: function (m) {
      muted = !!m;
      try { localStorage.setItem("rb_mute", muted ? "1" : "0"); } catch (e) {}
      if (muted && voiceAudio) voiceAudio.pause();
    },
    sfx: function (name, vol) { play(this.root + "assets/audio/sfx/" + name + ".mp3", vol == null ? 0.7 : vol); },
    voice: function (key) {
      if (muted) return;
      try {
        if (voiceAudio) voiceAudio.pause();
        voiceAudio = new Audio(this.root + "assets/audio/ses/" + this.lang() + "/" + key + ".mp3");
        voiceAudio.volume = 0.95;
        var p = voiceAudio.play();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    },
    best: function (id) { try { return parseInt(localStorage.getItem("rb_best_" + id) || "0", 10) || 0; } catch (e) { return 0; } },
    saveBest: function (id, score) {
      var b = this.best(id);
      if (score > b) { try { localStorage.setItem("rb_best_" + id, String(score)); } catch (e) {} return true; }
      return false;
    },
    /* bir oyunu kaba bağla; dönen nesne: {destroy, pause, resume} */
    mount: function (id, el, onEnd) {
      var g = window.RBGames && window.RBGames[id];
      if (!g) { el.textContent = "Oyun bulunamadı: " + id; return null; }
      var host = this;
      var ctx = {
        id: id,
        lang: host.lang(),
        assets: host.root + "assets/",
        sfx: function (n, v) { host.sfx(n, v); },
        voice: function (k) { host.voice(k); },
        best: function () { return host.best(id); },
        onEnd: function (r) {
          r = r || {};
          r.newBest = host.saveBest(id, r.score || 0);
          r.best = host.best(id);
          if (onEnd) onEnd(r);
          return r;
        }
      };
      return g.mount(el, ctx);
    }
  };
})();
