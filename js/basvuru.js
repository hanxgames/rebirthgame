/* ReBirth — haberdeki başvuru düğmesi (haberler.json kaydında "form": "<kimlik>"). Site form çizmez ve bir şey saklamaz:
   düğme Google Formlar'daki başvuru formunu yeni sekmede açar. Formlar hanxdestek@gmail.com hesabında; yanıtlar oradaki
   E-Tablolar'a düşer, yeni başvuruda e-posta bildirimi gelir. Yeni form: FORMLAR'a kimlik + yanıtlayan bağlantısı ekle. */
(function () {
  "use strict";
  var FORMLAR = {
    moderator: "https://docs.google.com/forms/d/e/1FAIpQLSeePeG0UnTZJbJVCKMDCmGpcOv5CBSFwT1LuZEIenwT38vMsQ/viewform"
  };
  var M = {
    tr: { dugme: "Başvuru formunu doldur", not: "Form Google Formlar'da açılır (İngilizce)." },
    en: { dugme: "Fill in the application form", not: "The form opens in Google Forms." }
  };

  function kur(kap, form, dil) {
    var t = M[dil] || M.en;
    kap.textContent = "";
    if (!FORMLAR[form]) return;
    var a = document.createElement("a");
    a.className = "doc-btn news-btn";
    a.href = FORMLAR[form];
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = t.dugme;
    kap.appendChild(a);
    var n = document.createElement("p");
    n.className = "apl-note";
    n.textContent = t.not;
    kap.appendChild(n);
  }

  window.RBBasvuru = { kur: kur };
})();
