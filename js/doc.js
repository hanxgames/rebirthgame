/* ReBirth — haberler/destek/gizlilik sayfalarında dil (js/dil.js: 11 dil, ?lang= → kayıtlı seçim → tarayıcı dili; oyun ?lang= gönderir).
   Kısa arayüz metinleri (data-t) aşağıdaki sözlükten gelir (terimler oyunun .po çevirileri). Uzun metin blokları ([data-lang]:
   destek ve gizlilik) yalnız tr/en'dir: sayfada seçili dilin bloğu yoksa İngilizcesi görünür. */
(function () {
  "use strict";
  var D = window.RBDil;
  var SOZ = {
    "nav.home": { tr: "Site", en: "Home", es: "Inicio", pt_BR: "Início", de: "Startseite", fr: "Accueil", id: "Beranda", ja: "ホーム",
      ko: "홈", zh_CN: "首页", zh_TW: "首頁" },
    "nav.news": { tr: "Haberler", en: "News", es: "Noticias", pt_BR: "Notícias", de: "Nachrichten", fr: "Actualités", id: "Berita",
      ja: "ニュース", ko: "뉴스", zh_CN: "新闻", zh_TW: "新聞" },
    "nav.support": { tr: "Destek", en: "Support", es: "Soporte", pt_BR: "Suporte", de: "Support", fr: "Assistance", id: "Dukungan",
      ja: "サポート", ko: "지원", zh_CN: "支持", zh_TW: "支援" },
    "nav.privacy": { tr: "Gizlilik", en: "Privacy", es: "Privacidad", pt_BR: "Privacidade", de: "Datenschutz", fr: "Confidentialité",
      id: "Privasi", ja: "プライバシー", ko: "개인정보", zh_CN: "隐私", zh_TW: "隱私" },
    "news.notes": { tr: "Güncelleme notları", en: "Patch notes", es: "Notas de la versión", pt_BR: "Notas da atualização",
      de: "Patchnotes", fr: "Notes de mise à jour", id: "Catatan pembaruan", ja: "アップデート情報", ko: "업데이트 노트",
      zh_CN: "更新说明", zh_TW: "更新說明" },
    "news.meta": {
      tr: "Etkinlikler, duyurular ve güncelleme notları. Aynı akış oyunun ana menüsünde de görünür.",
      en: "Events, announcements and patch notes. The same feed appears on the game's main menu.",
      es: "Eventos, anuncios y notas de la versión. Las mismas noticias aparecen en el menú principal del juego.",
      pt_BR: "Eventos, anúncios e notas da atualização. O mesmo feed aparece no menu principal do jogo.",
      de: "Events, Ankündigungen und Patchnotes. Dieselben Nachrichten erscheinen im Hauptmenü des Spiels.",
      fr: "Événements, annonces et notes de mise à jour. Le même fil apparaît dans le menu principal du jeu.",
      id: "Event, pengumuman, dan catatan pembaruan. Kabar yang sama juga muncul di menu utama game.",
      ja: "イベント、お知らせ、アップデート情報。同じ内容がゲームのメインメニューにも表示されます。",
      ko: "이벤트, 공지, 업데이트 노트. 같은 소식이 게임 메인 메뉴에도 표시됩니다.",
      zh_CN: "活动、公告与更新说明。同样的内容也会显示在游戏主菜单中。",
      zh_TW: "活動、公告與更新說明。同樣的內容也會顯示在遊戲主選單中。" },
    "news.empty": {
      tr: "Haberler yüklenemedi. Biraz sonra yeniden deneyin.", en: "Couldn't load the news. Please try again in a moment.",
      es: "No se pudieron cargar las noticias. Inténtalo de nuevo en un momento.",
      pt_BR: "Não foi possível carregar as notícias. Tente novamente em instantes.",
      de: "Die Nachrichten konnten nicht geladen werden. Bitte versuche es gleich noch einmal.",
      fr: "Impossible de charger les actualités. Réessayez dans un instant.", id: "Berita gagal dimuat. Coba lagi sebentar lagi.",
      ja: "ニュースを読み込めませんでした。しばらくしてから再度お試しください。", ko: "뉴스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      zh_CN: "新闻加载失败，请稍后再试。", zh_TW: "新聞載入失敗，請稍後再試。" },
    "title.news": { tr: "ReBirth — Haberler ve Güncelleme Notları", en: "ReBirth — News & Patch Notes",
      es: "ReBirth — Noticias y notas de la versión", pt_BR: "ReBirth — Notícias e notas da atualização",
      de: "ReBirth — Nachrichten & Patchnotes", fr: "ReBirth — Actualités et notes de mise à jour",
      id: "ReBirth — Berita & Catatan Pembaruan", ja: "ReBirth — ニュース＆アップデート情報", ko: "ReBirth — 뉴스 및 업데이트 노트",
      zh_CN: "ReBirth — 新闻与更新说明", zh_TW: "ReBirth — 新聞與更新說明" }
  };
  var root = document.documentElement;
  var lang = D.sec();
  function soz(k) { var d = SOZ[k] || {}; return d[lang] || d.en || ""; }

  function apply() {
    D.uygula(lang);
    var blok = document.querySelector('[data-lang="' + lang + '"]') ? lang : D.ana(lang);
    var sayfa = root.getAttribute("data-sayfa");
    var t = sayfa ? soz("title." + sayfa) : root.getAttribute("data-title-" + blok);
    if (t) document.title = t;
    Array.prototype.forEach.call(document.querySelectorAll("[data-t]"), function (el) { el.textContent = soz(el.getAttribute("data-t")); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-lang]"), function (el) {
      el.hidden = el.getAttribute("data-lang") !== blok;
    });
    Array.prototype.forEach.call(document.querySelectorAll("a[data-keep-lang]"), function (a) {
      a.href = a.getAttribute("data-keep-lang") + "?lang=" + lang;
    });
  }
  var btn = document.getElementById("docLang");
  if (btn) D.menu(btn, lang, function (k) { lang = k; apply(); });
  var kan = document.querySelector('link[rel="canonical"]');
  if (kan) D.kanonik(kan.getAttribute("href").replace(/\?.*$/, ""));
  apply();
})();
