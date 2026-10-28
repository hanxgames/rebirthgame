/* ReBirth — haber paylaşımı (haberler.html). Her kartın altındaki "Paylaş" düğmesi bir pencere açar:
   - Haberin hikâye (1080×1920) ve gönderi (1080×1350) görseli tarayıcıda, tuvalde çizilir (sunucuya bir şey gitmez).
   - Telefonda "Paylaş" sistem paylaşım menüsünü dosyayla açar: Instagram, TikTok, YouTube, WhatsApp… hikâye ya da gönderi olarak.
     Dosya paylaşımı olmayan yerde (masaüstü) görsel indirilir.
   - Bağlantı: paylas/<dil>/<kimlik>.html — Open Graph önizlemeli sayfa, haberler.html#<kimlik>'e yönlendirir (tools/haber_ekle.py üretir).
   window.RBPaylas.dugme(kayit, dil) kart için düğme döndürür. */
(function () {
  "use strict";
  var SITE = "https://rebirthgame.tr/";
  var Y = {
    tr: {
      paylas: "Paylaş", baslik: "Haberi paylaş", hikaye: "Hikâye", gonderi: "Gönderi", indir: "Görseli indir",
      kopyala: "Bağlantıyı kopyala", kopyalandi: "Bağlantı kopyalandı", kapat: "Kapat", hazir: "Görsel hazırlanıyor…",
      ipucuMobil: "Paylaş'a dokun; Instagram, TikTok, YouTube ya da başka bir uygulamayı seç. Görsel hikâye ve gönderi için hazır.",
      ipucuMasa: "Görseli indir; Instagram, TikTok ya da YouTube'da hikâye veya gönderi olarak paylaş. Bağlantıyı da yanına ekleyebilirsin.",
      baglanti: "Bağlantıyla paylaş", diger: "Diğer uygulamalar", tamami: "Haberin tamamı", ucretsiz: "Google Play'de ücretsiz",
      dosya: { hikaye: "hikaye", gonderi: "gonderi" }
    },
    en: {
      paylas: "Share", baslik: "Share this post", hikaye: "Story", gonderi: "Post", indir: "Download image",
      kopyala: "Copy link", kopyalandi: "Link copied", kapat: "Close", hazir: "Preparing the image…",
      ipucuMobil: "Tap Share and pick Instagram, TikTok, YouTube or any other app. The image is ready for stories and posts.",
      ipucuMasa: "Download the image and share it as a story or post on Instagram, TikTok or YouTube. You can add the link too.",
      baglanti: "Share the link", diger: "More apps", tamami: "Read more at", ucretsiz: "Free on Google Play",
      dosya: { hikaye: "story", gonderi: "post" }
    },
    es: {
      paylas: "Compartir", baslik: "Compartir noticia", hikaye: "Historia", gonderi: "Publicación", indir: "Descargar imagen",
      kopyala: "Copiar enlace", kopyalandi: "Enlace copiado", kapat: "Cerrar", hazir: "Preparando la imagen…",
      ipucuMobil: "Toca Compartir y elige Instagram, TikTok, YouTube u otra app. La imagen está lista para historias y publicaciones.",
      ipucuMasa: "Descarga la imagen y compártela como historia o publicación en Instagram, TikTok o YouTube. También puedes añadir el enlace.",
      baglanti: "Compartir enlace", diger: "Más apps", tamami: "Más en", ucretsiz: "Gratis en Google Play",
      dosya: { hikaye: "historia", gonderi: "publicacion" }
    },
    pt_BR: {
      paylas: "Compartilhar", baslik: "Compartilhar notícia", hikaye: "Story", gonderi: "Post", indir: "Baixar imagem",
      kopyala: "Copiar link", kopyalandi: "Link copiado", kapat: "Fechar", hazir: "Preparando a imagem…",
      ipucuMobil: "Toque em Compartilhar e escolha Instagram, TikTok, YouTube ou outro app. A imagem está pronta para stories e posts.",
      ipucuMasa: "Baixe a imagem e compartilhe como story ou post no Instagram, TikTok ou YouTube. Você também pode adicionar o link.",
      baglanti: "Compartilhar link", diger: "Mais apps", tamami: "Leia mais em", ucretsiz: "Grátis no Google Play",
      dosya: { hikaye: "story", gonderi: "post" }
    },
    de: {
      paylas: "Teilen", baslik: "Beitrag teilen", hikaye: "Story", gonderi: "Post", indir: "Bild herunterladen",
      kopyala: "Link kopieren", kopyalandi: "Link kopiert", kapat: "Schließen", hazir: "Bild wird vorbereitet…",
      ipucuMobil: "Tippe auf Teilen und wähle Instagram, TikTok, YouTube oder eine andere App. Das Bild passt für Storys und Posts.",
      ipucuMasa: "Lade das Bild herunter und teile es als Story oder Post auf Instagram, TikTok oder YouTube. Den Link kannst du dazuschreiben.",
      baglanti: "Link teilen", diger: "Weitere Apps", tamami: "Mehr unter", ucretsiz: "Kostenlos bei Google Play",
      dosya: { hikaye: "story", gonderi: "post" }
    },
    fr: {
      paylas: "Partager", baslik: "Partager l'actu", hikaye: "Story", gonderi: "Publication", indir: "Télécharger l'image",
      kopyala: "Copier le lien", kopyalandi: "Lien copié", kapat: "Fermer", hazir: "Préparation de l'image…",
      ipucuMobil: "Touchez Partager et choisissez Instagram, TikTok, YouTube ou une autre app. L'image est prête pour les stories et les publications.",
      ipucuMasa: "Téléchargez l'image et partagez-la en story ou en publication sur Instagram, TikTok ou YouTube. Vous pouvez aussi ajouter le lien.",
      baglanti: "Partager le lien", diger: "Autres apps", tamami: "À lire sur", ucretsiz: "Gratuit sur Google Play",
      dosya: { hikaye: "story", gonderi: "publication" }
    },
    id: {
      paylas: "Bagikan", baslik: "Bagikan berita", hikaye: "Story", gonderi: "Postingan", indir: "Unduh gambar",
      kopyala: "Salin tautan", kopyalandi: "Tautan disalin", kapat: "Tutup", hazir: "Menyiapkan gambar…",
      ipucuMobil: "Ketuk Bagikan lalu pilih Instagram, TikTok, YouTube, atau aplikasi lain. Gambar siap untuk story dan postingan.",
      ipucuMasa: "Unduh gambarnya lalu bagikan sebagai story atau postingan di Instagram, TikTok, atau YouTube. Kamu juga bisa menambahkan tautannya.",
      baglanti: "Bagikan tautan", diger: "Aplikasi lain", tamami: "Selengkapnya di", ucretsiz: "Gratis di Google Play",
      dosya: { hikaye: "story", gonderi: "postingan" }
    },
    ja: {
      paylas: "シェア", baslik: "ニュースをシェア", hikaye: "ストーリー", gonderi: "投稿", indir: "画像をダウンロード",
      kopyala: "リンクをコピー", kopyalandi: "リンクをコピーしました", kapat: "閉じる", hazir: "画像を準備中…",
      ipucuMobil: "「シェア」をタップして、Instagram、TikTok、YouTubeなどのアプリを選んでください。画像はストーリーにも投稿にも使えます。",
      ipucuMasa: "画像をダウンロードして、Instagram、TikTok、YouTubeでストーリーや投稿としてシェアしましょう。リンクも添えられます。",
      baglanti: "リンクでシェア", diger: "その他のアプリ", tamami: "続きはこちら", ucretsiz: "Google Playで無料配信中",
      dosya: { hikaye: "story", gonderi: "post" }
    },
    ko: {
      paylas: "공유", baslik: "소식 공유", hikaye: "스토리", gonderi: "게시물", indir: "이미지 다운로드",
      kopyala: "링크 복사", kopyalandi: "링크가 복사되었습니다", kapat: "닫기", hazir: "이미지 준비 중…",
      ipucuMobil: "공유를 누르고 Instagram, TikTok, YouTube 등 원하는 앱을 선택하세요. 이미지는 스토리와 게시물에 맞게 준비되어 있습니다.",
      ipucuMasa: "이미지를 다운로드해 Instagram, TikTok, YouTube에 스토리나 게시물로 공유하세요. 링크도 함께 넣을 수 있습니다.",
      baglanti: "링크로 공유", diger: "다른 앱", tamami: "자세히 보기", ucretsiz: "Google Play에서 무료",
      dosya: { hikaye: "story", gonderi: "post" }
    },
    zh_CN: {
      paylas: "分享", baslik: "分享这条新闻", hikaye: "竖版故事", gonderi: "帖子", indir: "下载图片",
      kopyala: "复制链接", kopyalandi: "链接已复制", kapat: "关闭", hazir: "正在生成图片…",
      ipucuMobil: "点击“分享”，选择 Instagram、TikTok、YouTube 或其他应用。图片已适配故事和帖子。",
      ipucuMasa: "下载图片，在 Instagram、TikTok 或 YouTube 上以故事或帖子形式分享，也可以附上链接。",
      baglanti: "分享链接", diger: "更多应用", tamami: "完整内容", ucretsiz: "Google Play 免费下载",
      dosya: { hikaye: "story", gonderi: "post" }
    },
    zh_TW: {
      paylas: "分享", baslik: "分享這則新聞", hikaye: "限時動態", gonderi: "貼文", indir: "下載圖片",
      kopyala: "複製連結", kopyalandi: "已複製連結", kapat: "關閉", hazir: "正在產生圖片…",
      ipucuMobil: "點選「分享」，選擇 Instagram、TikTok、YouTube 或其他 App。圖片已適用於限時動態與貼文。",
      ipucuMasa: "下載圖片，在 Instagram、TikTok 或 YouTube 以限時動態或貼文分享，也可以附上連結。",
      baglanti: "分享連結", diger: "更多 App", tamami: "完整內容", ucretsiz: "Google Play 免費下載",
      dosya: { hikaye: "story", gonderi: "post" }
    }
  };
  var BOY = { hikaye: [1080, 1920], gonderi: [1080, 1350] };
  var IKON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.1c-.8 0-1.5.3-2 .8l-7.1-4.2c.1-.2.1-.5.1-.7s0-.5-.1-.7L16 7.2c.5.5 1.2.8 2 .8 1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3c0 .2 0 .5.1.7L8 9.8C7.5 9.3 6.8 9 6 9c-1.7 0-3 1.3-3 3s1.3 3 3 3c.8 0 1.5-.3 2-.8l7.1 4.2c-.1.2-.1.4-.1.6 0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9-1.2-2.9-2.8-2.9z"/></svg>';

  function y(dil) { return Y[dil] || Y.en; }
  function metin(d, dil) { if (!d) return ""; return d[dil] || d.en || d.tr || ""; }
  function adres(k, dil) { return SITE + "paylas/" + dil + "/" + encodeURIComponent(k.id) + ".html"; }
  function buyuk(s, dil) {   // Türkçe büyük harf; Latin marka adları noktasız kalır (oyunda Defs.tr_upper)
    var u = dil === "tr" ? s.toLocaleUpperCase("tr-TR") : s.toUpperCase();
    return dil === "tr" ? u.replace(/REBİRTH/g, "REBIRTH").replace(/REDDİT/g, "REDDIT") : u;
  }
  function el(ad, sinif, icerik) {
    var e = document.createElement(ad);
    if (sinif) e.className = sinif;
    if (icerik != null) e.textContent = icerik;
    return e;
  }
  function resim(src) {
    return new Promise(function (ok, hata) {
      var im = new Image();
      im.decoding = "async";
      im.onload = function () { ok(im); };
      im.onerror = hata;
      im.src = src;
    });
  }
  var yazilar = null;
  function yaziTipleri() {
    if (!yazilar) {
      yazilar = document.fonts && document.fonts.load
        ? Promise.all(["100px Anton", "500 40px Barlow", "600 40px Barlow", "700 34px 'Barlow Condensed'"].map(function (f) {
          return document.fonts.load(f).catch(function () {});
        }))
        : Promise.resolve();
    }
    return yazilar;
  }

  /* ---------- tuval yardımcıları ---------- */
  function kapla(c, im, x, yy, w, h) {   // object-fit: cover
    var o = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / o, sh = h / o;
    c.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, yy, w, h);
  }
  function yuvarlak(c, x, yy, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, yy); c.arcTo(x + w, yy, x + w, yy + h, r); c.arcTo(x + w, yy + h, x, yy + h, r);
    c.arcTo(x, yy + h, x, yy, r); c.arcTo(x, yy, x + w, yy, r); c.closePath();
  }
  // sözcük sözcük sarar; Çince/Japonca harfler tek tek parça (noktalama öncekine yapışık), aralarına boşluk konmaz
  var PARCA = /[぀-ヿ㐀-鿿豈-﫿][、。，．！？：；」』）”・ー]*|[^\s぀-ヿ㐀-鿿豈-﫿]+|\s+/g;
  function satirlar(c, s, genislik) {
    var out = [], satir = "", bosluk = false;
    (String(s).match(PARCA) || []).forEach(function (w) {
      if (/^\s+$/.test(w)) { bosluk = true; return; }
      var ara = satir && bosluk ? " " : "";
      bosluk = false;
      var dene = satir + ara + w;
      if (c.measureText(dene).width <= genislik || !satir) satir = dene;
      else { out.push(satir); satir = w; }
    });
    if (satir) out.push(satir);
    return out;
  }
  function kisalt(c, ls, n, genislik) {   // en çok n satır; taşanın sonuna "…"
    if (ls.length <= n) return ls;
    ls = ls.slice(0, n);
    var son = ls[n - 1];
    while (son.length > 1 && c.measureText(son + "…").width > genislik) son = son.slice(0, -1).replace(/\s+$/, "");
    ls[n - 1] = son + "…";
    return ls;
  }
  function baslikSigdir(c, s, genislik, buyukBoy, kucukBoy, enCok) {
    for (var b = buyukBoy; b >= kucukBoy; b -= 4) {
      c.font = b + "px Anton";
      var ls = satirlar(c, s, genislik);
      if (ls.length <= enCok) return { boy: b, ls: ls };
    }
    c.font = kucukBoy + "px Anton";
    return { boy: kucukBoy, ls: kisalt(c, satirlar(c, s, genislik), enCok, genislik) };
  }
  function tarih(s, dil) {
    var p = String(s || "").split("-");
    if (p.length !== 3) return s || "";
    try {
      return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString(dil === "en" ? "en-GB" : window.RBDil ? RBDil.html(dil) : dil,
        { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    } catch (e) { return s; }
  }
  function cip(c, x, yy, yazi) {   // hardal etiket; genişliği döner
    c.font = "700 32px 'Barlow Condensed'";
    var t = yazi.toUpperCase(), w = c.measureText(t).width + 36;
    c.fillStyle = "#f1ad2a"; yuvarlak(c, x, yy, w, 50, 8); c.fill();
    c.fillStyle = "#201d1b"; c.textBaseline = "middle"; c.fillText(t, x + 18, yy + 26);
    return w;
  }

  function ciz(k, dil, bicim, im, logo) {
    var W = BOY[bicim][0], H = BOY[bicim][1], t = y(dil);
    var tv = document.createElement("canvas"); tv.width = W; tv.height = H;
    var c = tv.getContext("2d");
    c.fillStyle = "#191817"; c.fillRect(0, 0, W, H);
    var gy;   // görselin altı
    if (bicim === "hikaye") {
      // arka planda bulanık, karartılmış görsel; üstte keskin görsel kartı
      if ("filter" in c) { c.filter = "blur(36px) brightness(.42) saturate(1.15)"; kapla(c, im, -80, -80, W + 160, H + 160); c.filter = "none"; }
      else { c.globalAlpha = .35; kapla(c, im, 0, 0, W, H); c.globalAlpha = 1; }
      var bg = c.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "rgba(25,24,23,.35)"); bg.addColorStop(.55, "rgba(25,24,23,.55)"); bg.addColorStop(1, "rgba(25,24,23,.92)");
      c.fillStyle = bg; c.fillRect(0, 0, W, H);
      var lw = 360, lh = lw * logo.naturalHeight / logo.naturalWidth;
      c.drawImage(logo, (W - lw) / 2, 70, lw, lh);
      c.save(); c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 40; c.shadowOffsetY = 18;
      yuvarlak(c, 60, 300, 960, 540, 26); c.fillStyle = "#000"; c.fill(); c.restore();
      c.save(); yuvarlak(c, 60, 300, 960, 540, 26); c.clip(); kapla(c, im, 60, 300, 960, 540); c.restore();
      c.strokeStyle = "rgba(241,173,42,.55)"; c.lineWidth = 3; yuvarlak(c, 60, 300, 960, 540, 26); c.stroke();
      gy = 896;
    } else {
      kapla(c, im, 0, 0, W, 540);
      var g = c.createLinearGradient(0, 330, 0, 544);
      g.addColorStop(0, "rgba(25,24,23,0)"); g.addColorStop(1, "#191817");
      c.fillStyle = g; c.fillRect(0, 330, W, 214);
      gy = 528;   // gönderide logo yok: kapak görsellerinin çoğunda zaten var; marka alt bantta
    }
    // etiket + tarih
    var x = 60, cx = x;
    if (k.etiket) cx += cip(c, x, gy, metin(k.etiket, dil)) + 18;
    c.font = "700 32px 'Barlow Condensed'"; c.fillStyle = "#c7bba3"; c.textBaseline = "middle";
    c.fillText(tarih(k.tarih, dil).toUpperCase() + (k.surum ? "  ·  V" + k.surum : ""), cx, gy + 26);
    // başlık
    var hik = bicim === "hikaye";
    var bs = baslikSigdir(c, buyuk(metin(k.baslik, dil), dil), 960, hik ? 96 : 76, hik ? 60 : 52, hik ? 4 : 3);
    c.fillStyle = "#ece4d0"; c.textBaseline = "top"; c.font = bs.boy + "px Anton";
    var by = gy + 92;
    // Anton'da Türkçe büyük harf noktaları (İ, Ö, Ü) üst satıra değmesin: satır aralığı 1,22
    bs.ls.forEach(function (s, i) { c.fillText(s, x, by + i * bs.boy * 1.22); });
    by += bs.ls.length * bs.boy * 1.22 + (hik ? 30 : 20);
    // özet
    var oz = hik ? 42 : 36, cta = hik ? H - 262 : H - 196;
    c.font = "500 " + oz + "px Barlow"; c.fillStyle = "#dbd1ba";
    var bos = Math.floor((cta - 40 - by) / (oz * 1.38));
    var ls = kisalt(c, satirlar(c, metin(k.ozet, dil), 960), Math.max(1, Math.min(hik ? 7 : 4, bos)), 960);
    ls.forEach(function (s, i) { c.fillText(s, x, by + i * oz * 1.38); });
    // alt bant: site adresi
    var bh = hik ? 176 : 136;
    c.fillStyle = "#f1ad2a"; yuvarlak(c, 60, cta, 960, bh, 20); c.fill();
    c.fillStyle = "#201d1b"; c.textBaseline = "top";
    c.font = "700 " + (hik ? 34 : 28) + "px 'Barlow Condensed'";
    c.fillText(t.tamami.toUpperCase(), 100, cta + (hik ? 30 : 22));
    c.font = (hik ? 80 : 62) + "px Anton";
    c.fillText("REBIRTHGAME.TR", 100, cta + (hik ? 70 : 52));
    // güneş simgesi (logodaki gibi)
    var gx = 920, gyy = cta + bh / 2 + 6, r = hik ? 46 : 36;
    c.beginPath(); c.arc(gx, gyy, r, Math.PI, 0); c.closePath(); c.fill();
    for (var i = 0; i < 3; i++) c.fillRect(gx - r, gyy + 8 + i * (hik ? 14 : 11), r * 2, hik ? 7 : 5);
    c.font = "600 " + (hik ? 32 : 26) + "px Barlow"; c.fillStyle = "#a8a091"; c.textBaseline = "alphabetic";
    c.textAlign = "center"; c.fillText(t.ucretsiz + "  ·  HanX Games", W / 2, H - (hik ? 36 : 22)); c.textAlign = "left";
    return tv;
  }

  function uret(k, dil, bicim) {
    var kaynak = (k.video && k.video.kapak) || k.gorsel;
    return Promise.all([resim(kaynak), resim("assets/img/ui/logo.webp"), yaziTipleri()]).then(function (r) {
      var tv = ciz(k, dil, bicim, r[0], r[1]);
      return new Promise(function (ok) {
        tv.toBlob(function (b) { ok(b); }, "image/jpeg", 0.92);
      });
    });
  }

  /* ---------- paylaşım penceresi ---------- */
  var dosyaPaylasimi = (function () {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(["x"], "x.jpg", { type: "image/jpeg" })] })); }
    catch (e) { return false; }
  })();

  function ac(k, dil, geri) {
    var t = y(dil), url = adres(k, dil), baslik = metin(k.baslik, dil);
    var ov = el("div", "pay-ov"), kutu = el("div", "pay-box");
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", t.baslik);
    var kapat = el("button", "pay-x", "×"); kapat.type = "button"; kapat.setAttribute("aria-label", t.kapat);
    kutu.appendChild(kapat);
    kutu.appendChild(el("h3", "pay-h", t.baslik));
    var sekme = el("div", "pay-tabs"), bicim = "hikaye", dosyalar = {}, istek = {};
    var on = el("div", "pay-prev"), img = el("img"), bekle = el("span", "pay-wait", t.hazir);
    img.alt = ""; on.appendChild(img); on.appendChild(bekle);
    ["hikaye", "gonderi"].forEach(function (b) {
      var d = el("button", "pay-tab" + (b === bicim ? " is-on" : ""), t[b] + (b === "hikaye" ? " · 9:16" : " · 4:5"));
      d.type = "button"; d.setAttribute("data-b", b);
      d.addEventListener("click", function () { bicim = b; sec(); });
      sekme.appendChild(d);
    });
    kutu.appendChild(sekme); kutu.appendChild(on);
    var eylem = el("div", "pay-act");
    var ana = el("button", "doc-btn pay-main");
    ana.type = "button"; ana.innerHTML = IKON; ana.appendChild(document.createTextNode(dosyaPaylasimi ? t.paylas : t.indir));
    eylem.appendChild(ana);
    if (dosyaPaylasimi) {
      var ind = el("button", "pay-sec", t.indir); ind.type = "button";
      ind.addEventListener("click", function () { indir(); });
      eylem.appendChild(ind);
    }
    kutu.appendChild(eylem);
    kutu.appendChild(el("p", "pay-ipucu", dosyaPaylasimi ? t.ipucuMobil : t.ipucuMasa));
    // bağlantıyla paylaşım
    var bag = el("div", "pay-links");
    bag.appendChild(el("span", "pay-links__t", t.baglanti));
    var satir = el("div", "pay-links__row");
    var kop = el("button", "pay-link", t.kopyala); kop.type = "button";
    kop.addEventListener("click", function () {
      var bitti = function () { kop.textContent = t.kopyalandi; setTimeout(function () { kop.textContent = t.kopyala; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(bitti, function () { window.prompt(t.kopyala, url); });
      else window.prompt(t.kopyala, url);
    });
    satir.appendChild(kop);
    var e = encodeURIComponent, metinUrl = baslik + " " + url;
    [["WhatsApp", "https://wa.me/?text=" + e(metinUrl)],
     ["X", "https://twitter.com/intent/tweet?text=" + e(baslik) + "&url=" + e(url)],
     ["Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + e(url)],
     ["Telegram", "https://t.me/share/url?url=" + e(url) + "&text=" + e(baslik)],
     ["Reddit", "https://www.reddit.com/submit?url=" + e(url) + "&title=" + e(baslik)]].forEach(function (s) {
      var a = el("a", "pay-link", s[0]); a.href = s[1]; a.target = "_blank"; a.rel = "noopener"; satir.appendChild(a);
    });
    if (navigator.share && !dosyaPaylasimi) {
      var dg = el("button", "pay-link", t.diger); dg.type = "button";
      dg.addEventListener("click", function () { navigator.share({ title: baslik, text: baslik, url: url }).catch(function () {}); });
      satir.appendChild(dg);
    }
    bag.appendChild(satir); kutu.appendChild(bag);
    ov.appendChild(kutu); document.body.appendChild(ov);
    document.documentElement.classList.add("pay-acik");

    function adi() { return "rebirth-" + k.id + "-" + t.dosya[bicim] + ".jpg"; }
    function sec() {
      [].forEach.call(sekme.children, function (d) { d.classList.toggle("is-on", d.getAttribute("data-b") === bicim); });
      on.className = "pay-prev pay-prev--" + bicim;
      var b = bicim;
      if (dosyalar[b]) { goster(b); return; }
      img.removeAttribute("src"); on.classList.add("is-wait"); ana.disabled = true;
      if (!istek[b]) istek[b] = uret(k, dil, b).then(function (blob) {
        dosyalar[b] = new File([blob], "rebirth-" + k.id + "-" + t.dosya[b] + ".jpg", { type: "image/jpeg" });
        return dosyalar[b];
      });
      istek[b].then(function () { if (bicim === b) goster(b); }, function () { on.classList.remove("is-wait"); });
    }
    function goster(b) {
      if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
      img.dataset.url = URL.createObjectURL(dosyalar[b]);
      img.src = img.dataset.url;
      on.classList.remove("is-wait"); ana.disabled = false;
      // öteki biçimi de arkada hazırla: dokunuşta paylaşım hemen açılsın
      var o = b === "hikaye" ? "gonderi" : "hikaye";
      if (!istek[o]) istek[o] = uret(k, dil, o).then(function (blob) {
        dosyalar[o] = new File([blob], "rebirth-" + k.id + "-" + t.dosya[o] + ".jpg", { type: "image/jpeg" });
        return dosyalar[o];
      });
    }
    function indir() {
      var f = dosyalar[bicim]; if (!f) return;
      var a = document.createElement("a"), u = URL.createObjectURL(f);
      a.href = u; a.download = adi(); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    }
    ana.addEventListener("click", function () {
      var f = dosyalar[bicim]; if (!f) return;
      if (dosyaPaylasimi) {
        navigator.share({ files: [f], title: baslik, text: baslik + "\n" + url }).catch(function (err) {
          if (err && err.name !== "AbortError") indir();
        });
      } else indir();
    });
    function kapa() {
      if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
      ov.remove(); document.documentElement.classList.remove("pay-acik");
      document.removeEventListener("keydown", tus);
      if (geri) geri.focus();
    }
    function tus(ev) { if (ev.key === "Escape") kapa(); }
    kapat.addEventListener("click", kapa);
    ov.addEventListener("click", function (ev) { if (ev.target === ov) kapa(); });
    document.addEventListener("keydown", tus);
    kapat.focus();
    sec();
  }

  window.RBPaylas = {
    dugme: function (k, dil) {
      var d = el("button", "news-share");
      d.type = "button"; d.innerHTML = IKON; d.appendChild(document.createTextNode(y(dil).paylas));
      d.setAttribute("aria-haspopup", "dialog");
      d.addEventListener("click", function () { ac(k, dil, d); });
      return d;
    },
    uret: uret
  };
})();
