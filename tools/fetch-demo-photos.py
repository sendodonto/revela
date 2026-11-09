"""Downloads the demo galleries' photos from Pexels (free license) and writes original/display/thumb + a manifest.

Run: python tools/fetch-demo-photos.py   (writes public/demo/** and src/data/demo-photos.json)
"""
import base64, io, json, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

R = lambda a, b, skip=(): [i for i in range(a, b + 1) if i not in skip]
SETS = {
    'casamento-helena-rafael': [28322700 + i for i in R(45, 65) + R(67, 69) + R(79, 83)],
    'gestante-julia-daniel': [18417100 + i for i in R(69, 88) + [98, 99]],
    'ensaio-beatriz-livraria': [31987700 + i for i in R(54, 82)],
    'retratos-luana-centro': [31987700 + i for i in R(40, 53)],
}
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'demo')

def one(slug, pid):
    d = os.path.join(OUT, slug)
    url = f'https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=2000'
    orig = os.path.join(d, 'original', f'{pid}.jpg')
    if not os.path.exists(orig):
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=60).read()
        open(orig, 'wb').write(data)
    im = Image.open(orig).convert('RGB')
    w, h = im.size
    for name, edge, q in (('display', 1600, 80), ('thumb', 640, 72)):
        c = im.copy(); c.thumbnail((edge, edge), Image.LANCZOS)
        c.save(os.path.join(d, name, f'{pid}.webp'), 'WEBP', quality=q, method=6)
    tiny = im.copy(); tiny.thumbnail((16, 16))
    buf = io.BytesIO(); tiny.save(buf, 'WEBP', quality=40)
    return {'id': str(pid), 'width': w, 'height': h, 'bytes': os.path.getsize(orig),
            'blur': 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(),
            'source': f'https://www.pexels.com/photo/{pid}/'}

manifest = {}
with ThreadPoolExecutor(8) as ex:
    for slug, ids in SETS.items():
        for sub in ('original', 'display', 'thumb'):
            os.makedirs(os.path.join(OUT, slug, sub), exist_ok=True)
        manifest[slug] = list(ex.map(lambda p: one(slug, p), ids))
os.makedirs(os.path.join(ROOT, 'src', 'data'), exist_ok=True)
json.dump(manifest, open(os.path.join(ROOT, 'src', 'data', 'demo-photos.json'), 'w'), indent=1)
print({k: len(v) for k, v in manifest.items()})
