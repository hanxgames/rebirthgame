/* ReBirth — haberler.html: haberler.json akışını çizer (oyunun ana menüsü de aynı dosyayı okur; ekleme: tools/haber_ekle.py).
   Dil doc.js'ten gelir (html lang); dil düğmesi değişince yeniden çizilir. #<kimlik> ile gelinirse o kayıt açılır ve vurgulanır. */
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
      var img = el("img", "news-img");
      img.src = k.gorsel;
      img.alt = "";
      img.loading = "lazy";
      img.width = 640;
      img.height = 360;
      art.appendChild(img);
      var govde = el("div", "news-body");
      var ust = el("div", "news-meta", tarih(k.tarih));
      if (k.etiket) ust.appendChild(el("span", "news-tag", metin(k.etiket)));
      if (k.surum) ust.appendChild(el("span", "news-tag", "v" + k.surum));
      govde.appendChild(ust);
      govde.appendChild(el("h2", "news-title", metin(k.baslik)));
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
