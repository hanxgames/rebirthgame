/* ReBirth — haberdeki başvuru formu (haberler.json kaydında "form": "moderator").
   Site hiçbir şey göndermez ya da saklamaz: "Başvuruyu gönder" oyuncunun kendi e-posta uygulamasını hanxdestek@gmail.com'a
   hazır bir mesajla açar. E-posta uygulaması açılmazsa mesaj panoya kopyalanabilir. Yazılanlar dil değişince korunur. */
(function () {
  "use strict";
  var ADRES = "hanxdestek@gmail.com";
  var M = {
    tr: {
      ac: "Başvuru formunu aç", baslik: "Moderatör başvurusu",
      not: "Formu doldurup \"Başvuruyu gönder\" düğmesine basın: e-posta uygulamanız bilgilerinizle hazır bir mesaj açar, siz gönderince bize ulaşır. Bilgileriniz bu sitede saklanmaz. Yıldızlı alanlar zorunlu.",
      reddit: "Reddit kullanıcı adı", reddit_ph: "u/kullaniciadi",
      yas: "Reddit hesabınızın yaşı", sec: "Seçin",
      yaslar: [["1 yıldan az"], ["1–2 yıl"], ["2–5 yıl"], ["5 yıldan fazla"]],
      karma: "Karma (yaklaşık)", ad: "Ad soyad", ulke: "Ülke", tel: "Telefon (isteğe bağlı, ülke koduyla)", tel_ph: "+90 5xx xxx xx xx",
      deneyim: "Daha önce bir topluluğu yönettiniz ya da moderatörlük yaptınız mı?",
      deneyimler: [["Hayır, ilk kez"], ["Evet, Reddit'te"], ["Evet, Discord / forum / başka bir yerde"]],
      tanitim: "Kendinizden kısaca bahsedin",
      tanitim_ph: "ReBirth'ü ne zamandır oynuyorsunuz, topluluk için neler yapmak istersiniz, haftada ne kadar vakit ayırabilirsiniz?",
      yas18: "18 yaşından büyüğüm.",
      gonder: "Başvuruyu gönder", kopyala: "Mesajı kopyala", kopyalandi: "Kopyalandı",
      sonra: "E-posta uygulamanız açılmadıysa mesajı kopyalayıp " + ADRES + " adresine kendiniz gönderebilirsiniz.",
      konu: "ReBirth moderatör başvurusu", giris: "Merhaba, ReBirth topluluk moderatörlüğü için başvuruyorum.",
      evet: "Evet", e_reddit: "Reddit kullanıcı adını u/ad biçiminde yazın (3–20 harf, rakam, - ya da _).",
      e_tel: "Telefon numarasını ülke koduyla yazın.", e_tanitim: "Biraz daha anlatın (en az 30 karakter)."
    },
    en: {
      ac: "Open the application form", baslik: "Moderator application",
      not: "Fill in the form and press \"Send application\": your email app opens a ready-made message with your answers, and it reaches us when you send it. Nothing is stored on this site. Fields marked * are required.",
      reddit: "Reddit username", reddit_ph: "u/username",
      yas: "Age of your Reddit account", sec: "Choose",
      yaslar: [["Less than 1 year"], ["1–2 years"], ["2–5 years"], ["More than 5 years"]],
      karma: "Karma (roughly)", ad: "Full name", ulke: "Country", tel: "Phone (optional, with country code)", tel_ph: "+1 555 123 4567",
      deneyim: "Have you run or moderated a community before?",
      deneyimler: [["No, this would be my first"], ["Yes, on Reddit"], ["Yes, on Discord / a forum / elsewhere"]],
      tanitim: "Tell us a little about yourself",
      tanitim_ph: "How long have you played ReBirth, what would you like to do for the community, and how much time can you give each week?",
      yas18: "I am 18 or older.",
      gonder: "Send application", kopyala: "Copy message", kopyalandi: "Copied",
      sonra: "If your email app didn't open, copy the message and send it to " + ADRES + " yourself.",
      konu: "ReBirth moderator application", giris: "Hello, I'd like to apply to moderate the ReBirth community.",
      evet: "Yes", e_reddit: "Write your Reddit username as u/name (3–20 letters, digits, - or _).",
      e_tel: "Please include your country code.", e_tanitim: "Tell us a bit more (at least 30 characters)."
    }
  };
  var taslak = {};   // dil değişince form yeniden kurulur; yazılanlar kaybolmasın

  function el(ad, sinif, metin) {
    var e = document.createElement(ad);
    if (sinif) e.className = sinif;
    if (metin != null) e.textContent = metin;
    return e;
  }
  function alan(ad, etiket, zorunlu, girdi) {
    var k = el("label", "apl-field");
    k.appendChild(el("span", "apl-label", etiket + (zorunlu ? " *" : "")));
    girdi.name = ad;
    if (zorunlu) girdi.required = true;
    k.appendChild(girdi);
    return k;
  }
  function metinGirdi(tip, en, ph) {
    var i = document.createElement("input");
    i.type = tip;
    i.maxLength = en;
    if (ph) i.placeholder = ph;
    return i;
  }
  function secim(ilk, liste) {
    var s = document.createElement("select");
    var o = document.createElement("option");
    o.value = "";
    o.textContent = ilk;
    s.appendChild(o);
    liste.forEach(function (p, i) {
      var x = document.createElement("option");
      x.value = String(i + 1);
      x.textContent = p[0];
      s.appendChild(x);
    });
    return s;
  }

  function kur(kap, form, dil, acik) {
    var t = M[dil] || M.en;
    kap.textContent = "";
    var acB = el("button", "doc-btn news-btn apl-open", t.ac);
    acB.type = "button";
    var f = el("form", "apl-form");
    f.hidden = !acik && !taslak._acik;
    acB.hidden = !f.hidden;
    acB.addEventListener("click", function () {
      taslak._acik = true;
      f.hidden = false;
      acB.hidden = true;
      f.querySelector("input").focus();
    });
    kap.appendChild(acB);

    f.appendChild(el("h3", "apl-title", t.baslik));
    f.appendChild(el("p", "apl-note", t.not));
    var izgara = el("div", "apl-grid");
    var rd = metinGirdi("text", 24, t.reddit_ph);
    rd.pattern = "^(u/|/u/)?[A-Za-z0-9_\\-]{3,20}$";
    rd.autocomplete = "off";
    rd.title = t.e_reddit;
    izgara.appendChild(alan("reddit", t.reddit, true, rd));
    izgara.appendChild(alan("hesap_yasi", t.yas, true, secim(t.sec, t.yaslar)));
    var km = metinGirdi("number", 9);
    km.min = "0";
    km.inputMode = "numeric";
    izgara.appendChild(alan("karma", t.karma, false, km));
    var ad = metinGirdi("text", 80);
    ad.autocomplete = "name";
    izgara.appendChild(alan("ad", t.ad, true, ad));
    var ul = metinGirdi("text", 60);
    ul.autocomplete = "country-name";
    izgara.appendChild(alan("ulke", t.ulke, true, ul));
    var tel = metinGirdi("tel", 24, t.tel_ph);
    tel.pattern = "^\\+?[0-9 \\(\\)\\-]{7,22}$";   // pattern "v" kipinde derlenir: parantez sınıf içinde de kaçışlı
    tel.autocomplete = "tel";
    tel.title = t.e_tel;
    izgara.appendChild(alan("telefon", t.tel, false, tel));
    var dn = alan("deneyim", t.deneyim, true, secim(t.sec, t.deneyimler));
    dn.classList.add("apl-wide");
    izgara.appendChild(dn);
    f.appendChild(izgara);
    var ta = document.createElement("textarea");
    ta.rows = 5;
    ta.maxLength = 1000;
    ta.minLength = 30;
    ta.placeholder = t.tanitim_ph;
    ta.title = t.e_tanitim;
    var tk = alan("tanitim", t.tanitim, true, ta);
    tk.classList.add("apl-wide");
    f.appendChild(tk);
    var k18 = el("label", "apl-check");
    var c18 = document.createElement("input");
    c18.type = "checkbox";
    c18.name = "yas_onay";
    c18.required = true;
    k18.appendChild(c18);
    k18.appendChild(el("span", null, t.yas18));
    f.appendChild(k18);
    var sira = el("div", "apl-actions");
    var gb = el("button", "doc-btn apl-send", t.gonder);
    gb.type = "submit";
    sira.appendChild(gb);
    var kb = el("button", "apl-copy", t.kopyala);
    kb.type = "button";
    kb.hidden = true;
    sira.appendChild(kb);
    f.appendChild(sira);
    var sonra = el("p", "apl-note apl-after", t.sonra);
    sonra.hidden = true;
    f.appendChild(sonra);

    // taslağı geri yükle / güncel tut (seçimler dile bağlı değil: sıra numarası)
    Array.prototype.forEach.call(f.elements, function (g) {
      if (!g.name) return;
      if (g.name in taslak) { if (g.type === "checkbox") g.checked = !!taslak[g.name]; else g.value = taslak[g.name]; }
      g.addEventListener("input", function () { taslak[g.name] = g.type === "checkbox" ? g.checked : g.value; });
      g.addEventListener("change", function () { taslak[g.name] = g.type === "checkbox" ? g.checked : g.value; });
    });

    function mesaj() {
      var v = function (ad) { return String(f.elements[ad].value || "").trim(); };
      var sec = function (ad, liste) { var i = parseInt(v(ad), 10); return i ? liste[i - 1][0] : ""; };
      var kul = v("reddit").replace(/^\/?u\//i, "");
      var satir = [t.giris, "",
        t.reddit + ": u/" + kul,
        t.yas + ": " + sec("hesap_yasi", t.yaslar),
        t.karma + ": " + (v("karma") || "-"),
        t.ad + ": " + v("ad"),
        t.ulke + ": " + v("ulke"),
        t.tel.replace(/\s*\(.*\)$/, "") + ": " + (v("telefon") || "-"),
        t.deneyim + " " + sec("deneyim", t.deneyimler),
        t.yas18.replace(/\.$/, "") + ": " + t.evet,
        "", t.tanitim + ":", v("tanitim")];
      return { konu: t.konu + " – u/" + kul, govde: satir.join("\n") };
    }

    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!f.reportValidity()) return;
      var m = mesaj();
      location.href = "mailto:" + ADRES + "?subject=" + encodeURIComponent(m.konu) + "&body=" + encodeURIComponent(m.govde);
      kb.hidden = false;
      sonra.hidden = false;
    });
    kb.addEventListener("click", function () {
      var m = mesaj();
      var yaz = "To: " + ADRES + "\n" + m.konu + "\n\n" + m.govde;
      var bitti = function () { kb.textContent = t.kopyalandi; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(yaz).then(bitti, function () { window.prompt(t.kopyala, yaz); });
      } else {
        window.prompt(t.kopyala, yaz);
      }
    });
    kap.appendChild(f);
  }

  window.RBBasvuru = { kur: kur };
})();
