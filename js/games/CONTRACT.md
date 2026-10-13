# ReBirth mini oyun sözleşmesi

Her oyun tek bir dosyadır: `js/games/<id>.js` (düz ES2019, modül değil, harici kütüphane yok). Site `js/host.js`'i yükler,
sonra oyun dosyalarını; oyunlar kendini kaydeder ve site istediği zaman bir kaba bağlar.

```js
(function () {
  "use strict";
  window.RBGames = window.RBGames || {};
  window.RBGames.<id> = {
    title: { tr: "…", en: "…" },
    mount: function (el, ctx) {
      // el: position:relative bir div (genişliği ve yüksekliği site belirler; oyun boyut değişimine uyar)
      // ctx: { id, lang: "tr"|"en", assets: "assets/", sfx(name, vol), voice(key), best(), onEnd({score, won}) → {score, won, best, newBest} }
      return { destroy: function () {}, pause: function () {}, resume: function () {} };
    }
  };
})();
```

## Kurallar
- **Boyut:** kap ölçüsü değişebilir (masaüstünde ~16:10, telefonda daha uzun). `ResizeObserver` ile uy; canvas'ı
  `devicePixelRatio` (en fazla 2) ile keskin çiz. Kabın dışına taşma.
- **Giriş:** Pointer Events (fare + dokunmatik). Yalnız hover'a dayalı mekanik yok. Dokunma hedefleri ≥ 44 px.
  Sayfa kaydırmasını yalnız oyun alanında ve yalnız oyun sırasında engelle (`touch-action: none` canvas'ta).
- **Akış:** giriş kartı (başlık, 1–2 satır nasıl oynanır, "Başla") → oyun → bitiş kartı (skor, en iyi skor, "Tekrar").
  Bitişte `var r = ctx.onEnd({score, won})` çağır; `r.best`, `r.newBest` ile en iyiyi göster.
- **Duraklatma:** `pause()` çağrılınca (oyun alanı ekrandan çıktı) RAF'ı durdur, `resume()` ile devam et. `destroy()` tüm
  dinleyicileri, RAF'ı, gözlemcileri, eklenen DOM'u kaldırır.
- **Metin:** iki dil gömülü olsun (`ctx.lang`). Yer/kişi adları oyundaki kurgusal adlar (Tarsel, Gölge Cephesi…).
- **Görünüm (oyunun arayüzü):** kömür paneller `--bg #191817 / --bg2 #252423`, kâğıt kartlar `--cream #ece4d0` üstüne
  `--ink #201d1b`, hardal vurgu `--accent #f1ad2a`, isyancı kırmızısı `--bad #db4738`, iyi `--good #66b86b`,
  çizgiler `rgba(242,230,199,.1)`. Yazı: başlıklar `Anton`, etiketler büyük harf `Barlow Condensed` (700, harf aralığı .08em),
  gövde `Barlow`, el yazısı `Caveat` (site bu yazı tiplerini ve CSS değişkenlerini yükler; canvas'ta da kullan).
  Sinematik ve "dokunsal": yumuşak geçişler, parçacıklar, sarsıntı, ışık, damga efektleri. Kendi CSS'ini `<style>` ile ekle,
  sınıfları `rbg-<id>-` ile öneklendir.
- **Ses:** `ctx.sfx(ad, ses)` → `patlama1 patlama2 fuze jet telsiz ui_tik ui_onay ui_hata basarim insaat damga olay iyi kotu`.
  `ctx.voice(anahtar)` → `sec_1 sec_2 hareket_1 taarruz_1 koruma_1 devriye_1 hava_sec_1 hava_hareket_1 vurus_1 vurus_2 dusme_1
  geri_alindi_1 karargah_tespit_1 karargah_yok_1 tirmanma_1 konvoy_pusu_1 konvoy_vardi_1 kriz_basla_1 salgin_yayildi_1
  secim_basla_1 secim_basarili_1 bayram_1 zafer_1 baris_1 anma_1 telsiz_1 telsiz_2 telsiz_3` (askerî telsiz replikleri; az kullan,
  önemli anlarda).
- **Veri:** `ctx.assets + "data/map_<tarsel|kesra|varzan>.json"`:
  `{map, province, view:[2100,1400], districts:[{id, name, terrain, pop, role, c:[x,y], n:[komşu id…], d:"M x,y L … Z"}]}`
  (SVG yolları ve merkezler 2100×1400 görüntü uzayında; `role`: capital, port, bridge, lake, border, spa, strait, hq, plateau,
  forest ya da boş; id 10 her haritada isyancı karargâhı). Harita görüntüleri `ctx.assets + "img/map/<harita>_gun.webp"`
  (2100×1400) ve `_gun_k.webp` (1050×700), Tarsel'in gecesi `tarsel_gece(_k).webp`. Görüntü ve yollar birebir hizalı.
- **Performans:** 60 fps hedef, telefon dahil. Her karede nesne/gradyan üretme; parçacık havuzu kullan. Duraklatılınca CPU 0.
- **Doğrulama:** `node --check js/games/<id>.js` hatasız. Test sayfası: `oyun.html?g=<id>&lang=tr`.
