/* ReBirth — haberler.html: haberler.json akışını çizer (oyunun ana menüsü de aynı dosyayı okur; ekleme: tools/haber_ekle.py).
   Dil doc.js'ten gelir (html lang); dil düğmesi değişince yeniden çizilir. #<kimlik> ile gelinirse o kayıt açılır ve vurgulanır.
   Kayıtta "form" varsa altına Google Formlar'daki başvuru formunu açan düğme konur (js/basvuru.js). */
(function () {
  "use strict";
  var AYLAR = {
    tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  };
  var DETAY = { tr: "Bağlantıyı aç", en: "Open link" };
  var akis = null;
  var tur = "haberler";
  var liste = document.getElementById("newsList");
  var yukleniyor = false;

  // sayfa önbellekten eski hâliyle geldiyse (Pages 10 dk önbellekler; akış ise her seferinde taze) başvuru betiğini sonradan yükle
  function formBetigi() {
    if (yukleniyor) return;
    yukleniyor = true;
    var s = document.createElement("script");
    s.src = "js/basvuru.js?v=" + encodeURIComponent((akis && akis.guncelleme) || Date.now());
    s.onload = ciz;
    document.head.appendChild(s);
  }

  function dil() { return document.documentElement.lang === "tr" ? "tr" : "en"; }
  function metin(d) { if (!d) return ""; return d[dil()] || d.en || d.tr || ""; }
  function tarih(s) {
    var p = String(s || "").split("-");
    if (p.length !== 3) return s || "";
    var ay = AYLAR[dil()][parseInt(p[1], 10) - 1] || "";
    return dil() === "tr" ? parseInt(p[2], 10) + " " + ay + " " + p[0] : ay + " " + parseInt(p[2], 10) + ", " + p[0];
  }
  function el(ad, sinif, icerik) {
    var e = document.createElement(ad);
    if (sinif) e.className = sinif;
    if (icerik != null) e.textContent = icerik;
    return e;
  }
  // başlık CSS ile büyük harf olur; Türkçede Latin marka adları noktasız kalsın ("REDDİT", "REBİRTH" olmasın; oyunda Defs.tr_upper)
  function baslikEl(s) {
    var h = el("h2", "news-title");
    String(s).split(/((?:r\/)?(?:ReBirth|Reddit)[A-Za-z]*)/).forEach(function (p, i) {
      if (!p) return;
      if (i % 2) { var b = el("span", null, p); b.lang = "en"; h.appendChild(b); }
      else h.appendChild(document.createTextNode(p));
    });
    return h;
  }

  // Video (kayıtta "video": {tr, en}): Türkçe sayfa tr'yi, İngilizce sayfa (oyunun diğer bütün dilleri) en'i oynatır. YouTube
  // oynatıcısı yalnız tıklayınca youtube-nocookie'den yüklenir; o zamana dek kapak sitenin kendi görselidir (privacy.html §5).
  var OYNAT = { tr: "Videoyu oynat", en: "Play video" };
  function videoKaynak(u) {
    var m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:\S*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/.exec(u || "");
    if (m) return { yt: m[1] };
    return /\.(mp4|webm)(\?|$)/i.test(u || "") ? { dosya: u } : null;
  }
  function videoKutusu(k) {
    var v = k.video || {};
    var kaynak = videoKaynak(dil() === "tr" ? (v.tr || v.en) : (v.en || v.tr));
    if (!kaynak) return null;
    var kutu = el("button", "news-video");
    kutu.type = "button";
    kutu.setAttribute("aria-label", OYNAT[dil()] + ": " + metin(k.baslik));
    var poster = v.kapak || k.gorsel;   // kapak: videonun 1280x720 karesi (yoksa haberin 640x360 görseli)
    var kapak = el("img");
    kapak.src = poster;
    kapak.alt = "";
    kapak.width = v.kapak ? 1280 : 640;
    kapak.height = v.kapak ? 720 : 360;
    kutu.appendChild(kapak);
    kutu.appendChild(el("span", "news-play"));
    kutu.appendChild(el("span", "news-video__etiket", OYNAT[dil()]));
    kutu.addEventListener("click", function () {
      var oyn;
      if (kaynak.yt) {
        oyn = el("iframe");
        oyn.src = "https://www.youtube-nocookie.com/embed/" + kaynak.yt + "?autoplay=1&rel=0&playsinline=1&hl=" + dil();
        oyn.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        oyn.referrerPolicy = "strict-origin-when-cross-origin";
      } else {
        oyn = el("video");
        oyn.src = kaynak.dosya;
        oyn.poster = poster;
        oyn.controls = true;
        oyn.autoplay = true;
        oyn.playsInline = true;
      }
      oyn.title = metin(k.baslik);
      var yer = el("div", "news-video is-on");
      yer.appendChild(oyn);
      kutu.replaceWith(yer);
    });
    return kutu;
  }

  // Anket (oyun 2.0.8+): oy oyunda verilir (Android, oyuncu başına tek oy); site sayıları Realtime Database'den canlı okur.
  var DB = "https://dead-mans-deck-global-default-rtdb.europe-west1.firebasedatabase.app";
  var ANKET_YAZI = {
    tr: { oy: "Oy vermek için oyunu açın: ana menüdeki Haberler kartında şıklara dokunun (Android, 2.0.8 ve sonrası).", toplam: " oy", bitti: "Anket sona erdi.", yok: "Henüz oy yok." },
    en: { oy: "Vote in the game: tap an option on the News card in the main menu (Android, version 2.0.8 or later).", toplam: " votes", bitti: "This poll has closed.", yok: "No votes yet." }
  };
  function anketKutusu(an) {
    var y = ANKET_YAZI[dil()];
    var kutu = el("div", "poll");
    kutu.appendChild(el("h3", "poll-q", metin(an.soru)));
    var satirlar = {};
    an.secenekler.forEach(function (x) {
      var s = el("div", "poll-opt");
      var ust = el("div", "poll-top");
      ust.appendChild(el("span", "poll-name", metin(x.metin)));
      var yuzde = el("span", "poll-pct", "");
      ust.appendChild(yuzde);
      s.appendChild(ust);
      if (x.aciklama) s.appendChild(el("div", "poll-desc", metin(x.aciklama)));
      var bar = el("div", "poll-bar");
      var dolgu = el("i");
      bar.appendChild(dolgu);
      s.appendChild(bar);
      kutu.appendChild(s);
      satirlar[x.id] = { yuzde: yuzde, dolgu: dolgu };
    });
    var bitti = an.bitis && new Date().toISOString().slice(0, 10) > an.bitis;
    var alt = el("p", "poll-note", bitti ? y.bitti : y.oy);
    kutu.appendChild(alt);
    fetch(DB + "/anket/" + an.id + "/sayi.json").then(function (r) { return r.json(); }).then(function (d) {
      d = d || {};
      var top = 0;
      an.secenekler.forEach(function (x) { top += +(d[x.id] || 0); });
      an.secenekler.forEach(function (x) {
        var n = +(d[x.id] || 0), p = top ? Math.round(100 * n / top) : 0;
        satirlar[x.id].yuzde.textContent = top ? p + "%" : "";
        satirlar[x.id].dolgu.style.width = p + "%";
      });
      alt.textContent = (bitti ? y.bitti + " " : y.oy + " ") + (top ? "(" + top + y.toplam + ")" : y.yok);
    }).catch(function () {});
    return kutu;
  }

  function ciz() {
    if (!akis) return;
    Array.prototype.forEach.call(document.querySelectorAll(".news-tab"), function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-tur") === tur);
      b.setAttribute("aria-selected", b.getAttribute("data-tur") === tur ? "true" : "false");
    });
    liste.textContent = "";
    (akis[tur] || []).forEach(function (k) {
      var art = el("article", "news-item");
      art.id = k.id;
      var vid = k.video ? videoKutusu(k) : null;
      if (vid) {   // videolu kayıt tek sütun: oynatıcı kapağı üstte, tam genişlikte
        art.classList.add("has-video");
        art.appendChild(vid);
      } else {
        var img = el("img", "news-img");
        img.src = k.gorsel;
        img.alt = "";
        img.loading = "lazy";
        img.width = 640;
        img.height = 360;
        art.appendChild(img);
      }
      var govde = el("div", "news-body");
      var ust = el("div", "news-meta", tarih(k.tarih));
      if (k.etiket) ust.appendChild(el("span", "news-tag", metin(k.etiket)));
      if (k.surum) ust.appendChild(el("span", "news-tag", "v" + k.surum));
      govde.appendChild(ust);
      govde.appendChild(baslikEl(metin(k.baslik)));
      govde.appendChild(el("p", "news-sum", metin(k.ozet)));
      var satirlar = (k.metin && (k.metin[dil()] || k.metin.en || k.metin.tr)) || [];
      var ul = null;
      satirlar.forEach(function (s) {
        if (/^•\s*/.test(s)) {
          if (!ul) { ul = el("ul"); govde.appendChild(ul); }
          ul.appendChild(el("li", null, s.replace(/^•\s*/, "")));
        } else {
          ul = null;
          govde.appendChild(el("p", null, s));
        }
      });
      if (k.baglanti) {
        var a = el("a", "doc-btn news-btn", DETAY[dil()]);
        a.href = k.baglanti;
        a.target = "_blank";
        a.rel = "noopener";
        govde.appendChild(a);
      }
      if (k.anket && k.anket.secenekler) govde.appendChild(anketKutusu(k.anket));
      if (k.form && window.RBBasvuru) {   // başvuru düğmesi (js/basvuru.js → Google Formlar)
        var fk = el("div", "apl");
        govde.appendChild(fk);
        window.RBBasvuru.kur(fk, k.form, dil());
      } else if (k.form) {
        formBetigi();
      }
      art.appendChild(govde);
      liste.appendChild(art);
    });
    odakla();
  }

  function odakla() {
    var id = decodeURIComponent((location.hash || "").slice(1));
    if (!id || id === "tr") return;
    var hedef = document.getElementById(id);
    if (!hedef) return;
    hedef.classList.add("is-hit");
    hedef.scrollIntoView({ block: "start" });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".news-tab"), function (b) {
    b.addEventListener("click", function () { tur = b.getAttribute("data-tur"); ciz(); });
  });
  new MutationObserver(ciz).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  fetch("haberler.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) {
    akis = j;
    var id = decodeURIComponent((location.hash || "").slice(1));
    if ((j.guncellemeler || []).some(function (k) { return k.id === id; })) tur = "guncellemeler";
    ciz();
  }).catch(function () {
    document.getElementById("newsEmpty").hidden = false;
  });
})();
