/* ReBirth — sitenin dilleri (oyunun 11 dili). Bütün sayfalar kullanır: index (main.js), haberler/destek/gizlilik (doc.js).
   Seçim sırası: ?lang= → kayıtlı seçim (rb_lang) → tarayıcı dilleri → İngilizce. Kodlar oyunun ve haberler.json'un kodlarıdır
   (pt_BR, zh_CN, zh_TW); html lang BCP 47 (pt-BR, zh-CN…). Ana sayfa sözlüğü tr/en js/i18n.js'te, diğerleri js/i18n/<kod>.js
   (gerektiğinde yüklenir). Ses, fragman, ekran görüntüleri ve hukuki metinler yalnız tr/en: diğer diller İngilizcesini kullanır (ana()). */
(function () {
  "use strict";
  var DILLER = [
    { k: "tr", ad: "Türkçe", html: "tr", kisa: "TR" },
    { k: "en", ad: "English", html: "en", kisa: "EN" },
    { k: "es", ad: "Español", html: "es", kisa: "ES" },
    { k: "pt_BR", ad: "Português (Brasil)", html: "pt-BR", kisa: "PT" },
    { k: "de", ad: "Deutsch", html: "de", kisa: "DE" },
    { k: "fr", ad: "Français", html: "fr", kisa: "FR" },
    { k: "id", ad: "Bahasa Indonesia", html: "id", kisa: "ID" },
    { k: "ja", ad: "日本語", html: "ja", kisa: "日本語" },
    { k: "ko", ad: "한국어", html: "ko", kisa: "한국어" },
    { k: "zh_CN", ad: "简体中文", html: "zh-CN", kisa: "简体" },
    { k: "zh_TW", ad: "繁體中文", html: "zh-TW", kisa: "繁體" }
  ];
  var BUL = {};
  DILLER.forEach(function (d) { BUL[d.k] = d; });

  // "pt-BR", "pt", "zh-Hant-TW", "zh_HK", "in" (eski Endonezce) gibi etiketleri kodlarımıza çevirir; tanımazsa null
  function coz(etiket) {
    if (!etiket) return null;
    var s = String(etiket).replace(/_/g, "-").toLowerCase();
    if (BUL[etiket]) return etiket;
    var p = s.split("-"), ana = p[0];
    if (ana === "zh") return /-(tw|hk|mo|hant)\b/.test(s) ? "zh_TW" : "zh_CN";
    if (ana === "pt") return "pt_BR";
    if (ana === "in") return "id";
    return BUL[ana] ? ana : null;
  }

  function sec() {
    var q = coz(new URLSearchParams(location.search).get("lang"));
    if (q) return q;
    if (location.hash === "#tr") return "tr";
    try { var s = coz(localStorage.getItem("rb_lang")); if (s) return s; } catch (e) {}
    var liste = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
    for (var i = 0; i < liste.length; i++) { var c = coz(liste[i]); if (c) return c; }
    return "en";
  }

  function kaydet(k) { try { localStorage.setItem("rb_lang", k); } catch (e) {} }
  // adreste ?lang= varsa seçimle güncellenir (yoksa yenileyince eski dil geri gelir)
  function adresi_guncelle(k) {
    var u = new URL(location.href);
    if (!u.searchParams.has("lang")) return;
    u.searchParams.set("lang", k);
    try { history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch (e) {}
    var l = document.querySelector('link[rel="canonical"]');
    if (l) l.href = l.href.replace(/\?.*$/, "") + "?lang=" + k;
  }
  function ana(k) { return k === "tr" ? "tr" : "en"; }
  function html(k) { return (BUL[k] || BUL.en).html; }

  // js/i18n/<kod>.js'i bir kez yükler (tr/en zaten i18n.js'te); bitince cb
  var yuklenen = {};
  function yukle(k, cb) {
    var I = window.RB_I18N || {};
    if (I[k] || k === "tr" || k === "en") { cb(); return; }
    if (yuklenen[k]) { yuklenen[k].push(cb); return; }
    yuklenen[k] = [cb];
    var bitti = false;
    function son() {
      if (bitti) return;
      bitti = true;
      var l = yuklenen[k] || [];
      yuklenen[k] = null;
      l.forEach(function (f) { f(); });
    }
    var s = document.createElement("script");
    s.src = "js/i18n/" + k + ".js?v=" + (window.RB_I18N_SURUM || 1);
    // ağ takılırsa sayfa 5 sn sonra İngilizceyle açılır; sözlük sonradan gelirse "rb:sozluk" olayı (main.js yeniden çizer)
    s.onload = function () { if (bitti) document.dispatchEvent(new CustomEvent("rb:sozluk", { detail: k })); else son(); };
    s.onerror = son;
    setTimeout(son, 5000);
    document.head.appendChild(s);
  }

  // seçili dili sayfaya işler: html lang, data-dil, düğme yazısı
  function uygula(k) {
    var d = document.documentElement;
    d.lang = html(k);
    d.setAttribute("data-dil", k);
    Array.prototype.forEach.call(document.querySelectorAll("[data-dil-kisa]"), function (e) { e.textContent = BUL[k].kisa; });
  }

  // hreflang ile gelen ?lang= sayfasının kanonik adresi kendisi olsun (yoksa Google dil sürümlerini kopya sayar)
  function kanonik(taban) {
    var q = coz(new URLSearchParams(location.search).get("lang"));
    var l = document.querySelector('link[rel="canonical"]');
    if (!l) { l = document.createElement("link"); l.rel = "canonical"; document.head.appendChild(l); }
    l.href = taban + (q ? "?lang=" + q : "");
  }

  var GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm6.9 6h-2.9a15.6 15.6 0 00-1.4-3.6A8 8 0 0118.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 010-4h3.4a16.5 16.5 0 000 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 015.1 16zM8 8H5.1a8 8 0 014.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 010-4h4.6a14.7 14.7 0 010 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 01-4.3 3.6zm1.7-5.6a16.5 16.5 0 000-4h3.4a8.2 8.2 0 010 4h-3.4z"/></svg>';

  // dil düğmesi: dokununca 11 dilin listesi açılır; seçilince kaydedip sec(k) çağrılır
  function menu(dugme, simdiki, secildi) {
    dugme.innerHTML = GLOBE + '<span data-dil-kisa></span><i class="dil-ok" aria-hidden="true"></i>';
    dugme.setAttribute("aria-haspopup", "listbox");
    dugme.setAttribute("aria-expanded", "false");
    var liste = null, aktif = simdiki;
    function kapat() {
      if (!liste) return;
      liste.remove(); liste = null;
      dugme.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", disari, true);
      document.removeEventListener("keydown", tus, true);
      window.removeEventListener("resize", kapat);
      window.removeEventListener("scroll", kaydir, true);
    }
    function disari(e) { if (liste && !liste.contains(e.target) && !dugme.contains(e.target)) kapat(); }
    function kaydir(e) { if (liste && !liste.contains(e.target)) kapat(); }   // listenin kendi kaydırması kapatmasın
    function tus(e) {
      if (e.key === "Escape") { kapat(); dugme.focus(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      var o = Array.prototype.slice.call(liste.querySelectorAll("button")), i = o.indexOf(document.activeElement);
      o[(i + (e.key === "ArrowDown" ? 1 : o.length - 1)) % o.length].focus();
    }
    function ac() {
      liste = document.createElement("div");
      liste.className = "dil-menu";
      liste.setAttribute("role", "listbox");
      DILLER.forEach(function (d) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "option");
        b.setAttribute("aria-selected", d.k === aktif ? "true" : "false");
        b.lang = d.html;
        b.textContent = d.ad;
        if (d.k === aktif) b.className = "is-on";
        b.addEventListener("click", function () {
          kapat();
          if (d.k === aktif) return;
          aktif = d.k;
          kaydet(d.k);
          adresi_guncelle(d.k);
          secildi(d.k);
        });
        liste.appendChild(b);
      });
      document.body.appendChild(liste);
      var r = dugme.getBoundingClientRect(), w = liste.offsetWidth;
      liste.style.top = Math.round(r.bottom + 8) + "px";
      liste.style.left = Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))) + "px";
      liste.style.maxHeight = Math.max(160, window.innerHeight - r.bottom - 24) + "px";
      dugme.setAttribute("aria-expanded", "true");
      document.addEventListener("pointerdown", disari, true);
      document.addEventListener("keydown", tus, true);
      window.addEventListener("resize", kapat);
      window.addEventListener("scroll", kaydir, true);
      var on = liste.querySelector(".is-on");
      if (on) on.focus();
    }
    dugme.addEventListener("click", function () { if (liste) kapat(); else ac(); });
  }

  window.RBDil = { DILLER: DILLER, coz: coz, sec: sec, kaydet: kaydet, ana: ana, html: html, yukle: yukle, uygula: uygula,
    kanonik: kanonik, menu: menu };
})();
