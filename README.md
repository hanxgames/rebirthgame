# ReBirth — tanıtım sitesi

**https://rebirthgame.tr/**

HanX Games'in 3D mobil strateji oyunu **ReBirth** için tanıtım sitesi: kaydırmalı giriş filmi, oyunun gerçek haritasıyla
etkileşimli harekât haritası, felaket efektleri, oyun içi seslendirmeli telsiz, kriz masası kartları, gündüz/gece karşılaştırması,
galeri ve tarayıcıda oynanan dört mini görev (Hava Harekâtı, Gölge Avı, Yeniden İnşa, Yardım Koridoru). Türkçe / İngilizce.

- Derleme adımı yok: düz HTML + CSS + JS. GSAP 3.12.5 (cdnjs) yalnız süs animasyonları için; yoksa da site çalışır.
- `index.html` · `css/tokens.css` (renkler, yazı tipleri) · `css/site.css` · `js/i18n.js` (TR/EN metinler) · `js/main.js` · `js/map.js`
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
python tools/haber_ekle.py video <id> <tr_adres> <en_adres>   # habere video (YouTube ya da .mp4); "- -" kaldırır
python tools/haber_ekle.py sil <id> · liste · denetle
```
Taslak biçimi betiğin başında (başlık / özet / metin TR + EN zorunlu; oyunun diğer dilleri İngilizcesini gösterir; `baglanti` verilirse
oyundaki "Detayları gör" o adresi, verilmezse `haberler.html#<id>` açar). `video` verilen kayıt sayfada üstte oynatıcıyla açılır: Türkçe sayfa
`tr`, İngilizce sayfa (oyunun diğer bütün dilleri) `en` videosunu oynatır; YouTube oynatıcısı yalnız tıklayınca yüklenir (privacy.html §5). Ardından siteyi yayınla (git push): GitHub Pages birkaç
dakikada günceller, oyun dakikalık sorgu parametresiyle önbelleği aşar.

Oyundaki tüm yer, kurum ve kişi adları kurgusaldır. © 2026 HanX Games.
