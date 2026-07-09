import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "portfolio-data.js"
THUMB_DIR = ROOT / "assets" / "thumbs"
MAX_WIDTH = 1800
QUALITY = 78


def load_data():
    source = DATA_FILE.read_text(encoding="utf-8")
    prefix = "window.PORTFOLIO_DATA = "
    if not source.startswith(prefix):
        raise RuntimeError("portfolio-data.js format not recognized")
    payload = source[len(prefix):].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def save_data(data):
    DATA_FILE.write_text(
        "window.PORTFOLIO_DATA = "
        + json.dumps(data, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )


def thumb_name(rel):
    digest = hashlib.sha1(rel.encode("utf-8")).hexdigest()[:14]
    return f"{digest}.webp"


def make_thumb(file_entry):
    rel = file_entry.get("rel")
    if not rel:
        return None
    source = ROOT / Path(rel)
    if not source.exists():
        return None

    target_name = thumb_name(rel)
    target = THUMB_DIR / target_name
    THUMB_DIR.mkdir(parents=True, exist_ok=True)

    if not target.exists():
      with Image.open(source) as image:
          image = ImageOps.exif_transpose(image)
          if image.mode not in ("RGB", "RGBA"):
              image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
          if image.mode == "RGBA":
              background = Image.new("RGB", image.size, (255, 255, 255))
              background.paste(image, mask=image.getchannel("A"))
              image = background
          width, height = image.size
          if width > MAX_WIDTH:
              next_height = max(1, round(height * (MAX_WIDTH / width)))
              image = image.resize((MAX_WIDTH, next_height), Image.Resampling.LANCZOS)
          image.save(target, "WEBP", quality=QUALITY, method=6)

    return f"assets/thumbs/{target_name}"


def main():
    data = load_data()
    made = 0
    reused = 0
    for domain in data:
        for project in domain.get("projects", []):
            for file_entry in project.get("files", []):
                if file_entry.get("type") != "image":
                    continue
                if file_entry.get("encodedThumb"):
                    reused += 1
                    continue
                thumb = make_thumb(file_entry)
                if thumb:
                    file_entry["encodedThumb"] = thumb
                    made += 1
            cover = project.get("cover")
            if cover and cover.get("type") == "image":
                matching = next(
                    (item for item in project.get("files", []) if item.get("rel") == cover.get("rel")),
                    None,
                )
                if matching:
                    cover["encodedThumb"] = matching.get("encodedThumb")
    save_data(data)
    print(f"Generated or linked {made} thumbnails; kept {reused} existing thumbnails.")


if __name__ == "__main__":
    main()
