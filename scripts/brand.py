# Runs on the build machine after `npx cap add android`: puts the DSC Exam Hall icon and splash
# into every Android resource density, and sets the adaptive-icon background to white.
import os, glob
from PIL import Image
RES = 'android/app/src/main/res'
icon = Image.open('brand/icon.png').convert('RGBA')
fg = Image.open('brand/icon-foreground.png').convert('RGBA')
splash = Image.open('brand/splash.png').convert('RGBA')
n = 0
for f in glob.glob(f'{RES}/mipmap-*/*.png'):
    im = Image.open(f); size = im.size
    src = fg if 'foreground' in os.path.basename(f) else icon
    src.resize(size, Image.LANCZOS).save(f); n += 1
for f in glob.glob(f'{RES}/drawable*/splash.png'):
    w, h = Image.open(f).size; s = max(w, h)
    sq = splash.resize((s, s), Image.LANCZOS)
    sq.crop(((s - w) // 2, (s - h) // 2, (s - w) // 2 + w, (s - h) // 2 + h)).save(f); n += 1
bg = f'{RES}/values/ic_launcher_background.xml'
if os.path.exists(bg):
    open(bg, 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n')
print('branded', n, 'images')
