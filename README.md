# ReBirth — tanıtım sitesi

**https://hanxgames.github.io/rebirthgame/**

HanX Games'in 3D mobil strateji oyunu **ReBirth** için tanıtım sitesi: kaydırmalı giriş filmi, oyunun gerçek haritasıyla
etkileşimli harekât haritası, felaket efektleri, oyun içi seslendirmeli telsiz, kriz masası kartları, gündüz/gece karşılaştırması,
galeri ve tarayıcıda oynanan dört mini görev (Hava Harekâtı, Gölge Avı, Yeniden İnşa, Yardım Koridoru). Türkçe / İngilizce.

- Derleme adımı yok: düz HTML + CSS + JS. GSAP 3.12.5 (cdnjs) yalnız süs animasyonları için; yoksa da site çalışır.
- `index.html` · `css/tokens.css` (renkler, yazı tipleri) · `css/site.css` · `js/i18n.js` (TR/EN metinler) · `js/main.js` · `js/map.js`
- Mini oyunlar `js/games/<id>.js`, sözleşme `js/games/CONTRACT.md`, tek tek deneme `oyun.html?g=<id>&lang=tr|en`.
- Görseller, videolar, sesler ve harita verisi oyunun kendisinden: `python tools/build_assets.py <oyun_deposu> [--font] [--img] [--map] [--audio] [--video]`
  (oyun deposu ve tanıtım çekimleri gerekir; ayrıntı betiğin başında).
- Yerelde: `python tools/serve.py` (önbelleksiz) → http://localhost:8765 (harita verisi `fetch` ile yüklendiği için dosyadan açılmaz).

Oyundaki tüm yer, kurum ve kişi adları kurgusaldır. © 2026 HanX Games.
