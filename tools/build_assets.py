#!/usr/bin/env python3
"""
ReBirth tanıtım sitesi — varlık hattı
=====================================
Oyun deposundaki görselleri, videoları, sesleri ve harita verisini web'e uygun biçime çevirir ve site/assets'e yazar.

  python tools/build_assets.py <oyun_deposu> [--video] [--audio] [--img] [--map] [--font]   (bayrak yoksa hepsi)

Girdiler:
  <oyun>/reddit-tanitim/gorseller/TR|EN/*.png   pazarlama ekran görüntüleri
  <oyun>/assets/cine/s*.jpg, s*_on.png           prolog sinematik kareleri
  <oyun>/assets/ui/*.svg, google-play-magaza/logo  çizimler, logo
  <oyun>/assets/map*/map_data.json               bölge ızgarası → SVG yolları
  C:/x/site/harita_*.png                          tests/site_harita.tscn ile ortografik harita render'ları
  C:/x/cikis/klip/*.avi                           arayüzsüz oyun klipleri (arka plan döngüleri)
  <oyun>/reddit-tanitim/ReBirth_Cikis_Fragmani_TR|EN.mp4  fragman
"""
import base64
import json
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image

GAME = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.expanduser("~/Documents/YenidenDogus")
SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(SITE, "assets")
RENDERS = "C:/x/site"
CLIPS = "C:/x/cikis/klip"
FLAGS = [a for a in sys.argv[2:] if a.startswith("--")]


def want(k):
    return not FLAGS or ("--" + k) in FLAGS


def ff():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def run(args):
    r = subprocess.run([ff(), "-hide_banner", "-loglevel", "error", "-y"] + args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-800:])


def mk(*p):
    d = os.path.join(OUT, *p)
    os.makedirs(d, exist_ok=True)
    return d


def webp(src, dst, w=None, q=80):
    im = Image.open(src)
    im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
    if w and im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(dst, "WEBP", quality=q, method=6)
    return os.path.getsize(dst)


# ---------------------------------------------------------------------------------------------------- görseller
def images():
    total = 0
    g = mk("img", "shots")
    for lang in ("TR", "EN"):
        src = os.path.join(GAME, "reddit-tanitim", "gorseller", lang)
        for f in sorted(os.listdir(src)):
            if not f.endswith(".png") or f.startswith("01_"):
                continue
            base = f[:-4]
            total += webp(os.path.join(src, f), os.path.join(g, f"{base}_{lang.lower()}.webp"), 1600, 78)
            total += webp(os.path.join(src, f), os.path.join(g, f"{base}_{lang.lower()}_k.webp"), 640, 72)
    c = mk("img", "cine")
    for i in range(1, 8):
        total += webp(os.path.join(GAME, "assets", "cine", f"s{i}.jpg"), os.path.join(c, f"s{i}.webp"), 1600, 80)
        on = os.path.join(GAME, "assets", "cine", f"s{i}_on.png")
        if os.path.exists(on):
            total += webp(on, os.path.join(c, f"s{i}_on.webp"), 1600, 80)
    u = mk("img", "ui")
    for f in ("menu_hero.svg", "danisman.svg"):
        shutil.copy(os.path.join(GAME, "assets", "ui", f), os.path.join(u, f))
    logo = os.path.join(GAME, "google-play-magaza", "logo")
    total += webp(os.path.join(logo, "rebirth_logo_seffaf.png"), os.path.join(u, "logo.webp"), 1200, 90)
    simge = Image.open(os.path.join(logo, "rebirth_simge_1024.png")).convert("RGBA")
    for s, n in ((32, "favicon-32.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")):
        simge.resize((s, s), Image.LANCZOS).save(os.path.join(SITE, n) if s != 512 else os.path.join(u, n))
    # paylaşım görseli (Open Graph 1200x630): Google Play tanıtım görseli büyütülerek
    og = Image.open(os.path.join(GAME, "google-play-magaza", "TR", "tanitim_gorseli_1024x500.png")).convert("RGB")
    og = og.resize((1200, 586), Image.LANCZOS)
    canvas = Image.new("RGB", (1200, 630), (20, 18, 16))
    canvas.paste(og, (0, 22))
    canvas.save(os.path.join(u, "og.jpg"), quality=86)
    print(f"görseller: {total / 1048576:.1f} MB")


# ---------------------------------------------------------------------------------------------------- harita
ROLES = {0: "capital", 1: "port", 2: "bridge", 6: "lake", 7: "border", 13: "border", 8: "spa", 9: "strait", 10: "hq", 11: "plateau", 12: "forest"}


def maps():
    import cv2
    m = mk("img", "map")
    data_out = mk("data")
    for mid, folder in (("tarsel", "map"), ("kesra", "map_kesra"), ("varzan", "map_varzan")):
        for tod in ("gun", "gece"):
            src = os.path.join(RENDERS, f"harita_{mid}_{tod}.png")
            if os.path.exists(src):
                webp(src, os.path.join(m, f"{mid}_{tod}.webp"), 2100, 80)
                webp(src, os.path.join(m, f"{mid}_{tod}_k.webp"), 1050, 76)
        d = json.load(open(os.path.join(GAME, "assets", folder, "map_data.json"), encoding="utf-8"))
        g = d["district_grid"]
        W, H, res = g["w"], g["h"], g["res"]
        grid = np.frombuffer(base64.b64decode(g["data"]), dtype=np.uint8).reshape(H, W)
        ww, wh = d["world"]["w"], d["world"]["h"]
        sx, sy = 2100.0 / W, 1400.0 / H
        out = {"map": mid, "province": d.get("province", ""), "view": [2100, 1400], "districts": []}
        for x in d["districts"]:
            i = int(x["id"])
            mask = (grid == i).astype(np.uint8) * 255
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            paths = []
            for c in cs:
                if cv2.contourArea(c) < 20:
                    continue
                c = cv2.approxPolyDP(c, 0.9, True)
                pts = " ".join(f"{(p[0][0] + 0.5) * sx:.1f},{(p[0][1] + 0.5) * sy:.1f}" for p in c)
                paths.append("M" + pts.replace(" ", " L") + " Z")
            cx = (x["center"][0] / ww + 0.5) * 2100
            cy = (x["center"][2] / wh + 0.5) * 1400
            out["districts"].append({"id": i, "name": x["name"], "terrain": x.get("terrain", ""), "pop": x.get("pop", 0),
                                     "role": ROLES.get(i, ""), "c": [round(cx, 1), round(cy, 1)], "n": x.get("neighbors", []),
                                     "d": " ".join(paths)})
        json.dump(out, open(os.path.join(data_out, f"map_{mid}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"harita {mid}: {len(out['districts'])} bölge")


# ---------------------------------------------------------------------------------------------------- video
def video():
    v = mk("video")
    # ana sahne döngüsü: açılış + kasaba + gün batımı + gece (yumuşak geçişli, sessiz). MJPEG kaynakta renk aralığı meta
    # verisi akış içinde değişip xfade'i bozduğu için parçalar önce normalleştirilmiş ara dosyalara çevrilir.
    parts = [("acilis", 0.4, 6.6), ("kasaba", 0.2, 5.8), ("gunbatimi", 0.2, 6.2), ("gece", 0.3, 6.0)]
    tmp = []
    for name, ss, dur in parts:
        t = os.path.join(v, f"_ara_{name}.mp4")
        run(["-ss", str(ss), "-t", str(dur), "-i", os.path.join(CLIPS, name + ".avi"), "-vf",
             "scale=1600:900:flags=lanczos:in_range=pc:out_range=tv,setsar=1,fps=30,format=yuv420p", "-an", "-c:v", "libx264",
             "-crf", "16", "-preset", "fast", t])
        tmp.append(t)
    inputs, flt = [], []
    for k, t in enumerate(tmp):
        inputs += ["-i", t]
    acc, off = "0:v", parts[0][2]
    for k in range(1, len(parts)):
        off -= 1.0
        flt.append(f"[{acc}][{k}:v]xfade=transition=fade:duration=1.0:offset={off:.2f}[x{k}]")
        acc = f"x{k}"
        off += parts[k][2]
    run(inputs + ["-filter_complex", ";".join(flt), "-map", f"[{acc}]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27",
                  "-movflags", "+faststart", "-pix_fmt", "yuv420p", os.path.join(v, "hero.mp4")])
    for t in tmp:
        os.remove(t)
    # telefon ve kısa ekranlar için hafif kopya (main.js: genişlik < 900 → hero_m.mp4)
    run(["-i", os.path.join(v, "hero.mp4"), "-vf", "scale=960:-2", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
         "-movflags", "+faststart", "-pix_fmt", "yuv420p", os.path.join(v, "hero_m.mp4")])
    run(["-i", os.path.join(CLIPS, "acilis.avi"), "-ss", "0.6", "-frames:v", "1", "-vf", "scale=1600:900", os.path.join(v, "hero.jpg")])
    # bölüm döngüleri
    for name, ss, dur in (("deprem", 0.3, 7.0), ("sel", 0.3, 7.0), ("kurak", 0.3, 7.0), ("hava", 0.0, 8.0), ("catisma", 0.2, 7.0),
                          ("insa", 0.2, 7.0), ("gece", 0.3, 7.0), ("gunbatimi", 0.3, 7.0), ("bayram", 0.3, 7.0), ("kasaba", 0.2, 6.0)):
        src = os.path.join(CLIPS, name + ".avi")
        run(["-ss", str(ss), "-t", str(dur), "-i", src, "-vf", "scale=1280:720:flags=lanczos,fps=30,format=yuv420p", "-an", "-c:v", "libx264",
             "-preset", "slow", "-crf", "28", "-movflags", "+faststart", os.path.join(v, f"{name}.mp4")])
        run(["-ss", str(ss + 0.5), "-i", src, "-frames:v", "1", "-vf", "scale=1280:720", "-q:v", "4", os.path.join(v, f"{name}.jpg")])
    # hava harekâtı sinematiği (jet takibi → füze → patlama)
    cine = os.path.join(GAME, "reddit-tanitim", "Hava_Harekati_Sinematigi.mp4")
    run(["-ss", "1.2", "-t", "8.6", "-i", cine, "-vf", "scale=1280:720:flags=lanczos,format=yuv420p", "-an", "-c:v", "libx264", "-preset", "slow",
         "-crf", "27", "-movflags", "+faststart", os.path.join(v, "sinematik.mp4")])
    run(["-ss", "3.2", "-i", cine, "-frames:v", "1", "-vf", "scale=1280:720", "-q:v", "4", os.path.join(v, "sinematik.jpg")])
    # fragman (sesli)
    for lang in ("TR", "EN"):
        src = os.path.join(GAME, "reddit-tanitim", f"ReBirth_Cikis_Fragmani_{lang}.mp4")
        run(["-i", src, "-vf", "scale=1280:720:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "25",
             "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", os.path.join(v, f"fragman_{lang.lower()}.mp4")])
        shutil.copy(os.path.join(GAME, "reddit-tanitim", f"ReBirth_Cikis_Fragmani_{lang}_kapak.jpg"), os.path.join(v, f"fragman_{lang.lower()}.jpg"))
    tot = sum(os.path.getsize(os.path.join(v, f)) for f in os.listdir(v))
    print(f"video: {tot / 1048576:.1f} MB")


# ---------------------------------------------------------------------------------------------------- ses
VOICE = ["sec_1", "sec_2", "hareket_1", "taarruz_1", "koruma_1", "devriye_1", "hava_sec_1", "hava_hareket_1", "vurus_1", "vurus_2",
         "dusme_1", "geri_alindi_1", "karargah_tespit_1", "karargah_yok_1", "tirmanma_1", "konvoy_pusu_1", "konvoy_vardi_1",
         "kriz_basla_1", "salgin_yayildi_1", "secim_basla_1", "secim_basarili_1", "bayram_1", "zafer_1", "baris_1", "anma_1",
         "telsiz_1", "telsiz_2", "telsiz_3"]
SFX = ["patlama1", "patlama2", "fuze", "jet", "telsiz", "ui_tik", "ui_onay", "ui_hata", "basarim", "insaat", "damga", "olay", "iyi", "kotu"]


def audio():
    a = mk("audio")
    for lang in ("tr", "en"):
        d = mk("audio", "ses", lang)
        for k in VOICE:
            src = os.path.join(GAME, "assets", "audio", "ses", lang, k + ".ogg")
            if os.path.exists(src):
                run(["-i", src, "-ac", "1", "-b:a", "64k", os.path.join(d, k + ".mp3")])
    s = mk("audio", "sfx")
    for k in SFX:
        run(["-i", os.path.join(GAME, "assets", "audio", k + ".wav"), "-ac", "1", "-b:a", "80k", os.path.join(s, k + ".mp3")])
    for k in ("muzik_menu", "prolog"):
        run(["-i", os.path.join(GAME, "assets", "audio", k + ".ogg"), "-b:a", "112k", os.path.join(a, k + ".mp3")])
    tot = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(a) for f in fs)
    print(f"ses: {tot / 1048576:.1f} MB")


def fonts():
    """Oyunun yazı tiplerini Latin + Latin Genişletilmiş (Türkçe) alt kümesiyle woff2'ye çevirir (fonttools + brotli)."""
    import subprocess
    f = mk("fonts")
    uni = ("U+0000-00FF,U+0100-017F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2070-209F,U+20AC,"
           "U+2122,U+2190-21FF,U+2212,U+2215,U+25A0-25FF,U+2600-26FF,U+2700-27BF")
    for n in ("Anton-Regular", "Barlow-Regular", "Barlow-Medium", "Barlow-SemiBold", "BarlowCondensed-SemiBold",
              "BarlowCondensed-Bold", "BarlowCondensed-ExtraBold", "Caveat"):
        subprocess.check_call([sys.executable, "-m", "fontTools.subset", os.path.join(GAME, "assets", "fonts", n + ".ttf"),
                               "--unicodes=" + uni, "--layout-features=*", "--flavor=woff2",
                               "--output-file=" + os.path.join(f, n + ".woff2")])
    for n in ("LICENSE_Anton.txt", "LICENSE_Barlow.txt", "LICENSE_Caveat.txt"):
        shutil.copy(os.path.join(GAME, "assets", "fonts", n), os.path.join(f, n))


if __name__ == "__main__":
    if want("font"):
        fonts()
    if want("img"):
        images()
    if want("map"):
        maps()
    if want("audio"):
        audio()
    if want("video"):
        video()
