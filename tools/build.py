"""Build the Phogold Ink Trace store page and the paid app files.

Store page -> site/index.html  (committed, public)
Paid apps  -> dist/            (git-ignored, upload to the checkout platform)
"""
import hashlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
SITE = ROOT / "site"
DIST = ROOT / "dist"

parts = {
    "TOOL_CSS": (SRC / "tool.css").read_text(),
    "STORE_CSS": (SRC / "store.css").read_text(),
    "TOOL_HTML": (SRC / "tool.html").read_text(),
    "SAMPLES_JS": (SRC / "samples.js").read_text(),
    "ENGINE_JS": (SRC / "engine.js").read_text(),
    "STORE_JS": (SRC / "store.js").read_text(),
    "CHECKOUT_JS": (SRC / "checkout.js").read_text(),
}

EDITIONS = {
    "full": {
        "APP_TITLE": "Phogold Ink Trace Full",
        "EDITION_NAME": "Ink Trace Full",
        "LICENSE_LINE": "Ink Trace Full. Licensed for personal use by one person.",
    },
    "pro": {
        "APP_TITLE": "Phogold Ink Trace Pro",
        "EDITION_NAME": "Ink Trace Pro",
        "LICENSE_LINE": "Ink Trace Pro. Commercial license for one person or one small business. You may sell images and products you make with it.",
    },
}

README = """Phogold Ink Trace {name}

How to start
1. Unzip this folder.
2. Double-click {file}. It opens in your web browser.
3. Drop in a photo, pick a film look and a style, and press Save image.

Tips
- Bookmark the file or keep it on your desktop. It works without the internet.
- Large photos take a few seconds. A computer is faster than a phone.
{extra}
License
{license}
You may not share, resell or post this app file.

Help
Reply to your receipt email and we will help.
"""


def fill(template: str, values: dict) -> str:
    for key, val in values.items():
        template = template.replace("{{" + key + "}}", val)
    assert "{{" not in template, "unfilled placeholder"
    return template


def main() -> None:
    store = fill((SRC / "page-store.html").read_text(), parts)
    (SITE / "index.html").write_text(store)
    print(f"site/index.html  {len(store):>8,} bytes")

    DIST.mkdir(exist_ok=True)
    app_tpl = (SRC / "page-app.html").read_text()
    for tier, meta in EDITIONS.items():
        html = fill(app_tpl, {**parts, **meta, "TIER": tier})
        file = f"ink-trace-{tier}.html"
        extra = ("- Batch mode: press Process many photos and pick a whole folder of photos.\n"
                 "  You get one zip file of finished images.\n"
                 "- Save line art as SVG gives you just the lines, for Cricut pens,\n"
                 "  laser cutters and design apps.\n") if tier == "pro" else ""
        readme = README.format(name=meta["EDITION_NAME"].split()[-1], file=file,
                               extra=extra, license=meta["LICENSE_LINE"])
        out = DIST / f"Phogold-Ink-Trace-{tier.title()}.zip"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr(file, html)
            z.writestr("Start here.txt", readme)
        digest = hashlib.sha256(out.read_bytes()).hexdigest()
        print(f"dist/{out.name}  {out.stat().st_size:>8,} bytes  sha256 {digest}")


if __name__ == "__main__":
    main()
