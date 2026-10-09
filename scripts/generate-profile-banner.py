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
    return ImageFont.truetype(str(ROOT / 'public/monogram.ttf'), size)


# Draw at native pixel scale, then enlarge without smoothing like the game.
room = Image.new('RGBA', (280, 96), BG)
floor = crop(adventure, 432, 16, 16, 16)
wall = crop(adventure, 432, 0, 16, 16).resize((16, 32), Image.Resampling.NEAREST)
for x in range(0, 280, 16):
    paste(room, wall, (x, 0))
    for y in range(32, 96, 16):
        paste(room, floor, (x, y))

# Familiar furniture forms the whole banner, rather than a separate thumbnail.
for center in (34, 246):
    window = crop(items, 0, 16, 16, 32)
    paste(room, window, (center - 10, 2), .75)
    paste(room, window.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (center - 1, 2), .75)
    paste(room, crop(furniture, 128, 160, 32, 32), (center - 12, 2), .75)
paste(room, crop(furniture, 128, 128, 48, 32), (16, 23), .75)
paste(room, crop(furniture, 160, 160, 48, 32), (228, 23), .75)
paste(room, crop(furniture, 48, 144, 48, 32), (116, 52))
paste(room, crop(adventure, 496, 80, 32, 16), (120, 43), 1.25)
paste(room, crop(furniture, 0, 128, 48, 48), (230, 56), .75)
paste(room, crop(furniture, 48, 176, 16, 32), (202, 44), .75)
paste(room, crop(furniture, 168, 48, 24, 32), (66, 34), .75)
for x in (3, 268):
    paste(room, crop(furniture, 192, 112, 16, 48), (x, 41), .75)

# A wall-mounted nameplate uses the exact font bundled with the portfolio.
draw = ImageDraw.Draw(room)
draw.rectangle((66, 2, 214, 30), fill='#502c32')
draw.rectangle((68, 4, 212, 28), fill='#b66b40')
draw.rectangle((70, 6, 210, 26), fill=BG)
for text, y, size, color in [
    ('Giovanni Maya', 1, 20, '#f7efba'),
    ('software, data & creativity.', 16, 10, '#e2ae60'),
]:
    text_font = font(size)
    width = draw.textlength(text, font=text_font)
    # Monochrome glyph masks preserve crisp pixel edges.
    draw.fontmode = '1'
    draw.text((round((280 - width) / 2), y), text, font=text_font, fill=color)

frames = []
for i in range(96):
    scene = room.copy()
    if i < 40:
        x, frame, flip = round(46 + 164 * i / 39), 975 + (i // 2) % 4, False
    elif i < 48:
        x, frame, flip = 210, 936, False
    elif i < 88:
        x, frame, flip = round(210 - 164 * (i - 48) / 39), 975 + (i // 2) % 4, True
    else:
        x, frame, flip = 46, 936, False
    paste(scene, character(frame, flip), (x, 78))
    frames.append(scene.resize((840, 288), Image.Resampling.NEAREST).convert('RGB'))

# A shared palette keeps stationary artwork stable throughout the loop.
palette = frames[0].quantize(colors=128)
indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
indexed[0].save(ROOT / 'assets/profile-header.gif', save_all=True,
                append_images=indexed[1:], duration=125, loop=0, optimize=True, disposal=1)
frames[0].save(ROOT / 'assets/profile-header.png')
frames[0].save('/tmp/profile-banner-preview.png')
print('Generated animated and static full-scene banners.')
