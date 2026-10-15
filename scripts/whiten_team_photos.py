"""Remove photo backgrounds and composite onto white (studio-style)."""
from pathlib import Path
import io

from rembg import remove
from PIL import Image

team = Path(r"h:\Projects\Allied Book Company\frontend\public\team")
# Ammar already has a white studio background
skip = {"ammar-nasrullah.jpg"}
files = [p for p in sorted(team.glob("*.jpg")) if p.name not in skip]

for path in files:
    print(f"Processing {path.name}...")
    data = path.read_bytes()
    cutout = remove(data)
    fg = Image.open(io.BytesIO(cutout)).convert("RGBA")
    bg = Image.new("RGBA", fg.size, (255, 255, 255, 255))
    composed = Image.alpha_composite(bg, fg).convert("RGB")
    composed.save(path, "JPEG", quality=92, optimize=True)
    print(f"  done ({path.stat().st_size} bytes)")

print("All done.")
