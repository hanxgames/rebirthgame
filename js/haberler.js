/* ReBirth — haberler.html: haberler.json akışını çizer (oyunun ana menüsü de aynı dosyayı okur; ekleme: tools/haber_ekle.py).
   Dil doc.js'ten gelir (html lang); dil düğmesi değişince yeniden çizilir. #<kimlik> ile gelinirse o kayıt açılır ve vurgulanır.
   Kayıtta "form" varsa altına Google Formlar'daki başvuru formunu açan düğme konur (js/basvuru.js). */
(function () {
  "use strict";
  // kısa metinler 11 dilde (js/dil.js); eksik dil İngilizceye düşer (y())
  var DETAY = { tr: "Bağlantıyı aç", en: "Open link", es: "Abrir enlace", pt_BR: "Abrir link", de: "Link öffnen", fr: "Ouvrir le lien",
    id: "Buka tautan", ja: "リンクを開く", ko: "링크 열기", zh_CN: "打开链接", zh_TW: "開啟連結" };
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

  // kayıtlardaki başlık/özet/etiket 11 dilde, gövde metni (metin) tr/en: eksik dil İngilizceye düşer
  function dil() { return document.documentElement.getAttribute("data-dil") || "en"; }
  function y(t) { return t[dil()] || t.en; }
  function metin(d) { if (!d) return ""; return d[dil()] || d.en || d.tr || ""; }
  function tarih(s) {
    var p = String(s || "").split("-");
    if (p.length !== 3) return s || "";
    try {
      return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString(document.documentElement.lang || "en",
        { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    } catch (e) { return s; }
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

  // Kartın uzaktan görünümü (oyunla aynı şema, oyun 2.1.3+; YenidenDogus docs/claude/arayuz.md "Haber kartının uzaktan görünümü"):
  // renk, dugmeler, sabitle, vurgu, duzen, baslangic/bitis. "tepki" yalnız oyunda (sitede tepki düğmesi yok). Geçersiz alan yok sayılır.
  var HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
  var RENKLER = ["vurgu", "zemin", "kenar", "etiket", "baslik", "ozet"];
  var IZINLI = /^https:\/\/([a-z0-9-]+\.)*(rebirthgame\.tr|hanxgames\.net|play\.google\.com|itch\.io|youtube\.com|youtu\.be)([\/?#]|$)/i;
  var SIMGE = {   // oyundaki IconAtlas adlarından sitede çizilebilenler; diğerleri simgesiz
    play: '<path d="M8 5.5v13c0 .6.7 1 1.2.6l10-6.5c.5-.3.5-1 0-1.3l-10-6.5C8.7 4.5 8 4.9 8 5.5z"/>',
    heart: '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.6.7-1.4 2.2-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/>',
    star: '<path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/>',
    info: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
    globe: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm6.9 6h-2.9a15.6 15.6 0 00-1.4-3.6A8 8 0 0118.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 010-4h3.4a16.5 16.5 0 000 4H4.3zm8 6c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 010-4h4.6a14.7 14.7 0 010 4z"/>',
    news: '<path d="M4 4h13v14a2 2 0 002 2H6a2 2 0 01-2-2V4zm2 3v2h9V7H6zm0 4v2h9v-2H6zm0 4v2h6v-2H6zm13-7h2v10a2 2 0 01-2 2V8z"/>',
    flag: '<path d="M5 2h2v20H5V2zm3 1h11l-2.5 4L19 11H8V3z"/>'
  };
  function zaman(s, son) {   // "YYYY-AA-GG" ya da "YYYY-AA-GG SS:DD" (UTC); bitiş günü dahil
    var m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(String(s || ""));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    return son && !m[4] ? t + 86400000 : t;
  }
  function gorunur(k) {
    var simdi = Date.now(), b = zaman(k.baslangic, false), s = zaman(k.bitis, true);
    return !(b != null && simdi < b) && !(s != null && simdi >= s);
  }
  function gorunumUygula(art, k) {
    var renk = k.renk && typeof k.renk === "object" ? k.renk : {};
    RENKLER.forEach(function (r) { if (HEX.test(String(renk[r] || ""))) art.style.setProperty("--nk-" + r, renk[r]); });
    if (k.vurgu === "parilti") art.classList.add("news-item--parilti");
    if (k.duzen === "genis") art.classList.add("news-item--genis");
  }
  // "dugmeler": "Bağlantıyı aç"ın yerine en çok 3 düğme. "detay" (ya da boş) bu sayfanın kendisi olduğu için sitede çizilmez;
  // bağlantı yalnız https ve izinli alanlar. Döner: düğmeler (boş olabilir) ya da null (alan yok / hepsi geçersiz → eski düğme)
  function dugmeler(k) {
    if (!Array.isArray(k.dugmeler)) return null;
    if (!k.dugmeler.length) return [];
    var out = [], detay = false;
    k.dugmeler.slice(0, 3).forEach(function (d) {
      if (!d || typeof d !== "object") return;
      var adres = String(d.baglanti || "");
      if (adres === "" || adres === "detay") { detay = true; return; }
      if (!IZINLI.test(adres)) return;
      var yazi = typeof d.metin === "string" ? d.metin : metin(d.metin);
      if (!yazi) return;
      var a = el("a", "doc-btn news-btn" + (d.stil === "ana" ? "" : " doc-btn--ghost"));
      if (SIMGE[d.simge]) a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + SIMGE[d.simge] + "</svg>";
      a.appendChild(document.createTextNode(yazi));
      a.href = adres;
      a.target = "_blank";
      a.rel = "noopener";
      out.push(a);
    });
    return out.length || detay ? out : null;
  }

  // Video (kayıtta "video": {tr, en}): Türkçe sayfa tr'yi, İngilizce sayfa (oyunun diğer bütün dilleri) en'i oynatır. YouTube
  // oynatıcısı yalnız tıklayınca youtube-nocookie'den yüklenir; o zamana dek kapak sitenin kendi görselidir (privacy.html §5).
  var OYNAT = { tr: "Videoyu oynat", en: "Play video", es: "Reproducir vídeo", pt_BR: "Reproduzir vídeo", de: "Video abspielen",
    fr: "Lire la vidéo", id: "Putar video", ja: "動画を再生", ko: "동영상 재생", zh_CN: "播放视频", zh_TW: "播放影片" };
  var YOUTUBE = { tr: "YouTube'da izle", en: "Watch on YouTube", es: "Ver en YouTube", pt_BR: "Assistir no YouTube",
    de: "Auf YouTube ansehen", fr: "Regarder sur YouTube", id: "Tonton di YouTube", ja: "YouTubeで見る", ko: "YouTube에서 보기",
    zh_CN: "在 YouTube 观看", zh_TW: "在 YouTube 觀看" };
  function videoKaynak(u) {
    var m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:\S*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/.exec(u || "");
    if (m) return { yt: m[1] };
    return /\.(mp4|webm)(\?|$)/i.test(u || "") ? { dosya: u } : null;
  }
  function videoKutusu(k) {
    var v = k.video || {};
    var kaynak = videoKaynak(dil() === "tr" ? (v.tr || v.en) : (v.en || v.tr));   // video yalnız tr/en
    if (!kaynak) return null;
    var kutu = el("button", "news-video");
    kutu.type = "button";
    kutu.setAttribute("aria-label", y(OYNAT) + ": " + metin(k.baslik));
    var poster = v.kapak || k.gorsel;   // kapak: videonun 1280x720 karesi (yoksa haberin 640x360 görseli)
    var kapak = el("img");
    kapak.src = poster;
    kapak.alt = "";
    kapak.width = v.kapak ? 1280 : 640;
    kapak.height = v.kapak ? 720 : 360;
    kutu.appendChild(kapak);
    kutu.appendChild(el("span", "news-play"));
    kutu.appendChild(el("span", "news-video__etiket", y(OYNAT)));
    kutu.addEventListener("click", function () {
      var oyn;
      if (kaynak.yt) {
        oyn = el("iframe");
        oyn.src = "https://www.youtube-nocookie.com/embed/" + kaynak.yt + "?autoplay=1&rel=0&playsinline=1&hl=" + document.documentElement.lang;
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
    var ay = y(ANKET_YAZI);
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
    var alt = el("p", "poll-note", bitti ? ay.bitti : ay.oy);
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
      alt.textContent = (bitti ? ay.bitti + " " : ay.oy + " ") + (top ? "(" + top + ay.toplam + ")" : ay.yok);
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
    // aralık dışındakiler gizli; "sabitle" önce, sonra akıştaki sıra (yeniden eskiye)
    (akis[tur] || []).filter(gorunur).map(function (k, i) { return [k, i]; }).sort(function (a, b) {
      return (b[0].sabitle === true) - (a[0].sabitle === true) || a[1] - b[1];
    }).forEach(function (x) {
      var k = x[0];
      var art = el("article", "news-item");
      art.id = k.id;
      gorunumUygula(art, k);
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
      var dg = dugmeler(k);
      if (dg) dg.forEach(function (a) { govde.appendChild(a); });
      else if (k.baglanti) {
        var a = el("a", "doc-btn news-btn", y(DETAY));
        a.href = k.baglanti;
        a.target = "_blank";
        a.rel = "noopener";
        govde.appendChild(a);
      }
      var yt = vid && k.video.youtube;   // sitede barınan videonun YouTube kopyası (kanala izlenme): dile göre bağlantı
      var ytDil = dil() === "tr" ? "tr" : "en";
      if (yt && (yt[ytDil] || yt.en)) {
        var ya = el("a", "doc-btn news-btn", y(YOUTUBE));
        ya.href = yt[ytDil] || yt.en;
        ya.target = "_blank";
        ya.rel = "noopener";
        govde.appendChild(ya);
      }
      if (k.anket && k.anket.secenekler) govde.appendChild(anketKutusu(k.anket));
      if (window.RBPaylas) govde.appendChild(window.RBPaylas.dugme(k, dil()));   // hikâye/gönderi görseli + bağlantı (js/paylas.js)
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
