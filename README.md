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
  Haberler/destek/gizlilik dil sürümleri `?lang=<kod>` adresleri (hreflang sayfa başında ve `sitemap.xml`'de).
- **Statik sayfalar (2026-11-21, SEO; `python tools/statik.py`, node gerekir; üretilen dosyaları elle düzenleme):**
  - Ana sayfanın dil sayfaları `/tr/ /en/ /es/ /pt-br/ /de/ /fr/ /id/ /ja/ /ko/ /zh-cn/ /zh-tw/`: kaynak `index.html` + sözlükler; başlık,
    açıklama, kanonik, hreflang ve `data-i18n` metinleri sunucuda o dilde. `<html data-sabit-dil>` dili sabitler (`js/dil.js`),
    `<base href="/">` göreli adresleri köke bağlar (sayfa içi çapalar `/en/#oyun` biçiminde üretilir). **`index.html` ya da `js/i18n*`
    değişince betiği çalıştır.** Kök `/` x-default: dili ziyaretçiye göre seçer; dil menüsü statik sayfaya gider; eski `/?lang=xx`
    adresleri `js/main.js`'te `/xx/`'e yönlenir. Sayfa başlıkları (`meta.title`) her dilde Play'deki adla başlar (aramalarda bu ad aranıyor).
  - Haber sayfaları `/tr/haber/<kimlik>/` ve `/en/news/<kimlik>/` + liste sayfaları: kaynak `haber_arsivi.json` (akışta bir kez yer
    almış her haber; akıştan kendiliğinden düşen arşivde ve sayfasıyla kalır, görseli silinmez; `haber_ekle.py sil` arşivden de siler).
    `haber_ekle.py` her yazımda haber/rehber sayfalarını ve `sitemap.xml`'i yeniler (node gerekmez).
  - Rehberler `/tr/rehber/<adres>/` ve `/en/guide/<adres>/`: kaynak `rehberler.json` (başlangıç, Sefer, Sandbox; görseller
    `assets/img/rehber/`). Oyun değişince metni güncelle. Ana sayfa alt bilgisinde "Rehberler" (`data-rehber`, tr → /tr/rehber/, diğer diller /en/guide/).
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
python tools/haber_ekle.py ios-yayin [2.2.1]                # App Store'daki iOS sürümünü uygula ("ios>=X" → "ios"; saatte bir Actions)
```
**iOS sürüm gecikmesi:** iOS sürümü App Store incelemesi yüzünden Android'den geç çıkar. `surum` alanlı kayıtta `ekle`, App Store'daki
iOS sürümü daha eskiyse platform listesine `"ios>=<surum>"` yazar: oyunda (2.2.1+) iOS'ta yalnız o sürümü kuran oyuncu görür, eski
sürümler hiç göstermez. O sürüm App Store'a çıkınca `.github/workflows/ios-surum.yml` (saatte bir, iTunes arama API'si) öğeyi düz
`"ios"`a çevirip yayınlar. Sürüm alanı olmayan ama yeni sürüme bağlı bir haberde listeyi elle ver: `["android", "pc", "web", "ios>=2.2.1"]`.
Taslak biçimi betiğin başında (başlık / özet / metin TR + EN zorunlu; oyunun diğer dilleri İngilizcesini gösterir; `baglanti` verilirse
oyundaki "Detayları gör" o adresi, verilmezse `haberler.html#<id>` açar). `video` verilen kayıt sayfada üstte oynatıcıyla açılır: Türkçe sayfa
`tr`, İngilizce sayfa (oyunun diğer bütün dilleri) `en` videosunu oynatır; YouTube oynatıcısı yalnız tıklayınca yüklenir (privacy.html §5). Ardından siteyi yayınla (git push): GitHub Pages birkaç
dakikada günceller, oyun dakikalık sorgu parametresiyle önbelleği aşar.

**Paylaşım:** haberler.html'de her kartın altında "Paylaş" (`js/paylas.js`): haberin hikâye (1080×1920) ve gönderi (1080×1350)
görseli tarayıcıda tuvalle çizilir; telefonda sistem paylaşım menüsüyle dosya olarak (Instagram, TikTok, YouTube, WhatsApp…),
masaüstünde indirilerek paylaşılır; bağlantı kopyalama ve WhatsApp/X/Facebook/Telegram/Reddit bağlantıları. Bağlantı adresi
`paylas/<tr|en>/<kimlik>.html`: Open Graph önizlemeli, `noindex` sayfa; tarayıcıyı haberler.html#<kimlik>'e yönlendirir.
`haber_ekle.py` her yazımda bu sayfaları yeniler, akıştan düşenlerinkini siler.
Yanındaki kopyala simgesi ("Metni kopyala", `RBPaylas.kopya`) başlığı, özeti ve metni sayfadaki düzende düz yazı olarak panoya
kopyalar (bloklar arasında boş satır, "• " maddeler alt alta; Reddit vb. gönderiye yapıştırmak için).

Oyundaki tüm yer, kurum ve kişi adları kurgusaldır. © 2026 HanX Games.

## Topluluk (2026-11-21)
`topluluk.html` + `js/topluluk.js` + `css/topluluk.css`: Reddit benzeri tek ekranlı akış (sıralama: en çok beğenilen / en çok yorumlanan /
en yeni), yukarı-aşağı oy, tıklayınca açılan yorumlar, isteğe bağlı tek ekran görüntüsü (tarayıcıda WebP'ye küçültülür), "Çevir"
(Chrome'un cihaz üstü çevirmeni, yoksa Google Çeviri), bağlantı kopyalama, bildir. Giriş yalnız Google (Firebase Auth,
dead-mans-deck-global; izinli alan adı rebirthgame.tr). Veri Realtime Database `topluluk_*`; kurallar
`YenidenDogus/ajanlar/site/topluluk_kurallar.py` (üretir) + `topluluk_sinama.py` (emülatör sınaması) → `panel/database.rules.json`.
Günde en çok 5 gönderi / 60 yorum; gönderiler 30 gün sonra silinir (kurallar süresi dolanı herkese açar, sayfa açılışta temizler).
Moderasyon sayfanın içinde: `topluluk_yonetici/<uid> = true` olan hesap gizle / sil / yazarı engelle düğmelerini ve bildirim sayısını
görür (yönetici kaydı yalnız CLI/konsoldan). Yerel deneme: Auth + Database emülatörü, `topluluk.html?emu=1&emudb=<port>` ve konsolda
`__tpDenemeGiris("ad")` (yalnız localhost). Gizlilik: privacy.html "Community page" / "Topluluk sayfası".
