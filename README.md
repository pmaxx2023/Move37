# Phogold Ink Trace store

A one-page store for Phogold Ink Trace, a tool that turns a photo into ink art in the browser.

- The free version runs on the store page. Saves are 1080 px with a small mark.
- **Ink Trace Full, $19:** one offline app file. Saves at full size, up to 4096 px, with no mark.
- **Ink Trace Pro, $39:** Full, plus batch mode, SVG line art export and a commercial license.

The launch plan, revenue math and ad plan are in [LAUNCH.md](LAUNCH.md).

## Layout

| Path | What it is |
| --- | --- |
| `src/` | Source parts: tool engine, styles, page templates |
| `tools/build.py` | Builds the store page and the paid app files |
| `site/` | The public store. GitHub Pages serves this folder. |
| `site/config.js` | Checkout links, contact email and Google Ads settings |
| `dist/` | Paid app zips. Not committed. Upload these to the checkout platform. |

## Build

```bash
python3 tools/build.py
```

This writes `site/index.html` and two zips in `dist/`. Run it after any change in `src/`.

## Keep paid files out of git

This repo is public. `dist/` is in `.gitignore` so the paid apps are never committed.
Do not copy the paid zips into `site/`.
