
/* ---------- Saving, editions and batch ---------- */
const EDITION = { free: { maxSide: 1080, mark: true }, full: { maxSide: 4096 }, pro: { maxSide: 4096, batch: true, svg: true } }[TIER];

function track(name, params) {
  if (typeof window.gtag === "function") window.gtag("event", name, params || {});
}

function stampMark(c) {
  const x = c.getContext("2d");
  const size = Math.max(13, Math.round(c.width * 0.022));
  const text = "Made with Phogold Ink Trace";
  x.font = `600 ${size}px "Instrument Sans", system-ui, sans-serif`;
  const w = x.measureText(text).width, pad = size * 0.6;
  const bx = c.width - w - pad * 3, by = c.height - size * 2.4;
  x.globalAlpha = 0.72; x.fillStyle = "#141017";
  x.beginPath(); x.roundRect(bx, by, w + pad * 2, size * 1.7, size * 0.4); x.fill();
  x.globalAlpha = 1; x.fillStyle = "#e8b64a"; x.textBaseline = "middle";
  x.fillText(text, bx + pad, by + size * 0.85);
}

function exportCanvas(img) {
  const c = document.createElement("canvas");
  render({ img, target: c, maxSide: EDITION.maxSide });
  if (EDITION.mark) stampMark(c);
  return c;
}

const toBlob = (c) => new Promise((ok) => c.toBlob(ok, "image/png"));

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function fileName(base) {
  const look = state.look === "dark" ? "after-dark" : "golden-hour";
  return `${base}-${state.style}-${look}.png`.replace(/[^a-z0-9.\-]+/gi, "-").toLowerCase();
}

$("save").addEventListener("click", async () => {
  if (!state.img) return;
  $("busy").hidden = false; $("save").disabled = true;
  await new Promise((r) => setTimeout(r, 30));
  try {
    const c = exportCanvas();
    const blob = await toBlob(c);
    download(blob, fileName("phogold-ink"));
    $("status").textContent = `Saved at ${c.width} × ${c.height} px.`;
    track("save_image", { edition: TIER, style: state.style });
    if (TIER === "free") {
      $("saveNote").textContent = "Free saves are 1080 px with a small mark. The full version saves up to 4096 px with no mark.";
      $("upgrade").hidden = false;
    }
  } finally {
    $("busy").hidden = true; $("save").disabled = false;
  }
});
if (TIER === "free") {
  $("saveNote").textContent = "Free saves are 1080 px with a small mark.";
  $("upgrade").addEventListener("click", () => track("upgrade_click", { from: "tool" }));
} else {
  $("saveNote").textContent = "Saves at full size, up to 4096 px.";
}

/* ---------- Zip, store method. PNG is already compressed. ---------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) {
  const enc = new TextEncoder(), now = new Date();
  const dTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dTime, true); h.setUint16(12, dDate, true); h.setUint32(14, crc, true);
    h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true); c.setUint16(12, dTime, true); c.setUint16(14, dDate, true); c.setUint32(16, crc, true);
    c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: "application/zip" });
}

function readImage(file) {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = r.result; };
    r.onerror = fail; r.readAsDataURL(file);
  });
}

if (EDITION.batch) {
  $("batchGroup").hidden = false;
  $("batchFiles").addEventListener("change", async (e) => {
    const list = [...e.target.files].filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!list.length) return;
    $("busy").hidden = false;
    const out = [], used = new Set();
    try {
      for (let i = 0; i < list.length; i++) {
        $("busy").textContent = `Developing ${i + 1} of ${list.length}…`;
        await new Promise((r) => setTimeout(r, 20));
        try {
          const img = await readImage(list[i]);
          const blob = await toBlob(exportCanvas(img));
          let name = fileName(list[i].name.replace(/\.[^.]+$/, ""));
          for (let n = 2; used.has(name); n++) name = name.replace(/(-\d+)?\.png$/, `-${n}.png`);
          used.add(name);
          out.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
        } catch {
          $("status").textContent = `Skipped ${list[i].name}. It did not open as a photo.`;
        }
      }
      if (out.length) {
        download(makeZip(out), "phogold-ink-batch.zip");
        $("status").textContent = `Batch done. ${out.length} of ${list.length} photos saved in one zip file.`;
      }
    } finally {
      $("busy").hidden = true; $("busy").textContent = "Developing…";
    }
  });
}

$("file").addEventListener("change", () => track("photo_added", { edition: TIER }));

/* ---------- Vector export ---------- */
function lineArtSVG() {
  const img = state.img;
  const s = Math.min(1, 4096 / Math.max(img.width, img.height));
  const W = Math.round(img.width * s), H = Math.round(img.height * s), scale = Math.max(W, H) / 900;
  let strokes = state.trace.strokes.map((pts) => pts.map(([x, y]) => [x * s, y * s]));
  const r = (v) => Math.round(v * 10) / 10;
  let width, paths;
  if (state.style === "oneline") {
    const p = wobblePts(oneLinePath(strokes, scale), mulberry(77), state.wobble * 0.25 * scale, [0, 0]);
    width = Math.max(1, scale * (0.5 + state.weight * 0.26));
    paths = p.length > 1 ? ["M" + p.map((q) => r(q[0]) + " " + r(q[1])).join("L")] : [];
  } else {
    width = Math.max(1, scale * (0.6 + state.weight * 0.32));
    const wob = state.wobble * 0.32 * scale;
    paths = strokes.filter((pts) => pts.length >= 3).map((pts, si) => {
      const p = wobblePts(pts, mulberry(1000 + si * 7919), wob, [0, 0]);
      let d = `M${r(p[0][0])} ${r(p[0][1])}`;
      for (let j = 1; j < p.length - 1; j++) {
        const m = [(p[j][0] + p[j + 1][0]) / 2, (p[j][1] + p[j + 1][1]) / 2];
        d += `Q${r(p[j][0])} ${r(p[j][1])} ${r(m[0])} ${r(m[1])}`;
      }
      return d;
    });
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n` +
    `<g fill="none" stroke="${inkColor()}" stroke-width="${r(width)}" stroke-linecap="round" stroke-linejoin="round">\n` +
    paths.map((d) => `<path d="${d}"/>`).join("\n") + "\n</g>\n</svg>\n";
}

if (EDITION.svg) {
  $("svgGroup").hidden = false;
  $("saveSvg").addEventListener("click", () => {
    if (!state.img || !state.trace) return;
    const svg = lineArtSVG();
    download(new Blob([svg], { type: "image/svg+xml" }), fileName("phogold-ink").replace(/\.png$/, ".svg"));
    $("status").textContent = "Saved the line art as an SVG file.";
  });
}
