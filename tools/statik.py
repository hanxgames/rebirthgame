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


def hepsi():
    degisen = dil_sayfalari()
    if site_haritasi():
        degisen.append("sitemap.xml")
    return degisen


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    d = hepsi()
    print("güncellendi: " + (", ".join(d) if d else "-"))
