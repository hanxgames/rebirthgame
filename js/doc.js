/* ReBirth — gizlilik/destek sayfalarında dil: ?lang=tr|en (oyun bunu gönderir) → kayıtlı seçim → tarayıcı dili */
(function () {
  "use strict";
  var q = new URLSearchParams(location.search).get("lang");
  var lang = q === "tr" || q === "en" ? q : null;
  if (!lang) { try { lang = localStorage.getItem("rb_lang"); } catch (e) {} }
  if (lang !== "tr" && lang !== "en") lang = /^tr/i.test(navigator.language || "") ? "tr" : "en";
  if (location.hash === "#tr") lang = "tr";

  function apply() {
    document.documentElement.lang = lang;
    var t = document.documentElement.getAttribute("data-title-" + lang);
    if (t) document.title = t;
    Array.prototype.forEach.call(document.querySelectorAll("[data-lang]"), function (el) {
      el.hidden = el.getAttribute("data-lang") !== lang;
    });
    var b = document.getElementById("docLang");
    if (b) b.innerHTML = lang === "tr" ? "<b>TR</b> / EN" : "TR / <b>EN</b>";
    Array.prototype.forEach.call(document.querySelectorAll("a[data-keep-lang]"), function (a) {
      a.href = a.getAttribute("data-keep-lang") + "?lang=" + lang;
    });
  }
  var btn = document.getElementById("docLang");
  if (btn) btn.addEventListener("click", function () {
    lang = lang === "tr" ? "en" : "tr";
    try { localStorage.setItem("rb_lang", lang); } catch (e) {}
    apply();
  });
  apply();
})();
