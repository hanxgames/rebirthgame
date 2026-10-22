"""ReBirth haber akışı: haberler.json (oyunun ana menüsü ve haberler.html buradan okur).

Her türde (haber / güncelleme notu) en çok `en_cok` (5) kayıt tutulur: yenisi eklenince en eskisi akıştan düşer ve
görseli assets/img/haber/'den silinir (siteye ve oyuncuların cihazına boşa veri birikmez; oyun da akışta olmayan
görselleri kendi önbelleğinden siler).

  python tools/haber_ekle.py ekle haber taslak.json gorsel.jpg        # yeni haber
  python tools/haber_ekle.py ekle guncelleme taslak.json gorsel.png   # yeni güncelleme notu
  python tools/haber_ekle.py sil <id>                                 # kaydı ve görselini kaldır
  python tools/haber_ekle.py video <id> <tr> <en> [kapak.jpg]          # var olan kayda video ekle/değiştir ("-" "-": kaldır);
                                                                      #   tr/en adres ya da yerel .mp4/.webm (assets/video/haber/'e
                                                                      #   kopyalanır, kayıt düşünce silinir); kapak 1280x720'e kırpılır
  python tools/haber_ekle.py liste
  python tools/haber_ekle.py denetle                                  # şema, görseller, yetim dosyalar (siler)

taslak.json (TR ve EN zorunlu; baslik/ozet/etiket/metin'e isteğe bağlı başka dil anahtarları da eklenebilir: es, pt_BR, de, fr,
id, ja, ko, zh_CN, zh_TW — oyun kendi dilindeki anahtarı gösterir, yoksa İngilizcesini; haberler.html yalnız tr/en gösterir):
  {
    "tarih": "2026-10-15",                       # yoksa bugün
    "kisa": "kara-kolera",                       # kimliğin sonu; yoksa İngilizce başlıktan
    "etiket": {"tr": "Etkinlik", "en": "Event"}, # isteğe bağlı
    "surum": "2.0.6",                            # güncelleme notlarında isteğe bağlı
    "baslik": {"tr": "...", "en": "..."},
    "ozet":   {"tr": "...", "en": "..."},        # oyundaki kartta görünür (2-3 satır)
    "metin":  {"tr": ["paragraf", "• madde"], "en": [...]},   # haberler.html'de; "• " ile başlayan satır madde olur
    "baglanti": "https://...",                   # isteğe bağlı: "Detayları gör" bu adresi açar (yoksa haberler.html#<id>)
    "video": {"tr": "https://youtu.be/...", "en": "https://youtu.be/...", "kapak": "assets/video/haber/..."},
                                                 # isteğe bağlı: haberler.html'de kartın üstünde video (oyun göstermez; oyundan
                                                 #   gelen bağlantı ?lang=tr|en taşır: Türkçe oyuncu tr'yi, diğer bütün diller en'i
                                                 #   izler). YouTube (watch/youtu.be/shorts/embed) ya da .mp4/.webm (https ya da
                                                 #   assets/...). YouTube oynatıcısı yalnız tıklayınca youtube-nocookie'den yüklenir.
                                                 #   kapak isteğe bağlı (oynat düğmesinin ve oynatıcının görseli; yoksa gorsel).
                                                 #   Yerel dosyaları "video" komutu kopyalar (ekle'de adres verilir).
    "platform": ["android", "pc", "web"],        # isteğe bağlı: oyunda yalnız bu platformlarda (android|ios|pc|web) görünür;
                                                 #   başka mağazaya satış bağlantısı veren haberi iOS'a koyma (App Store 3.1.1)
    "form": "moderator",                         # isteğe bağlı: haberler.html'de haberin altına başvuru düğmesi (js/basvuru.js
                                                 #   FORMLAR: kimlik → Google Formlar bağlantısı; site bir şey saklamaz)
    "anket": {                                   # isteğe bağlı (oyun 2.0.8+): şıklar oyundaki kartta, tek dokunuşla oy (Android);
      "id": "sonraki_mod",                       #   oylar Firebase Realtime Database anket/<id>/ (oyuncu başına tek oy, kurallar
      "soru": {"tr": "...", "en": "..."},        #   ReBirth deposunda panel/database.rules.json); sayılar herkese açık, haberler.html
      "secenekler": [                            #   canlı sonuçları gösterir. Kimlikler [a-z0-9_]{2,40}, 2–6 şık.
        {"id": "isyanci", "metin": {"tr": "...", "en": "..."}, "aciklama": {"tr": "...", "en": "..."}}
      ],
      "bitis": "2026-11-30"                      #   isteğe bağlı: bu günden sonra yalnız sonuç gösterilir
    }
  }
Görsel her biçimde olabilir: 16:9 kırpılır, 640x360 JPEG'e çevrilir (Pillow). Ardından siteyi yayınla (git push):
oyun ana menü her açıldığında ve açıkken 5 dakikada bir akışı yeniden okur.
"""
import datetime
import hashlib
import io
import json
import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AKIS = os.path.join(KOK, "haberler.json")
GORSEL_KLASOR = "assets/img/haber"
VIDEO_KLASOR = "assets/video/haber"   # habere kopyalanan videolar ve kapakları (kayıt düşünce silinir)
KAPAK_BOY = (1280, 720)
TURLER = {"haber": "haberler", "guncelleme": "guncellemeler"}
EN_COK = 5
BOY = (640, 360)
DILLER = ("tr", "en")
FORMLAR = ("moderator",)   # js/basvuru.js FORMLAR'daki kimlikler (Google Formlar bağlantıları)
VIDEO = re.compile(r"https://(www\.|m\.)?(youtube\.com/(watch\?(\S*&)?v=|shorts/|embed/|live/)|youtu\.be/)[A-Za-z0-9_-]{11}([?&#]\S*)?"
                   r"|(https://\S+|assets/\S+)\.(mp4|webm)(\?\S*)?")   # video alanı: YouTube ya da dosya


def oku() -> dict:
    if not os.path.exists(AKIS):
        return {"surum": 1, "en_cok": EN_COK, "guncelleme": "", "haberler": [], "guncellemeler": []}
    with open(AKIS, encoding="utf-8") as f:
        return json.load(f)


def yaz(akis: dict) -> None:
    akis["guncelleme"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    tmp = AKIS + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(akis, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.replace(tmp, AKIS)


def kisalt(metin: str) -> str:
    tablo = str.maketrans("çğıöşüâîûÇĞİÖŞÜ", "cgiosuaiuCGIOSU")
    s = re.sub(r"[^a-z0-9]+", "-", metin.translate(tablo).lower()).strip("-")
    return s[:40].strip("-") or "haber"


def gorsel_hazirla(kaynak: str, kimlik: str, boy: tuple = BOY, klasor: str = GORSEL_KLASOR) -> str:
    from PIL import Image
    im = Image.open(kaynak)
    im = im.convert("RGB")
    w, h = im.size
    oran = boy[0] / boy[1]
    if w / h > oran:          # fazla geniş: yanlardan kırp
        yw = int(round(h * oran))
        x0 = (w - yw) // 2
        im = im.crop((x0, 0, x0 + yw, h))
    else:                     # fazla uzun: üstten/alttan kırp (biraz yukarıdan: başlıklar genelde üstte)
        yh = int(round(w / oran))
        y0 = max(0, int((h - yh) * 0.4))
        im = im.crop((0, y0, w, y0 + yh))
    im = im.resize(boy, Image.LANCZOS)
    tampon = io.BytesIO()
    im.save(tampon, "JPEG", quality=82, optimize=True, progressive=True)
    veri = tampon.getvalue()
    # dosya adına içerik özeti: aynı kimlikte görsel değişirse oyun önbelleği yenisini indirir
    ad = "%s-%s.jpg" % (kimlik, hashlib.sha1(veri).hexdigest()[:6])
    os.makedirs(os.path.join(KOK, klasor), exist_ok=True)
    with open(os.path.join(KOK, klasor, ad), "wb") as f:
        f.write(veri)
    return klasor + "/" + ad


def video_kopyala(kaynak: str, kimlik: str, dil: str) -> str:
    """yerel .mp4/.webm → assets/video/haber/<id>-<dil>-<özet>.<uzantı> (adres verildiyse aynen döner)"""
    if not os.path.isfile(kaynak):
        return kaynak
    uz = os.path.splitext(kaynak)[1].lower()
    if uz not in (".mp4", ".webm"):
        sys.exit("video dosyası .mp4 ya da .webm olmalı: " + kaynak)
    with open(kaynak, "rb") as f:
        veri = f.read()
    ad = "%s-%s-%s%s" % (kimlik, dil, hashlib.sha1(veri).hexdigest()[:6], uz)
    os.makedirs(os.path.join(KOK, VIDEO_KLASOR), exist_ok=True)
    with open(os.path.join(KOK, VIDEO_KLASOR, ad), "wb") as f:
        f.write(veri)
    print("  %s: %.1f MB → %s/%s" % (dil, len(veri) / 1e6, VIDEO_KLASOR, ad))
    return VIDEO_KLASOR + "/" + ad


def denetle_kayit(k: dict) -> list:
    hata = []
    if not re.fullmatch(r"[a-z0-9-]{3,64}", str(k.get("id", ""))):
        hata.append("id")
    try:
        datetime.date.fromisoformat(str(k.get("tarih", "")))
    except ValueError:
        hata.append("tarih (YYYY-AA-GG)")
    for alan in ("baslik", "ozet"):
        d = k.get(alan)
        if not isinstance(d, dict) or any(not str(d.get(dil, "")).strip() for dil in DILLER):
            hata.append(alan + " (tr + en)")
    g = str(k.get("gorsel", ""))
    if not g or not os.path.exists(os.path.join(KOK, g)):
        hata.append("gorsel yok: " + g)
    b = k.get("baglanti", "")
    if b and not str(b).startswith("https://"):
        hata.append("baglanti https olmalı")
    v = k.get("video")
    if v is not None and (not isinstance(v, dict) or any(not VIDEO.fullmatch(str(v.get(d, ""))) for d in DILLER)):
        hata.append("video {tr, en}: YouTube ya da .mp4/.webm adresi")
    if isinstance(v, dict):
        for x in [v.get(d, "") for d in DILLER] + [v.get("kapak", "")]:
            if str(x).startswith("assets/") and not os.path.exists(os.path.join(KOK, str(x))):
                hata.append("video dosyası yok: " + str(x))
    if k.get("form") is not None and k.get("form") not in FORMLAR:
        hata.append("form: " + " | ".join(FORMLAR))
    an = k.get("anket")
    if an is not None:
        kim = r"[a-z0-9_]{2,40}"
        sec = an.get("secenekler") if isinstance(an, dict) else None
        if not isinstance(an, dict) or not re.fullmatch(kim, str(an.get("id", ""))):
            hata.append("anket.id [a-z0-9_]{2,40}")
        elif not isinstance(an.get("soru"), dict) or any(not str(an["soru"].get(d, "")).strip() for d in DILLER):
            hata.append("anket.soru (tr + en)")
        elif not isinstance(sec, list) or not 2 <= len(sec) <= 6:
            hata.append("anket.secenekler: 2–6 şık")
        else:
            gorulen = set()
            for x in sec:
                if not isinstance(x, dict) or not re.fullmatch(kim, str(x.get("id", ""))) or x["id"] in gorulen \
                        or not isinstance(x.get("metin"), dict) or any(not str(x["metin"].get(d, "")).strip() for d in DILLER):
                    hata.append("anket şıkkı: id [a-z0-9_]{2,40} (benzersiz) + metin (tr + en)")
                    break
                gorulen.add(x["id"])
        if isinstance(an, dict) and an.get("bitis"):
            try:
                datetime.date.fromisoformat(str(an["bitis"]))
            except ValueError:
                hata.append("anket.bitis (YYYY-AA-GG)")
    pl = k.get("platform")
    if pl is not None and (not isinstance(pl, list) or not pl or any(x not in ("android", "ios", "pc", "web") for x in pl)):
        hata.append("platform: android | ios | pc | web listesi")
    return hata


def sirala_kirp(akis: dict) -> list:
    """her türde en yeni en_cok kayıt kalır; düşenlerin görselleri silinir. Döner: düşen kimlikler."""
    sinir = int(akis.get("en_cok", EN_COK))
    dusen = []
    for liste in TURLER.values():
        kayitlar = akis.get(liste, [])
        kayitlar.sort(key=lambda k: (k.get("tarih", ""), k.get("eklendi", "")), reverse=True)
        dusen += [k["id"] for k in kayitlar[sinir:]]
        akis[liste] = kayitlar[:sinir]
    yetim_sil(akis)
    return dusen


def yetim_sil(akis: dict) -> list:
    kullanilan = {os.path.basename(k.get("gorsel", "")) for liste in TURLER.values() for k in akis.get(liste, [])}
    for liste in TURLER.values():   # habere kopyalanmış video ve kapak dosyaları
        for k in akis.get(liste, []):
            if isinstance(k.get("video"), dict):
                kullanilan |= {os.path.basename(str(x)) for x in k["video"].values() if str(x).startswith(VIDEO_KLASOR + "/")}
    silinen = []
    for klasor in (os.path.join(KOK, GORSEL_KLASOR), os.path.join(KOK, VIDEO_KLASOR)):
        if os.path.isdir(klasor):
            for ad in os.listdir(klasor):
                if ad not in kullanilan:
                    os.remove(os.path.join(klasor, ad))
                    silinen.append(ad)
    return silinen


def ekle(tur: str, taslak_yol: str, gorsel_yol: str) -> None:
    if tur not in TURLER:
        sys.exit("tür: haber | guncelleme")
    with open(taslak_yol, encoding="utf-8") as f:
        t = json.load(f)
    tarih = t.get("tarih") or datetime.date.today().isoformat()
    kimlik = "%s-%s" % (tarih, kisalt(t.get("kisa") or t.get("baslik", {}).get("en", "")))
    akis = oku()
    for liste in TURLER.values():
        if any(k["id"] == kimlik for k in akis.get(liste, [])):
            sys.exit("bu kimlik zaten var: %s (önce sil ya da 'kisa' ver)" % kimlik)
    kayit = {"id": kimlik, "tarih": tarih}
    for alan in ("etiket", "surum", "baslik", "ozet", "metin", "baglanti", "video", "platform", "form", "anket"):
        if t.get(alan):
            kayit[alan] = t[alan]
    kayit["gorsel"] = gorsel_hazirla(gorsel_yol, kimlik)
    kayit["eklendi"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")   # aynı gün eklenenlerin sırası
    hata = denetle_kayit(kayit)
    if hata:
        os.remove(os.path.join(KOK, kayit["gorsel"]))
        sys.exit("taslak eksik: " + ", ".join(hata))
    akis.setdefault(TURLER[tur], []).append(kayit)
    dusen = sirala_kirp(akis)
    yaz(akis)
    print("eklendi:", kimlik, "→", kayit["gorsel"])
    if dusen:
        print("en çok %d kural: akıştan düştü ve görseli silindi: %s" % (int(akis.get("en_cok", EN_COK)), ", ".join(dusen)))


def sil(kimlik: str) -> None:
    akis = oku()
    once = sum(len(akis.get(l, [])) for l in TURLER.values())
    for liste in TURLER.values():
        akis[liste] = [k for k in akis.get(liste, []) if k["id"] != kimlik]
    if sum(len(akis.get(l, [])) for l in TURLER.values()) == once:
        sys.exit("bulunamadı: " + kimlik)
    yetim_sil(akis)
    yaz(akis)
    print("silindi:", kimlik)


def video(kimlik: str, tr: str, en: str, kapak: str = "") -> None:
    akis = oku()
    for liste in TURLER.values():
        for k in akis.get(liste, []):
            if k["id"] != kimlik:
                continue
            if tr == en == "-":
                k.pop("video", None)
            else:
                v = {"tr": video_kopyala(tr, kimlik, "tr"), "en": video_kopyala(en, kimlik, "en")}
                if kapak:
                    v["kapak"] = gorsel_hazirla(kapak, kimlik + "-kapak", KAPAK_BOY, VIDEO_KLASOR)
                k["video"] = v
                hata = denetle_kayit(k)
                if hata:
                    for x in v.values():   # yarım kalan kopyaları bırakma
                        if str(x).startswith(VIDEO_KLASOR + "/") and os.path.exists(os.path.join(KOK, x)):
                            os.remove(os.path.join(KOK, x))
                    sys.exit("video: " + ", ".join(hata))
            yetim_sil(akis)
            yaz(akis)
            print("video:", kimlik, "→", k.get("video", "kaldırıldı"))
            return
    sys.exit("bulunamadı: " + kimlik)


def liste() -> None:
    akis = oku()
    for tur, l in TURLER.items():
        print("%s (%d/%d)" % (tur, len(akis.get(l, [])), int(akis.get("en_cok", EN_COK))))
        for k in akis.get(l, []):
            print("  %s  %s" % (k["id"], k["baslik"]["tr"]))


def denetle() -> None:
    akis = oku()
    n = 0
    for l in TURLER.values():
        for k in akis.get(l, []):
            for h in denetle_kayit(k):
                print("%s: %s" % (k.get("id"), h))
                n += 1
    once = json.dumps(akis, ensure_ascii=False)
    dusen = sirala_kirp(akis)
    silinen = yetim_sil(akis)
    if dusen or silinen or json.dumps(akis, ensure_ascii=False) != once:   # sıra da düzelir
        yaz(akis)
    print("hata %d · düşen %s · silinen yetim görsel %s" % (n, dusen or "-", silinen or "-"))
    sys.exit(1 if n else 0)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):   # Türkçe Windows konsolu (cp1254) "→" yazamıyor
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    a = sys.argv[1:]
    if len(a) == 4 and a[0] == "ekle":
        ekle(a[1], a[2], a[3])
    elif len(a) in (4, 5) and a[0] == "video":
        video(*a[1:])
    elif len(a) == 2 and a[0] == "sil":
        sil(a[1])
    elif a == ["liste"]:
        liste()
    elif a == ["denetle"]:
        denetle()
    else:
        print(__doc__)
        sys.exit(2)
