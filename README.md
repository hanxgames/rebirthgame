# ReBirth — tanıtım sitesi

**https://rebirthgame.tr/**

HanX Games'in 3D mobil strateji oyunu **ReBirth** için tanıtım sitesi: kaydırmalı giriş filmi, oyunun gerçek haritasıyla
etkileşimli harekât haritası, felaket efektleri, oyun içi seslendirmeli telsiz, kriz masası kartları, gündüz/gece karşılaştırması,
galeri ve tarayıcıda oynanan dört mini görev (Hava Harekâtı, Gölge Avı, Yeniden İnşa, Yardım Koridoru). Türkçe / İngilizce.

- Derleme adımı yok: düz HTML + CSS + JS. GSAP 3.12.5 (cdnjs) yalnız süs animasyonları için; yoksa da site çalışır.
- `index.html` · `css/tokens.css` (renkler, yazı tipleri) · `css/site.css` · `js/i18n.js` (TR/EN metinler) · `js/main.js` · `js/map.js`
- Diller (2026-10-28): oyunun 11 dili (tr, en, es, pt_BR, de, fr, id, ja, ko, zh_CN, zh_TW). Seçim ve dil düğmesi `js/dil.js` +
  `css/dil.css` (`?lang=` → kayıtlı seçim → tarayıcı dili). Ana sayfa metni tr/en `js/i18n.js`'te, diğerleri `js/i18n/<kod>.js`
  (aynı anahtarlar; i18n.js'e anahtar ekleyince dokuz dosyaya da ekle). Haberler/destek/gizlilik kısa metinleri `js/doc.js` sözlüğünde;
  destek ve gizlilik metni, mini oyunlar, ses, fragman ve ekran görüntüleri yalnız tr/en (diğer diller İngilizcesini görür).
  Dil sürümleri `?lang=<kod>` adresleri: hreflang `index.html`/`haberler.html` başında ve `sitemap.xml`'de.
- Mini oyunlar `js/games/<id>.js`, sözleşme `js/games/CONTRACT.md`, tek tek deneme `oyun.html?g=<id>&lang=tr|en`.
- Görseller, videolar, sesler ve harita verisi oyunun kendisinden: `python tools/build_assets.py <oyun_deposu> [--font] [--img] [--map] [--audio] [--video]`
  (oyun deposu ve tanıtım çekimleri gerekir; ayrıntı betiğin başında).
- Yerelde: `python tools/serve.py` (önbelleksiz) → http://localhost:8765 (harita verisi `fetch` ile yüklendiği için dosyadan açılmaz).

## Haberler ve güncelleme notları (oyunun ana menüsüyle ortak)
`haberler.json` hem `haberler.html` sayfasını hem de oyunun ana menüsündeki "Haberler / Güncelleme notları" panelini besler
(oyun menü her açıldığında ve açıkken 5 dakikada bir okur; görselleri cihazda önbellekler, akışta olmayanları siler).
Her türde en çok **5** kayıt tutulur: yenisi eklenince en eskisi akıştan düşer ve görseli `assets/img/haber/`'den silinir.
```
python tools/haber_ekle.py ekle haber taslak.json gorsel.jpg        # yeni haber (görsel 16:9 kırpılır, 640x360 JPEG)
python tools/haber_ekle.py ekle guncelleme taslak.json gorsel.png   # yeni güncelleme notu
python tools/haber_ekle.py video <id> <tr> <en> [kapak.jpg]   # habere video: YouTube adresi ya da yerel .mp4 (assets/video/haber/'e
                                                            # kopyalanır, kayıt düşünce silinir); "- -" kaldırır
python tools/haber_ekle.py sil <id> · liste · denetle
```
Taslak biçimi betiğin başında (başlık / özet / metin TR + EN zorunlu; oyunun diğer dilleri İngilizcesini gösterir; `baglanti` verilirse
oyundaki "Detayları gör" o adresi, verilmezse `haberler.html#<id>` açar). `video` verilen kayıt sayfada üstte oynatıcıyla açılır: Türkçe sayfa
`tr`, İngilizce sayfa (oyunun diğer bütün dilleri) `en` videosunu oynatır; YouTube oynatıcısı yalnız tıklayınca yüklenir (privacy.html §5). Ardından siteyi yayınla (git push): GitHub Pages birkaç
dakikada günceller, oyun dakikalık sorgu parametresiyle önbelleği aşar.

**Paylaşım:** haberler.html'de her kartın altında "Paylaş" (`js/paylas.js`): haberin hikâye (1080×1920) ve gönderi (1080×1350)
görseli tarayıcıda tuvalle çizilir; telefonda sistem paylaşım menüsüyle dosya olarak (Instagram, TikTok, YouTube, WhatsApp…),
masaüstünde indirilerek paylaşılır; bağlantı kopyalama ve WhatsApp/X/Facebook/Telegram/Reddit bağlantıları. Bağlantı adresi
`paylas/<tr|en>/<kimlik>.html`: Open Graph önizlemeli, `noindex` sayfa; tarayıcıyı haberler.html#<kimlik>'e yönlendirir.
`haber_ekle.py` her yazımda bu sayfaları yeniler, akıştan düşenlerinkini siler.

Oyundaki tüm yer, kurum ve kişi adları kurgusaldır. © 2026 HanX Games.
