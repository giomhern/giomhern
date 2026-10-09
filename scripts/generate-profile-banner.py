"""Compose the profile GIF from the game's existing sprites (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
adventure = Image.open(ROOT / 'public/adventure-sprites.png').convert('RGBA')
furniture = Image.open(ROOT / 'public/furniture-sprites.png').convert('RGBA')
items = Image.open(ROOT / 'public/small-items-sprites.png').convert('RGBA')
BG = '#302321'


def crop(sheet, x, y, w, h):
    return sheet.crop((x, y, x + w, y + h))


def paste(scene, sprite, xy, scale=1):
    if scale != 1:
        sprite = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.Resampling.NEAREST)
    scene.alpha_composite(sprite, xy)


def character(frame, flip=False):
    sprite = crop(adventure, frame % 39 * 16, frame // 39 * 16, 16, 16)
    source = sprite.copy()
    hair, outline, skin = (178, 92, 52), (49, 16, 71), (226, 174, 96)
    for y in range(16):
        for x in range(16):
            pixel = source.getpixel((x, y))
            adjacent_hair = diagonal_hair = adjacent_skin = False
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if (dx == dy == 0) or not (0 <= x + dx < 16 and 0 <= y + dy < 16):
                        continue
                    neighbor = source.getpixel((x + dx, y + dy))
                    if not neighbor[3]:
                        continue
                    if dx == 0 or dy == 0:
                        adjacent_hair |= neighbor[:3] == hair
                        adjacent_skin |= neighbor[:3] == skin
                    else:
                        diagonal_hair |= neighbor[:3] == hair
            if pixel[3] and (pixel[:3] == hair or (pixel[:3] == outline and
                    (adjacent_hair or (diagonal_hair and not adjacent_skin)))):
                sprite.putpixel((x, y), (30, 20, 16, pixel[3]))
    return sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else sprite


def font(size):
    for path in ['/System/Library/Fonts/Menlo.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf']:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


base = Image.new('RGBA', (840, 240), BG)
draw = ImageDraw.Draw(base)
draw.rectangle((0, 0, 35, 3), fill='#e2ae60')
draw.rectangle((0, 0, 3, 35), fill='#e2ae60')
draw.rectangle((804, 236, 839, 239), fill='#e2ae60')
draw.rectangle((836, 204, 839, 239), fill='#e2ae60')
draw.text((32, 76), 'Giovanni Maya', font=font(32), fill='#f7efba')
draw.text((34, 124), 'software, data, and a little creativity.', font=font(17), fill='#d1ae94')

# A compact living-room vignette using the same floor, windows, rug and sofa.
room = Image.new('RGBA', (80, 64), BG)
floor = crop(adventure, 432, 16, 16, 16)
wall = crop(adventure, 432, 0, 16, 16)
for x in range(0, 80, 16):
    paste(room, wall, (x, 0))
    for y in range(16, 64, 16):
        paste(room, floor, (x, y))
for center in (18, 60):
    window = crop(items, 0, 16, 16, 32)
    paste(room, window, (center - 7, 0), .5)
    paste(room, window.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (center - 1, 0), .5)
    paste(room, crop(furniture, 128, 160, 32, 32), (center - 8, 0), .5)
paste(room, crop(furniture, 128, 128, 48, 32), (6, 6), .5)
paste(room, crop(furniture, 160, 160, 48, 32), (48, 6), .5)
paste(room, crop(furniture, 48, 144, 48, 32), (16, 29))
paste(room, crop(adventure, 496, 80, 32, 16), (24, 25))

frames = []
for i in range(80):
    scene = room.copy()
    if i < 32:
        x, frame, flip = round(8 + 48 * i / 31), 975 + (i // 2) % 4, False
    elif i < 40:
        x, frame, flip = 56, 936, False
    elif i < 72:
        x, frame, flip = round(56 - 48 * (i - 40) / 31), 975 + (i // 2) % 4, True
    else:
        x, frame, flip = 8, 936, False
    paste(scene, character(frame, flip), (x, 46))
    banner = base.copy()
    paste(banner, scene, (568, 24), 3)
    frames.append(banner.convert('RGB'))

# A shared palette keeps stationary artwork stable throughout the loop.
palette = frames[0].quantize(colors=128)
indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
indexed[0].save(ROOT / 'assets/profile-header.gif', save_all=True,
                append_images=indexed[1:], duration=125, loop=0, optimize=True, disposal=1)
frames[0].save('/tmp/profile-banner-preview.png')
print('Generated assets/profile-header.gif')
