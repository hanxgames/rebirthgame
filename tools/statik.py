#!/usr/bin/env python3
"""Arama motorları için statik sayfa üretici (rebirthgame.tr).

  python tools/statik.py            # hepsini üret: dil sayfaları + site haritası

Ana sayfanın dil sürümleri: index.html (kaynak, Türkçe) + js/i18n sözlükleri → /tr/, /en/, /es/, /pt-br/, /de/, /fr/, /id/,
/ja/, /ko/, /zh-cn/, /zh-tw/ (index.html). Başlık, açıklama, kanonik, hreflang ve data-i18n metinleri sunucuda o dilde gelir;
<html data-sabit-dil> sayfanın dilini sabitler (js/dil.js), <base href="/"> göreli adresleri köke bağlar. Kök "/" x-default:
ziyaretçinin dilini seçen sayfa olarak kalır (eski "/?lang=xx" adresleri js/main.js'te /xx/'e yönlenir).
Üretilen dosyaları elle düzenleme: index.html ya da sözlükleri değiştirip bu betiği çalıştır. Sözlükleri okumak için node gerekir.
"""
import html, json, os, re, subprocess, sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://rebirthgame.tr"
# (sözlük kodu, html lang / hreflang, klasör, og:locale)
DILLER = [
    ("tr", "tr", "tr", "tr_TR"), ("en", "en", "en", "en_US"), ("es", "es", "es", "es_ES"),
    ("pt_BR", "pt-BR", "pt-br", "pt_BR"), ("de", "de", "de", "de_DE"), ("fr", "fr", "fr", "fr_FR"),
    ("id", "id", "id", "id_ID"), ("ja", "ja", "ja", "ja_JP"), ("ko", "ko", "ko", "ko_KR"),
    ("zh_CN", "zh-CN", "zh-cn", "zh_CN"), ("zh_TW", "zh-TW", "zh-tw", "zh_TW"),
]
APPSTORE_ALT = {
    "tr": "App Store'dan İndirin", "en": "Download on the App Store", "es": "Descárgalo en el App Store", "pt_BR": "Baixar na App Store",
    "de": "Laden im App Store", "fr": "Télécharger dans l'App Store", "id": "Unduh di App Store", "ja": "App Storeからダウンロード",
    "ko": "App Store에서 다운로드하기", "zh_CN": "在 App Store 下载", "zh_TW": "在 App Store 下載",
}
BOS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
URETILDI = "<!-- Üretilmiş sayfa: tools/statik.py (kaynak: index.html + js/i18n). Elle düzenleme. -->"


def oku(p):
    with open(os.path.join(KOK, p), encoding="utf-8", newline="") as f:
        return f.read()


def yaz(p, s):
    """değiştiyse yazar (git temiz kalsın); True = yazıldı"""
    tam = os.path.join(KOK, p)
    if os.path.exists(tam) and oku(p) == s:
        return False
    os.makedirs(os.path.dirname(tam), exist_ok=True)
    with open(tam, "w", encoding="utf-8", newline="") as f:
        f.write(s)
    return True


def sozluk():
    r = subprocess.run(["node", os.path.join(KOK, "tools", "sozluk_dok.js"), KOK], capture_output=True, check=True)
    return json.loads(r.stdout.decode("utf-8"))


def cevirmen(I, k):
    def t(anahtar):   # js/main.js t() ile aynı: dil → en → tr
        v = I.get(k, {}).get(anahtar)
        if v is None and k != "tr":
            v = I.get("en", {}).get(anahtar)
        if v is None:
            v = I.get("tr", {}).get(anahtar)
        return v
    return t


def adres(klasor):
    return SITE + "/" + (klasor + "/" if klasor else "")


def hreflang_blogu(girintisiz=True):
    satirlar = ['<link rel="alternate" hreflang="%s" href="%s">' % (h, adres(kl)) for _, h, kl, _ in DILLER]
    satirlar.append('<link rel="alternate" hreflang="x-default" href="%s/">' % SITE)
    return "\n".join(satirlar)


def eleman_sonu(s, i, etiket):
    """s[i:] açılış etiketinin hemen sonrası; aynı etiketin iç içe geçmesini sayarak kapanış etiketinin (başlangıç, bitiş) konumu"""
    derinlik = 1
    for m in re.finditer(r"<(/?)%s\b[^>]*>" % re.escape(etiket), s[i:], re.I):
        if m.group(1):
            derinlik -= 1
        elif not m.group(0).endswith("/>"):
            derinlik += 1
        if derinlik == 0:
            return i + m.start(), i + m.end()
    raise ValueError("kapanmayan etiket: " + etiket)


def ic_degistir(s, nitelik, f):
    """nitelik="data-i18n" ya da "data-i18n-html": öğenin içini f(anahtar) ile değiştirir (sondan başa, konumlar kaymasın)"""
    desen = re.compile(r'<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?\s%s="([^"]+)"[^>]*>' % re.escape(nitelik))
    for m in reversed(list(desen.finditer(s))):
        etiket = m.group(1).lower()
        if etiket in BOS:
            continue
        yeni = f(m.group(2))
        if yeni is None:
            continue
        a, _ = eleman_sonu(s, m.end(), etiket)
        s = s[:m.end()] + yeni + s[a:]
    return s


def nitelik_yaz(etiket, ad, deger):
    deger = html.escape(deger, quote=True)
    desen = re.compile(r'(\s%s=")[^"]*(")' % re.escape(ad))
    if desen.search(etiket):
        return desen.sub(lambda m: m.group(1) + deger + m.group(2), etiket, count=1)
    return re.sub(r"\s*/?>$", lambda m: ' %s="%s"%s' % (ad, deger, m.group(0).strip()), etiket, count=1)


def hreflang_degistir(s):
    s = re.sub(r'<link rel="alternate" hreflang="[^"]+" href="[^"]*">\n', "", s)
    return s.replace('<link rel="canonical"', "@@KANONIK@@", 1)


def kok_sayfa(s):
    """kök index.html: hreflang bloğunu statik dil sayfalarına çevirir (kanonik "/" kalır)"""
    s = hreflang_degistir(s)
    i = s.index("@@KANONIK@@")
    j = s.index("\n", i) + 1
    return s[:j].replace("@@KANONIK@@", '<link rel="canonical"') + hreflang_blogu() + "\n" + s[j:]


def dil_sayfasi(kaynak, I, k, hl, kl, og):
    t = cevirmen(I, k)
    url = adres(kl)
    s = kaynak
    s = s.replace("<!doctype html>\n", "<!doctype html>\n" + URETILDI + "\n", 1)
    s = re.sub(r'<html lang="[^"]*">', '<html lang="%s" data-sabit-dil="%s" data-dil="%s">' % (hl, k, k), s, count=1)
    s = s.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<base href="/">\n', 1)
    baslik, aciklama = t("meta.title"), t("meta.desc")
    s = re.sub(r"<title>.*?</title>", lambda m: "<title>%s</title>" % html.escape(baslik, quote=False), s, count=1)
    s = re.sub(r'<meta name="description" content="[^"]*">', lambda m: '<meta name="description" content="%s">' % html.escape(aciklama), s, count=1)
    s = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % url, s, count=1)
    s = kok_sayfa(s)
    s = re.sub(r'<meta property="og:title" content="[^"]*">', lambda m: '<meta property="og:title" content="%s">' % html.escape(baslik), s, count=1)
    s = re.sub(r'<meta property="og:description" content="[^"]*">', lambda m: '<meta property="og:description" content="%s">' % html.escape(aciklama), s, count=1)
    s = re.sub(r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="%s">\n<meta property="og:locale" content="%s">' % (url, og), s, count=1)
    # gövde: data-i18n (düz metin), data-i18n-html (HTML), data-i18n-attr (nitelikler)
    s = ic_degistir(s, "data-i18n", lambda a: html.escape(t(a), quote=False) if isinstance(t(a), str) else None)
    s = ic_degistir(s, "data-i18n-html", lambda a: t(a) if isinstance(t(a), str) else None)

    def nitelikler(m):
        etiket = m.group(0)
        for parca in m.group(1).split(","):
            kv = parca.split(":")
            if len(kv) == 2 and isinstance(t(kv[1].strip()), str):
                etiket = nitelik_yaz(etiket, kv[0].strip(), t(kv[1].strip()))
        return etiket
    s = re.sub(r'<[a-zA-Z][^>]*\sdata-i18n-attr="([^"]+)"[^>]*>', nitelikler, s)
    # App Store rozeti, dilini koruyan bağlantılar, sayfa içi çapalar (<base> yüzünden tam yol), SVG kırpma başvuruları
    s = re.sub(r'<img data-appstore="" src="[^"]*" alt="[^"]*"',
               lambda m: '<img data-appstore="" src="assets/img/badge/app-store-%s.svg" alt="%s"' % (k, html.escape(APPSTORE_ALT[k])), s)
    s = re.sub(r'href="([^"?#]+)" data-keep-lang="([^"]+)"', lambda m: 'href="%s?lang=%s" data-keep-lang="%s"' % (m.group(2), k, m.group(2)), s)
    s = s.replace('href="tr/rehber/" data-rehber', 'href="%s" data-rehber' % ("/tr/rehber/" if k == "tr" else "/en/guide/"))
    s = re.sub(r'href="#([^"]*)"', lambda m: 'href="/%s/#%s"' % (kl, m.group(1)), s)
    s = re.sub(r"url\(#([^)]+)\)", lambda m: "url(/%s/#%s)" % (kl, m.group(1)), s)
    return s


def dil_sayfalari():
    kaynak = oku("index.html")
    I = sozluk()
    degisen = []
    if yaz("index.html", kok_sayfa(kaynak)):
        degisen.append("index.html")
        kaynak = oku("index.html")
    for k, hl, kl, og in DILLER:
        p = "%s/index.html" % kl
        if yaz(p, dil_sayfasi(kaynak, I, k, hl, kl, og)):
            degisen.append(p)
    return degisen


# ---------------------------------------------------------------- site haritası
def sitemap_girdisi(loc, oncelik, alternatifler=None):
    s = "  <url>\n    <loc>%s</loc><changefreq>weekly</changefreq><priority>%s</priority>\n" % (loc, oncelik)
    for h, u in (alternatifler or []):
        s += '    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>\n' % (h, u)
    return s + "  </url>\n"


def site_haritasi(ek=()):
    """ana sayfa girdilerini (kök + dil sayfaları) yeniden yazar, diğer girdileri korur; ek: (loc, öncelik, alternatifler) listesi"""
    s = oku("sitemap.xml")
    nl = "\r\n" if "\r\n" in s else "\n"
    s = s.replace("\r\n", "\n")
    bas = s.index("<urlset")
    bas = s.index(">", bas) + 2
    son = s.rindex("</urlset>")
    girdiler = re.findall(r"  <url>\n.*?  </url>\n", s[bas:son], re.S)
    ana = {SITE + "/"} | {adres(kl) for _, _, kl, _ in DILLER}
    ek_loc = {e[0] for e in ek}

    def koru(g):
        loc = re.search(r"<loc>([^<]+)</loc>", g).group(1)
        return not (loc in ana or loc.startswith(SITE + "/?lang=") or loc in ek_loc or "/haber/" in loc or "/news/" in loc
                    or "/rehber/" in loc or "/guide/" in loc)
    alt = [(h, adres(kl)) for _, h, kl, _ in DILLER] + [("x-default", SITE + "/")]
    yeni = [sitemap_girdisi(SITE + "/", "1.0", alt)] + [sitemap_girdisi(adres(kl), "0.9", alt) for _, _, kl, _ in DILLER]
    yeni += [g for g in girdiler if koru(g)]
    yeni += [sitemap_girdisi(*e) for e in ek]
    s = s[:bas] + "".join(yeni) + s[son:]
    return yaz("sitemap.xml", s.replace("\n", nl))


# ---------------------------------------------------------------- haber ve rehber sayfaları (tr + en)
ARSIV = "haber_arsivi.json"     # akıştan düşen haberler de burada kalır (sayfaları silinmesin); "sil" komutu buradan da siler
REHBER = "rehberler.json"
YOL = {"tr": {"ana": "tr", "haber": "tr/haber", "rehber": "tr/rehber"}, "en": {"ana": "en", "haber": "en/news", "rehber": "en/guide"}}
AY = {"tr": ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
      "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]}
MET = {
    "tr": {"site": "Site", "haberler": "Haberler", "rehberler": "Rehberler", "destek": "Destek", "gizlilik": "Gizlilik", "diger": "EN",
           "haber": "Haber", "rehber": "Rehber", "tum_haber": "Tüm haberler", "tum_rehber": "Tüm rehberler", "canli": "Güncel akış ve tepkiler",
           "diger_haber": "Diğer haberler", "diger_rehber": "Diğer rehberler", "icindekiler": "İçindekiler", "video": "Videoyu izle",
           "cta_b": "Vilayet seni bekliyor", "cta_a": "Ücretsiz başla · İnternetsiz oyna · 12 dil", "play": "Google Play'den indir",
           "pc": "PC'de oyna", "liste_haber_b": "ReBirth haberleri", "liste_rehber_b": "ReBirth rehberleri",
           "liste_haber_a": "ReBirth: Savaş ve Şehir Kurma'dan duyurular, etkinlikler ve güncelleme notları; en yenisi en üstte.",
           "liste_rehber_a": "ReBirth: Savaş ve Şehir Kurma için başlangıç, mod ve strateji rehberleri.", "guncelleme": "Güncelleme notu"},
    "en": {"site": "Home", "haberler": "News", "rehberler": "Guides", "destek": "Support", "gizlilik": "Privacy", "diger": "TR",
           "haber": "News", "rehber": "Guide", "tum_haber": "All news", "tum_rehber": "All guides", "canli": "Live feed and reactions",
           "diger_haber": "More news", "diger_rehber": "More guides", "icindekiler": "Contents", "video": "Watch the video",
           "cta_b": "The province is waiting", "cta_a": "Free to start · Plays offline · 12 languages", "play": "Get it on Google Play",
           "pc": "Play on PC", "liste_haber_b": "ReBirth news", "liste_rehber_b": "ReBirth guides",
           "liste_haber_a": "Announcements, events and patch notes from ReBirth: Offline War Strategy, newest first.",
           "liste_rehber_a": "Beginner, mode and strategy guides for ReBirth: Offline War Strategy.", "guncelleme": "Patch notes"},
}
PLAY_URL = "https://play.google.com/store/apps/details?id=com.hantro.business&amp;referrer=utm_source%3Drebirthgame.tr%26utm_medium%3Dweb%26utm_campaign%3D"
PLAY_SVG = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.8v18.4c0 .5.5.8.9.6l10.7-9.2c.3-.3.3-.8 0-1.1L4.9 2.2c-.4-.2-.9.1-.9.6zm12.7 '
            '7.4 2.6-1.5c.9.5.9 1.8 0 2.3l-2.6 1.5-2-1.2 2-1.1z"/></svg>')
YAYINCI = {"@type": "Organization", "name": "HanX Games", "url": "https://hanxgames.net/",
           "logo": {"@type": "ImageObject", "url": SITE + "/assets/img/ui/logo.webp"}}


def e(x):
    return html.escape(str(x), quote=True)


def tarih_metni(t, dil):
    y, a, g = str(t)[:10].split("-")
    return "%d %s %s" % (int(g), AY["tr"][int(a) - 1], y) if dil == "tr" else "%s %d, %s" % (AY["en"][int(a) - 1], int(g), y)


def baglantila(metin):
    """kaçışlı metindeki https adreslerini ve e-postaları bağlantıya çevirir"""
    metin = re.sub(r"(https://[^\s<]+[^\s<.,;:!?)])", r'<a href="\1" target="_blank" rel="noopener">\1</a>', metin)
    return re.sub(r"\b([\w.+-]+@[\w-]+\.[\w.]+[a-z])\b", r'<a href="mailto:\1">\1</a>', metin)


def govde(satirlar):
    """oyunun/haberler.js'in biçimi: "• " ile başlayan satırlar madde, diğerleri paragraf"""
    out, ul = [], False
    for s in satirlar:
        if re.match(r"^•\s*", s):
            if not ul:
                out.append("<ul>")
                ul = True
            out.append("<li>%s</li>" % baglantila(e(re.sub(r"^•\s*", "", s))))
        else:
            if ul:
                out.append("</ul>")
                ul = False
            out.append("<p>%s</p>" % baglantila(e(s)))
    if ul:
        out.append("</ul>")
    return "\n".join(out)


def cta(dil, kampanya):
    m = MET[dil]
    return ('<aside class="news-cta">\n'
            '  <img class="news-cta__logo" src="assets/img/ui/logo.webp" alt="ReBirth" width="1200" height="560" loading="lazy">\n'
            '  <div class="news-cta__txt"><b>%s</b><span>%s</span></div>\n'
            '  <div class="news-cta__btns">\n'
            '    <a class="appstore appstore--doc" href="https://apps.apple.com/app/id6821863283" target="_blank" rel="noopener"><img src="assets/img/badge/app-store-%s.svg" alt="%s" height="44"></a>\n'
            '    <a class="doc-btn" href="%s%s" target="_blank" rel="noopener">%s<span>%s</span></a>\n'
            '    <a class="doc-btn doc-btn--ghost" href="https://hanx-games.itch.io/rebirth" target="_blank" rel="noopener"><span>%s</span></a>\n'
            '  </div>\n</aside>') % (e(m["cta_b"]), e(m["cta_a"]), dil, e(APPSTORE_ALT[dil]), PLAY_URL, kampanya, PLAY_SVG, e(m["play"]), e(m["pc"]))


def sayfa(dil, yol, alt_yol, tur, baslik, aciklama, gorsel, ld, kicker, h1, meta, icerik):
    """tr/en statik sayfa iskeleti (css/doc.css); yol: "tr/haber/<kimlik>/" gibi, alt_yol öbür dildeki karşılığı (yoksa None)"""
    m, Y = MET[dil], YOL[dil]
    url = SITE + "/" + yol
    obur = "en" if dil == "tr" else "tr"
    hl = ['<link rel="alternate" hreflang="%s" href="%s">' % (dil, url)]
    if alt_yol:
        hl.append('<link rel="alternate" hreflang="%s" href="%s/%s">' % (obur, SITE, alt_yol))
        hl.append('<link rel="alternate" hreflang="x-default" href="%s/%s">' % (SITE, yol if dil == "en" else alt_yol))
    dil_linki = ('<a class="doc-lang dil-btn" href="%s" hreflang="%s" lang="%s">%s</a>' % (alt_yol, obur, obur, m["diger"])
                 if alt_yol else "")
    on = lambda t: ' class="is-on"' if t == tur else ""
    return """<!doctype html>
%(uretildi)s
<html lang="%(dil)s">
<head>
<meta charset="utf-8">
<base href="/">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<meta name="theme-color" content="#191817">
<meta name="apple-itunes-app" content="app-id=6821863283">
<link rel="canonical" href="%(url)s">
%(hl)s
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta property="og:type" content="%(ogtur)s">
<meta property="og:site_name" content="ReBirth">
<meta property="og:locale" content="%(oglocale)s">
<meta property="og:title" content="%(ogtitle)s">
<meta property="og:description" content="%(desc)s">
<meta property="og:url" content="%(url)s">
<meta property="og:image" content="%(gorsel)s">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">%(ld)s</script>
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/doc.css?v=9">
<link rel="stylesheet" href="css/dil.css?v=1">
</head>
<body class="art">

<header class="doc-nav">
  <a class="doc-nav__logo" href="/%(ana)s/"><span class="re">RE</span>BIRTH</a>
  <div class="doc-nav__right">
    <a class="hide-s" href="/%(ana)s/">%(m_site)s</a>
    <a%(on_haber)s href="/%(y_haber)s/">%(m_haberler)s</a>
    <a%(on_rehber)s href="/%(y_rehber)s/">%(m_rehberler)s</a>
    <a class="hide-s" href="support.html?lang=%(dil)s">%(m_destek)s</a>
    %(dil_linki)s
  </div>
</header>

<div class="doc-hero art-hero"><div class="doc-wrap">
  <div class="doc-kicker">%(kicker)s</div>
  <h1>%(h1)s</h1>
  <p class="doc-meta">%(meta)s</p>
</div></div>

<main class="doc-body"><div class="doc-wrap">
%(icerik)s
</div></main>

<footer class="doc-foot"><div class="doc-wrap">
  <span>© 2026 HanX Games · ReBirth</span>
  <nav>
    <a href="/%(ana)s/">%(m_site)s</a>
    <a href="/%(y_haber)s/">%(m_haberler)s</a>
    <a href="/%(y_rehber)s/">%(m_rehberler)s</a>
    <a href="privacy.html?lang=%(dil)s">%(m_gizlilik)s</a>
    <a href="%(play)sfooter_%(tur)s" target="_blank" rel="noopener">Google Play</a>
    <a href="https://apps.apple.com/app/id6821863283" target="_blank" rel="noopener">App Store</a>
  </nav>
</div></footer>

<script src="js/sayac.js?v=1" defer></script>
</body>
</html>
""" % {"uretildi": URETILDI.replace("index.html + js/i18n", "haber_arsivi.json + rehberler.json"), "dil": dil,
       "title": e(baslik + " | ReBirth"), "desc": e(aciklama), "url": url, "hl": "\n".join(hl),
       "ogtur": "website" if tur.startswith("liste") else "article", "oglocale": "tr_TR" if dil == "tr" else "en_US",
       "ogtitle": e(baslik), "gorsel": e(SITE + "/" + gorsel), "ld": json.dumps(ld, ensure_ascii=False).replace("</", "<\\/"),
       "ana": Y["ana"], "y_haber": Y["haber"], "y_rehber": Y["rehber"], "m_site": e(m["site"]), "m_haberler": e(m["haberler"]),
       "m_rehberler": e(m["rehberler"]), "m_destek": e(m["destek"]), "m_gizlilik": e(m["gizlilik"]), "dil_linki": dil_linki,
       "on_haber": on("haber") or on("liste_haber"), "on_rehber": on("rehber") or on("liste_rehber"),
       "kicker": kicker, "h1": e(h1), "meta": meta, "icerik": icerik, "play": PLAY_URL, "tur": tur}


def makale_ld(tip, dil, url, baslik, aciklama, gorsel, tarih):
    return {"@context": "https://schema.org", "@type": tip, "headline": baslik[:110], "description": aciklama,
            "image": [SITE + "/" + gorsel], "datePublished": tarih, "inLanguage": dil, "mainEntityOfPage": url,
            "author": {"@type": "Organization", "name": "HanX Games", "url": "https://hanxgames.net/"}, "publisher": YAYINCI,
            "about": {"@type": "VideoGame", "name": "ReBirth", "url": SITE + "/"}}


def kart_listesi(ogeler, dil):
    """ogeler: (yol, başlık, özet, görsel, tarih, etiket) → bağlantı kartları"""
    out = ['<ul class="art-list">']
    for yol, b, o, g, t, et in ogeler:
        out.append('  <li><a class="art-card" href="/%s"><img src="%s" alt="" width="640" height="360" loading="lazy">'
                   '<span class="art-card__txt"><small>%s%s</small><b>%s</b><span>%s</span></span></a></li>'
                   % (yol, e(g), e(tarih_metni(t, dil)) if t else "", (" · " + e(et)) if et else "", e(b), e(o)))
    out.append("</ul>")
    return "\n".join(out)


def arsiv_oku():
    p = os.path.join(KOK, ARSIV)
    if not os.path.exists(p):
        return {"_not": "Akışta bir kez yer almış bütün haberler (tools/statik.py yazar; haber_ekle.py sil buradan da siler).", "kayitlar": {}}
    return json.loads(oku(ARSIV))


def arsiv_yaz(a):
    a["kayitlar"] = dict(sorted(a["kayitlar"].items(), key=lambda kv: (kv[1].get("tarih", ""), kv[0]), reverse=True))
    return yaz(ARSIV, json.dumps(a, ensure_ascii=False, indent=1) + "\n")


def arsiv_guncelle(akis=None):
    a = arsiv_oku()
    akis = akis if akis is not None else json.loads(oku("haberler.json"))
    for tur in ("haberler", "guncellemeler"):
        for k in akis.get(tur, []):
            r = dict(k)
            r["tur"] = tur
            a["kayitlar"][k["id"]] = r
    arsiv_yaz(a)
    return a


def arsivden_sil(kimlik):
    a = arsiv_oku()
    if a["kayitlar"].pop(kimlik, None) is not None:
        arsiv_yaz(a)


def arsiv_gorselleri():
    return {os.path.basename(str(k.get("gorsel", ""))) for k in arsiv_oku()["kayitlar"].values()}


def metin_dil(k, alan, dil):
    v = k.get(alan) or {}
    return v.get(dil) or v.get("en") or v.get("tr") or ""


def haber_sayfalari(akis=None):
    a = arsiv_guncelle(akis)
    kayitlar = sorted(a["kayitlar"].values(), key=lambda k: (k.get("tarih", ""), k.get("eklendi", "")), reverse=True)
    istenen, sitemap, degisen = set(), [], []
    for dil in ("tr", "en"):
        Y, m = YOL[dil], MET[dil]
        obur = "en" if dil == "tr" else "tr"
        for k in kayitlar:
            yol = "%s/%s/" % (Y["haber"], k["id"])
            alt = "%s/%s/" % (YOL[obur]["haber"], k["id"])
            baslik, ozet = metin_dil(k, "baslik", dil), metin_dil(k, "ozet", dil)
            satirlar = (k.get("metin") or {}).get(dil) or (k.get("metin") or {}).get("en") or []
            etiket = metin_dil(k, "etiket", dil) or (m["guncelleme"] if k.get("tur") == "guncellemeler" else m["haber"])
            ek = ""
            v = k.get("video") if isinstance(k.get("video"), dict) else {}
            vy = (v.get("youtube") or {}) if isinstance(v.get("youtube"), dict) else {}
            vurl = vy.get(dil) or vy.get("en") or (v.get(dil) if str(v.get(dil, "")).startswith("https://") else "")
            if vurl:
                ek = '<p><a class="doc-btn" href="%s" target="_blank" rel="noopener"><span>%s</span></a></p>\n' % (e(vurl), e(m["video"]))
            digerleri = [x for x in kayitlar if x["id"] != k["id"]][:4]
            icerik = ('<img class="art-img" src="%s" alt="%s" width="640" height="360">\n<p class="art-lead">%s</p>\n%s\n%s%s\n'
                      '<h2>%s</h2>\n%s\n<p class="art-more"><a href="/%s/">%s →</a> · <a href="haberler.html?lang=%s">%s →</a></p>') % (
                e(k["gorsel"]), e(baslik), e(ozet), govde(satirlar), ek, cta(dil, "haber_sayfasi"), e(m["diger_haber"]),
                kart_listesi([("%s/%s/" % (Y["haber"], x["id"]), metin_dil(x, "baslik", dil), metin_dil(x, "ozet", dil), x["gorsel"],
                               x.get("tarih"), metin_dil(x, "etiket", dil)) for x in digerleri], dil),
                Y["haber"], e(m["tum_haber"]), dil, e(m["canli"]))
            url = SITE + "/" + yol
            ld = makale_ld("NewsArticle", dil, url, baslik, ozet, k["gorsel"], k.get("tarih", ""))
            s = sayfa(dil, yol, alt, "haber", baslik, ozet, k["gorsel"], ld, "%s · %s" % (e(etiket), e(tarih_metni(k["tarih"], dil))),
                      baslik, e(m["haberler"]) + " · ReBirth", icerik)
            if yaz(yol + "index.html", s):
                degisen.append(yol)
            istenen.add(os.path.normpath(os.path.join(KOK, yol)))
            sitemap.append((url, "0.6", [(dil, url), (obur, SITE + "/" + alt)]))
        # liste sayfası
        yol = Y["haber"] + "/"
        icerik = kart_listesi([("%s/%s/" % (Y["haber"], x["id"]), metin_dil(x, "baslik", dil), metin_dil(x, "ozet", dil), x["gorsel"],
                                x.get("tarih"), metin_dil(x, "etiket", dil)) for x in kayitlar], dil)
        icerik += '\n<p class="art-more"><a href="haberler.html?lang=%s">%s →</a></p>\n%s' % (dil, e(m["canli"]), cta(dil, "haber_listesi"))
        ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": m["liste_haber_b"], "description": m["liste_haber_a"],
              "inLanguage": dil, "url": SITE + "/" + yol, "publisher": YAYINCI}
        s = sayfa(dil, yol, YOL[obur]["haber"] + "/", "liste_haber", m["liste_haber_b"], m["liste_haber_a"], kayitlar[0]["gorsel"] if kayitlar else "assets/img/ui/og.jpg",
                  ld, "HanX Games · ReBirth", m["liste_haber_b"], e(m["liste_haber_a"]), icerik)
        if yaz(yol + "index.html", s):
            degisen.append(yol)
        sitemap.append((SITE + "/" + yol, "0.7", [(dil, SITE + "/" + yol), (obur, SITE + "/" + YOL[obur]["haber"] + "/")]))
        # arşivden çıkan haberlerin klasörlerini sil (yalnız bu betiğin ürettikleri)
        klasor = os.path.join(KOK, Y["haber"])
        for ad in os.listdir(klasor):
            p = os.path.join(klasor, ad)
            if os.path.isdir(p) and os.path.normpath(p) not in istenen and os.path.exists(os.path.join(p, "index.html")) \
                    and URETILDI[:30] in open(os.path.join(p, "index.html"), encoding="utf-8").read():
                os.remove(os.path.join(p, "index.html"))
                os.rmdir(p)
                degisen.append("-" + Y["haber"] + "/" + ad)
    return degisen, sitemap


def rehber_sayfalari():
    veri = json.loads(oku(REHBER))["rehberler"]
    sitemap, degisen = [], []
    for dil in ("tr", "en"):
        Y, m = YOL[dil], MET[dil]
        obur = "en" if dil == "tr" else "tr"
        for r in veri:
            d, o = r[dil], r[obur]
            yol, alt = "%s/%s/" % (Y["rehber"], d["adres"]), "%s/%s/" % (YOL[obur]["rehber"], o["adres"])
            url = SITE + "/" + yol
            parcalar = ['<img class="art-img" src="%s" alt="%s" width="1280" height="720">' % (e(r["gorsel"]), e(d["baslik"])),
                        '<p class="art-lead">%s</p>' % e(d["ozet"]),
                        '<nav class="art-toc" aria-label="%s"><b>%s</b><ol>' % (e(m["icindekiler"]), e(m["icindekiler"]))]
            for i, b in enumerate(d["bolumler"], 1):
                parcalar.append('<li><a href="/%s#b%d">%s</a></li>' % (yol, i, e(b["h"])))
            parcalar.append("</ol></nav>")
            for i, b in enumerate(d["bolumler"], 1):
                parcalar.append('<h2 id="b%d">%s</h2>\n%s' % (i, e(b["h"]), govde(b["metin"])))
            parcalar.append(cta(dil, "rehber_" + r["kimlik"]))
            digerleri = [x for x in veri if x["kimlik"] != r["kimlik"]]
            parcalar.append("<h2>%s</h2>" % e(m["diger_rehber"]))
            parcalar.append(kart_listesi([("%s/%s/" % (Y["rehber"], x[dil]["adres"]), x[dil]["baslik"], x[dil]["ozet"], x["gorsel"], None, None)
                                          for x in digerleri], dil))
            ld = makale_ld("Article", dil, url, d["baslik"], d["ozet"], r["gorsel"], r["tarih"])
            s = sayfa(dil, yol, alt, "rehber", d["baslik"], d["ozet"], r["gorsel"], ld,
                      "%s · %s" % (e(m["rehber"]), e(tarih_metni(r["tarih"], dil))), d["baslik"], e(m["rehberler"]) + " · ReBirth",
                      "\n".join(parcalar))
            if yaz(yol + "index.html", s):
                degisen.append(yol)
            sitemap.append((url, "0.8", [(dil, url), (obur, SITE + "/" + alt)]))
        yol = Y["rehber"] + "/"
        icerik = kart_listesi([("%s/%s/" % (Y["rehber"], x[dil]["adres"]), x[dil]["baslik"], x[dil]["ozet"], x["gorsel"], None, None)
                               for x in veri], dil) + "\n" + cta(dil, "rehber_listesi")
        ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": m["liste_rehber_b"], "description": m["liste_rehber_a"],
              "inLanguage": dil, "url": SITE + "/" + yol, "publisher": YAYINCI}
        s = sayfa(dil, yol, YOL[obur]["rehber"] + "/", "liste_rehber", m["liste_rehber_b"], m["liste_rehber_a"], veri[0]["gorsel"], ld,
                  "HanX Games · ReBirth", m["liste_rehber_b"], e(m["liste_rehber_a"]), icerik)
        if yaz(yol + "index.html", s):
            degisen.append(yol)
        sitemap.append((SITE + "/" + yol, "0.8", [(dil, SITE + "/" + yol), (obur, SITE + "/" + YOL[obur]["rehber"] + "/")]))
    return degisen, sitemap


def haber_ve_rehber(akis=None):
    """haber_ekle.py her yazımda çağırır (node gerekmez): arşiv, haber ve rehber sayfaları, site haritası"""
    d1, s1 = haber_sayfalari(akis)
    d2, s2 = rehber_sayfalari()
    if site_haritasi(s2 + s1):
        d1.append("sitemap.xml")
    return d1 + d2


def hepsi():
    degisen = dil_sayfalari()
    degisen += haber_ve_rehber()
    return degisen


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    d = hepsi()
    print("güncellendi: " + (", ".join(d) if d else "-"))
