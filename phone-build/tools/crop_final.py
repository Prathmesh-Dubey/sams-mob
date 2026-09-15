from PIL import Image

PARTS = r"C:\Users\prath\OneDrive\Pictures\mess\phonepart\parts.png"
BATTERY = r"C:\Users\prath\OneDrive\Pictures\mess\phonepart\battery.png"
OUT = r"S:\work\infinity\homepage-standalone\phone-build\assets\phone"

parts = Image.open(PARTS).convert("RGB")
batt = Image.open(BATTERY)  # RGBA, real alpha

def save(im, box, name, pad=6):
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad); y1 = min(im.height, y1 + pad)
    crop = im.crop((x0, y0, x1, y1))
    crop.save(f"{OUT}\\{name}")
    print(name, crop.size)

# from parts.png (opaque near-black bg, blends with dark theme bg)
save(parts, (26, 705, 127, 945), "frame.png")          # Internal Frame (blue)
save(parts, (178, 709, 323, 941), "board.png")         # Main Board
save(parts, (747, 730, 892, 926), "camera.png")        # Camera Module (Complete)
save(parts, (555, 709, 692, 943), "middle-frame.png")  # Middle Frame (spare layer)
save(parts, (216, 796, 275, 854), "chip-macro.png", pad=10)  # tight SoC chip crop

# from battery.png (true alpha transparency - higher quality)
save(batt, (836, 299, 1092, 796), "battery.png")            # Battery alone, transparent
save(batt, (1125, 268, 1516, 839), "battery-exploded.png")  # battery cell layers, transparent
