# Cuts sprites out of the user's doodle sheet (assets-src/reference/sprite-sheet.png) into assets-src/sprites/<key>.png.
# The boxes are (x0, y0, x1, y1) in sheet pixels; the sheet's cream background is removed by flood fill from the crop edges.
# Run with `python3 scripts/art/cut-sprites.py`; then `node scripts/art/generate.mjs` embeds the PNGs as the matching assets.
import json, os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SHEET = os.path.join(ROOT, 'assets-src', 'reference', 'sprite-sheet.png')
OUT = os.path.join(ROOT, 'assets-src', 'sprites')
KEYS_JSON = os.path.join(ROOT, 'scripts', 'art', 'sprite-keys.json')

CROPS = {
    'sun_rays': (478, 6, 540, 66),
    'sun_face_happy': (622, 72, 768, 226),
    'cloud_a': (28, 112, 194, 214),
    'cloud_b': (212, 100, 378, 210),
    'cloud_rain': (394, 98, 586, 232),
    'tree_round': (368, 258, 446, 400),
    'tree_apple': (142, 258, 262, 402),
    'tree_pine': (270, 258, 356, 402),
    'bush': (448, 305, 554, 386),
    'cat': (906, 294, 980, 386),
    'bird_down': (982, 306, 1050, 380),
    'rabbit': (1116, 280, 1182, 382),
    'frog': (1270, 306, 1340, 378),
    'duck': (1338, 290, 1414, 378),
    'hedgehog': (1414, 300, 1502, 380),
    'car_red': (34, 452, 150, 540),
    'car_teal': (150, 452, 266, 540),
    'bus': (910, 438, 1048, 528),
    'ice_cream_van': (418, 432, 568, 542),
    'traffic_light': (652, 428, 694, 528),
    'mailbox': (704, 438, 758, 522),
    'streetlight': (360, 572, 400, 676),
    'bench': (36, 598, 162, 676),
    'hydrant': (172, 598, 232, 676),
    'shape_circle': (744, 728, 798, 782),
    'shape_triangle': (808, 728, 862, 782),
    'shape_square': (868, 728, 920, 782),
    'shape_moon': (930, 728, 984, 782),
    'sticker_star': (986, 726, 1042, 780),
    'sticker_heart': (1044, 726, 1096, 776),
    'sticker_rainbow': (1098, 720, 1170, 770),
    'rainbow': (34, 942, 128, 996),
    'palette': (1268, 724, 1334, 792),
    'jar_brushes': (1188, 722, 1254, 792),
    'carrot': (276, 722, 326, 772),
    'treat_cupcake': (218, 726, 272, 772),
    'treat_cookie': (330, 726, 378, 772),
    'treat_croissant': (36, 728, 100, 772),
    'apple': (106, 726, 136, 772),
    'packet_sun': (660, 584, 720, 660),
    'packet_tulip': (546, 592, 596, 664),
    'packet_daisy': (604, 584, 656, 660),
    'mushroom_red': (1192, 608, 1252, 664),
    'house_a': (34, 822, 134, 896),
    'house_b': (136, 822, 222, 896),
    'house_c': (236, 806, 312, 896),
    'bakery': (326, 812, 438, 896),
    'florist': (456, 812, 574, 896),
}

BG = (253, 248, 237)

def cut(sheet, box):
    crop = sheet.crop(box).convert('RGBA')
    w, h = crop.size
    # flood the cream background away from every border pixel, so light interior fills survive
    for x in range(w):
        for y in (0, h - 1):
            ImageDraw.floodfill(crop, (x, y), (0, 0, 0, 0), thresh=14)
    for y in range(h):
        for x in (0, w - 1):
            ImageDraw.floodfill(crop, (x, y), (0, 0, 0, 0), thresh=14)
    bbox = crop.getchannel('A').point(lambda a: 255 if a > 0 else 0).getbbox()
    return crop.crop(bbox) if bbox else crop

def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(SHEET).convert('RGB')
    sizes = {}
    for key, box in CROPS.items():
        img = cut(sheet, box)
        img.save(os.path.join(OUT, key + '.png'), optimize=True)
        sizes[key] = list(img.size)
    json.dump(sorted(CROPS), open(KEYS_JSON, 'w'), indent=1)
    print(f'cut {len(CROPS)} sprites')

if __name__ == '__main__':
    main()
