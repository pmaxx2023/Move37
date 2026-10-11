const SAMPLE_LABELS = { portrait: "Sample portrait", cafe: "Sample cafe table", cat: "Sample cat" };

const $ = (id) => document.getElementById(id);
const STYLE_NAMES = { ink: "INK TRACE", storybook: "STORYBOOK", oneline: "ONE LINE", penink: "PEN & INK", watercolor: "WATERCOLOR", cartoon: "CARTOON" };
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = { look: "golden", style: "ink", lines: 6, weight: 5, wobble: 5, ink: "auto", img: null, frame: 1, strokes: null, traceKey: "" };

/* ---------- Color grades ---------- */
function buildGoldenLUT() {
  const r = new Uint8ClampedArray(256), g = new Uint8ClampedArray(256), b = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = i / 255;
    v = 0.06 + v * 0.92;
    r[i] = Math.min(1, v * 1.08 + 0.02) * 255;
    g[i] = Math.min(1, v * 1.01) * 255;
    b[i] = Math.min(1, v * 0.86 + 0.03) * 255;
  }
  return { r, g, b };
}
const GOLD_LUT = buildGoldenLUT();

function gradePixels(data, look) {
  const n = data.length;
  if (look === "golden") {
    for (let i = 0; i < n; i += 4) {
      let r = GOLD_LUT.r[data[i]], g = GOLD_LUT.g[data[i + 1]], b = GOLD_LUT.b[data[i + 2]];
      const l = (r + g + b) / 3;
      data[i] = l + (r - l) * 0.9; data[i + 1] = l + (g - l) * 0.9; data[i + 2] = l + (b - l) * 0.9;
    }
  } else {
    for (let i = 0; i < n; i += 4) {
      const r0 = data[i] / 255, g0 = data[i + 1] / 255, b0 = data[i + 2] / 255;
      const l = (r0 + g0 + b0) / 3;
      const t = Math.pow(Math.min(1, Math.max(0, (l - 0.15) / 0.75)), 1.4);
      const k = 0.35 + 0.65 * l;
      data[i] = ((0.20 * (1 - t) + 1.00 * t) * k + r0 * 0.15) * 255;
      data[i + 1] = ((0.10 * (1 - t) + 0.80 * t) * k + g0 * 0.15) * 255;
      data[i + 2] = ((0.32 * (1 - t) + 0.42 * t) * k + b0 * 0.15) * 255;
    }
  }
}

/* ---------- Line finding ----------
   1. Shrink the photo so fur, fabric and skin texture disappear.
   2. Edge-preserving blur in Lab color, several passes.
   3. Edges from color change count fully. Edges from brightness alone count less,
      so soft shadows across a face are not traced as lines.
   4. Thin to 1 px, keep connected edges, walk them into strokes, keep the longest. */
function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
const LIN = new Float32Array(256); for (let i = 0; i < 256; i++) LIN[i] = srgbToLin(i);
function fLab(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }

function findStrokes(img, linesLevel) {
  const work = Math.round(200 + 24 * linesLevel);
  const s = work / Math.max(img.width, img.height);
  const W = Math.max(8, Math.round(img.width * s)), H = Math.max(8, Math.round(img.height * s));
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.imageSmoothingQuality = "high";
  cx.drawImage(img, 0, 0, W, H);
  const px = cx.getImageData(0, 0, W, H).data;
  const N = W * H;
  let L = new Float32Array(N), A = new Float32Array(N), B = new Float32Array(N);
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    const r = LIN[px[j]], g = LIN[px[j + 1]], b = LIN[px[j + 2]];
    const x = fLab((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.9505);
    const y = fLab(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const z = fLab((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.089);
    L[i] = 116 * y - 16; A[i] = 500 * (x - y); B[i] = 200 * (y - z);
  }
  // Bilateral passes
  const R = 3, sigS = 2.5, sigC = 9;
  const spatial = [];
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) spatial.push([dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * sigS * sigS))]);
  for (let pass = 0; pass < 4; pass++) {
    const L2 = new Float32Array(N), A2 = new Float32Array(N), B2 = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let sw = 0, sl = 0, sa = 0, sb = 0;
      const l0 = L[i], a0 = A[i], b0 = B[i];
      for (const [dx, dy, ws] of spatial) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const k = yy * W + xx;
        const dl = L[k] - l0, da = A[k] - a0, db = B[k] - b0;
        const w = ws * Math.exp(-(dl * dl + da * da + db * db) / (2 * sigC * sigC));
        sw += w; sl += w * L[k]; sa += w * A[k]; sb += w * B[k];
      }
      L2[i] = sl / sw; A2[i] = sa / sw; B2[i] = sb / sw;
    }
    L = L2; A = A2; B = B2;
  }
  // Smoothed color image, used by the cartoon, watercolor and pen and ink styles
  const flat = document.createElement("canvas"); flat.width = W; flat.height = H;
  const fx = flat.getContext("2d"); const fd = fx.createImageData(W, H);
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    const fy = (L[i] + 16) / 116, fxx = fy + A[i] / 500, fz = fy - B[i] / 200;
    const inv = (t) => (t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787);
    const X = inv(fxx) * 0.9505, Y = inv(fy), Z = inv(fz) * 1.089;
    const lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z];
    for (let c = 0; c < 3; c++) { const v = Math.max(0, lin[c]); fd.data[j + c] = 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }
    fd.data[j + 3] = 255;
  }
  fx.putImageData(fd, 0, 0);
  // Gradients
  const mag = new Float32Array(N), gxA = new Float32Array(N), gyA = new Float32Array(N);
  const wL = 0.55, wC = 1.6;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    let best = 0, bgx = 0, bgy = 0, sum = 0;
    for (const [ch, w] of [[L, wL], [A, wC], [B, wC]]) {
      const gx = (ch[i - W + 1] + 2 * ch[i + 1] + ch[i + W + 1] - ch[i - W - 1] - 2 * ch[i - 1] - ch[i + W - 1]) * w;
      const gy = (ch[i + W - 1] + 2 * ch[i + W] + ch[i + W + 1] - ch[i - W - 1] - 2 * ch[i - W] - ch[i - W + 1]) * w;
      const m = gx * gx + gy * gy; sum += m;
      if (m > best) { best = m; bgx = gx; bgy = gy; }
    }
    mag[i] = Math.sqrt(sum); gxA[i] = bgx; gyA[i] = bgy;
  }
  // Non-max suppression
  const nms = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, m = mag[i]; if (m === 0) continue;
    const ang = Math.atan2(gyA[i], gxA[i]);
    const ox = Math.round(Math.cos(ang)), oy = Math.round(Math.sin(ang));
    if (m >= mag[i + oy * W + ox] && m >= mag[i - oy * W - ox]) nms[i] = m;
  }
  // Hysteresis thresholds from the photo itself
  const vals = []; for (let i = 0; i < N; i++) if (nms[i] > 0) vals.push(nms[i]);
  vals.sort((a, b) => a - b);
  const hi = Math.max(vals[Math.floor(vals.length * 0.86)] || 1, 18), lo = hi * 0.42;
  const edge = new Uint8Array(N); const stack = [];
  for (let i = 0; i < N; i++) if (nms[i] >= hi) { edge[i] = 1; stack.push(i); }
  const NB = [-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1];
  while (stack.length) {
    const i = stack.pop();
    for (const o of NB) { const k = i + o; if (k > 0 && k < N && !edge[k] && nms[k] >= lo) { edge[k] = 1; stack.push(k); } }
  }
  for (let x = 0; x < W; x++) { edge[x] = 0; edge[(H - 1) * W + x] = 0; }
  for (let y = 0; y < H; y++) { edge[y * W] = 0; edge[y * W + W - 1] = 0; }
  // Walk edges into strokes
  const seen = new Uint8Array(N);
  const nbCount = (i) => { let c = 0; for (const o of NB) if (edge[i + o]) c++; return c; };
  function walk(start, prev) {
    const out = []; let cur = start, pdx = prev ? (start % W) - (prev % W) : 0, pdy = prev ? Math.floor(start / W) - Math.floor(prev / W) : 0;
    while (true) {
      let pick = -1, bestDot = -9;
      for (const o of NB) {
        const k = cur + o; if (!edge[k] || seen[k]) continue;
        const dx = (k % W) - (cur % W), dy = Math.floor(k / W) - Math.floor(cur / W);
        const dot = (dx * pdx + dy * pdy) / Math.hypot(dx, dy);
        if (dot > bestDot) { bestDot = dot; pick = k; }
      }
      if (pick < 0) break;
      seen[pick] = 1; out.push(pick);
      pdx = (pick % W) - (cur % W); pdy = Math.floor(pick / W) - Math.floor(cur / W);
      cur = pick;
    }
    return out;
  }
  const chains = [];
  const startFrom = (i) => {
    seen[i] = 1;
    const fwd = walk(i, null);
    const back = walk(i, fwd.length ? fwd[0] : null);
    chains.push(back.reverse().concat([i], fwd));
  };
  for (let i = 0; i < N; i++) if (edge[i] && !seen[i] && nbCount(i) === 1) startFrom(i);
  for (let i = 0; i < N; i++) if (edge[i] && !seen[i]) startFrom(i);
  // Rank and keep the main lines
  const minLen = Math.max(W, H) * (0.11 - 0.007 * linesLevel);
  const maxStrokes = 16 + 9 * linesLevel;
  const ranked = chains.filter((ch) => ch.length >= minLen).map((ch) => {
    let m = 0; for (const i of ch) m += mag[i];
    return { ch, score: ch.length * (0.5 + m / ch.length / hi) };
  }).sort((a, b) => b.score - a.score).slice(0, maxStrokes);
  // Smooth and scale back to photo size
  const inv = 1 / s;
  const strokes = ranked.map(({ ch }) => {
    const pts = ch.map((i) => [(i % W) + 0.5, Math.floor(i / W) + 0.5]);
    const k = 4, sm = [];
    for (let j = 0; j < pts.length; j++) {
      let sx = 0, sy = 0, c = 0;
      for (let t = -k; t <= k; t++) { const q = pts[Math.min(pts.length - 1, Math.max(0, j + t))]; sx += q[0]; sy += q[1]; c++; }
      if (j % 2 === 0 || j === pts.length - 1) sm.push([sx / c * inv, sy / c * inv]);
    }
    return sm;
  });
  return { strokes, flat };
}

/* ---------- Drawing ---------- */
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let grainTile = null;
function grain() {
  if (grainTile) return grainTile;
  const c = document.createElement("canvas"); c.width = c.height = 192;
  const x = c.getContext("2d"); const d = x.createImageData(192, 192); const rnd = mulberry(11);
  for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (rnd() - 0.5) * 70; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); grainTile = c; return c;
}

function paperColor() { return state.look === "dark" ? "#1c1426" : "#f1e6cf"; }
function inkColor() {
  if (state.ink !== "auto") return state.ink;
  if (state.style === "cartoon") return "#140d18";
  if (state.style === "watercolor") return state.look === "dark" ? "#e9c77a" : "#5a4660";
  return state.look === "dark" ? "#f2c768" : "#2a1b3a";
}

/* One stroke, drawn by hand: slow wobble, tapered ends, a lighter second pass. */
function wobblePts(pts, rnd, amp, off) {
  const ph1 = rnd() * 6.28, ph2 = rnd() * 6.28, f1 = 4 + rnd() * 4, f2 = 3 + rnd() * 4, n = pts.length;
  return pts.map((q, j) => { const t = j / Math.max(1, n - 1); return [q[0] + Math.sin(t * f1 + ph1) * amp + off[0], q[1] + Math.cos(t * f2 + ph2) * amp + off[1]]; });
}
function drawStrokes(ctx, strokes, scale, opts = {}) {
  const color = opts.color || inkColor();
  const base = Math.max(1, scale * (0.6 + state.weight * 0.32) * (opts.weight || 1));
  const wob = state.wobble * 0.32 * scale * (opts.wobble ?? 1);
  const alpha = opts.alpha ?? 1;
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color;
  strokes.forEach((pts, si) => {
    if (pts.length < 3) return;
    const rnd = mulberry(1000 + si * 7919);
    for (let pass = 0; pass < (opts.single ? 1 : 2); pass++) {
      const off = pass ? [(rnd() - 0.5) * wob * 1.2, (rnd() - 0.5) * wob * 1.2] : [0, 0];
      const p = wobblePts(pts, rnd, wob * (pass ? 1.6 : 1), off), n = p.length;
      ctx.globalAlpha = alpha * (pass ? 0.55 : 0.95);
      for (let j = 1; j < n - 1; j++) {
        const t = j / (n - 1);
        ctx.lineWidth = base * (0.45 + 0.85 * Math.sin(Math.PI * t)) * (pass ? 0.45 : 1);
        const a = [(p[j - 1][0] + p[j][0]) / 2, (p[j - 1][1] + p[j][1]) / 2];
        const b = [(p[j][0] + p[j + 1][0]) / 2, (p[j][1] + p[j + 1][1]) / 2];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(p[j][0], p[j][1], b[0], b[1]); ctx.stroke();
      }
    }
  });
  ctx.globalAlpha = 1;
}

/* Join every stroke into one unbroken line: start with the longest stroke,
   then always jump to the nearest free stroke end, with a gentle curve between. */
function oneLinePath(strokes, scale) {
  const left = strokes.filter((p) => p.length > 2).map((p) => p.slice());
  if (!left.length) return [];
  left.sort((a, b) => b.length - a.length);
  const rnd = mulberry(4242);
  let path = left.shift();
  while (left.length) {
    const e = path[path.length - 1];
    let bi = 0, rev = false, bd = Infinity;
    left.forEach((p, i) => {
      const d0 = Math.hypot(p[0][0] - e[0], p[0][1] - e[1]), d1 = Math.hypot(p[p.length - 1][0] - e[0], p[p.length - 1][1] - e[1]);
      if (d0 < bd) { bd = d0; bi = i; rev = false; }
      if (d1 < bd) { bd = d1; bi = i; rev = true; }
    });
    let next = left.splice(bi, 1)[0]; if (rev) next.reverse();
    const s0 = next[0], dx = s0[0] - e[0], dy = s0[1] - e[1], dist = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.round(dist / (4 * scale)));
    const bend = (rnd() - 0.5) * 0.5 * dist, nx = -dy / (dist || 1), ny = dx / (dist || 1);
    for (let k = 1; k < steps; k++) {
      const t = k / steps, b = Math.sin(Math.PI * t) * bend;
      path.push([e[0] + dx * t + nx * b, e[1] + dy * t + ny * b]);
    }
    path = path.concat(next);
  }
  return path;
}
let lineAnim = 0;
function drawOneLine(ctx, path, scale, onDone, instant) {
  if (!instant) cancelAnimationFrame(lineAnim);
  const rnd = mulberry(77);
  const p = wobblePts(path, rnd, state.wobble * 0.25 * scale, [0, 0]);
  const w = Math.max(1, scale * (0.5 + state.weight * 0.26));
  ctx.strokeStyle = inkColor(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = w;
  const drawRange = (a, b) => {
    ctx.beginPath(); ctx.moveTo(p[a][0], p[a][1]);
    for (let j = a + 1; j <= b; j++) ctx.lineTo(p[j][0], p[j][1]);
    ctx.stroke();
  };
  if (instant || reduceMotion || p.length < 2) { if (p.length > 1) drawRange(0, p.length - 1); onDone(); return; }
  const total = p.length - 1, dur = 2600, t0 = performance.now();
  let done = 0;
  const step = (now) => {
    const target = Math.min(total, Math.round(((now - t0) / dur) * total));
    if (target > done) { drawRange(done, target); done = target; }
    if (done < total) lineAnim = requestAnimationFrame(step); else onDone();
  };
  lineAnim = requestAnimationFrame(step);
}

/* Soft mask from the smoothed tone image: where it is darker (or lighter, at night) than a level. */
function toneMask(flatGraded, W, H, level, invert) {
  const m = document.createElement("canvas"); m.width = flatGraded.width; m.height = flatGraded.height;
  const mx = m.getContext("2d"); mx.drawImage(flatGraded, 0, 0);
  const d = mx.getImageData(0, 0, m.width, m.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const l = (0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) / 255;
    const v = invert ? (l - level) / 0.06 : (level - l) / 0.06;
    a[i] = a[i + 1] = a[i + 2] = 0; a[i + 3] = Math.max(0, Math.min(1, v + 0.5)) * 255;
  }
  mx.putImageData(d, 0, 0);
  const big = document.createElement("canvas"); big.width = W; big.height = H;
  const bx = big.getContext("2d"); bx.imageSmoothingQuality = "high"; bx.drawImage(m, 0, 0, W, H);
  return big;
}
function hatch(ctx, flatGraded, W, H, scale) {
  const dark = state.look === "dark";
  const levels = dark ? [0.30, 0.45, 0.6, 0.75] : [0.80, 0.62, 0.44, 0.27];
  const angles = [45, -45, 8, 98];
  const color = inkColor();
  levels.forEach((lv, li) => {
    const layer = document.createElement("canvas"); layer.width = W; layer.height = H;
    const lx = layer.getContext("2d");
    lx.strokeStyle = color; lx.lineCap = "round"; lx.lineWidth = Math.max(0.8, 0.8 * scale);
    const rnd = mulberry(300 + li);
    const gap = Math.max(4, 7.5 * scale), ang = (angles[li] * Math.PI) / 180;
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2 + gap;
    const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
    for (let o = -R; o <= R; o += gap) {
      const j = (rnd() - 0.5) * gap * 0.35;
      lx.globalAlpha = 0.55 + rnd() * 0.35;
      lx.beginPath();
      const segs = 8;
      for (let k = 0; k <= segs; k++) {
        const t = -R + (2 * R * k) / segs, w = Math.sin(k * 1.7 + o) * 0.6 * scale;
        const x = cx + vx * (o + j + w) + ux * t, y = cy + vy * (o + j + w) + uy * t;
        k ? lx.lineTo(x, y) : lx.moveTo(x, y);
      }
      lx.stroke();
    }
    lx.globalAlpha = 1; lx.globalCompositeOperation = "destination-in";
    lx.drawImage(toneMask(flatGraded, W, H, lv, dark), 0, 0);
    ctx.drawImage(layer, 0, 0);
  });
}
function posterize(canvas, levels, sat, lift = 0) {
  // Round brightness into flat bands. Color comes from the smoothed photo, so no hue blotches.
  const x = canvas.getContext("2d", { willReadFrequently: true });
  const d = x.getImageData(0, 0, canvas.width, canvas.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const l = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2];
    const band = Math.round((l / 255) * levels) / levels * 255;
    const lq = band * 0.8 + l * 0.2;
    for (let c = 0; c < 3; c++) {
      let v = lq + (a[i + c] - l) * sat;
      a[i + c] = v + (255 - v) * lift;
    }
  }
  x.putImageData(d, 0, 0);
}
function upscale(src, W, H, blurPx) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingQuality = "high";
  if (blurPx) x.filter = `blur(${blurPx}px)`;
  x.drawImage(src, 0, 0, W, H); x.filter = "none";
  return c;
}

function fitFrame() {
  const c = $("after"); if (!c.width) return;
  const st = $("stage").getBoundingClientRect();
  const maxH = Math.max(260, window.innerHeight * 0.72);
  const w = Math.min(st.width, maxH * (c.width / c.height));
  $("frame").style.width = Math.floor(w) + "px";
}
window.addEventListener("resize", fitFrame);

function render(opts = {}) {
  const img = opts.img || state.img; if (!img) return;
  const target = opts.target;
  if (!target) cancelAnimationFrame(lineAnim);
  const t0 = performance.now();
  const maxSide = opts.maxSide || 1600;
  const s = Math.min(1, maxSide / Math.max(img.width, img.height));
  const W = Math.round(img.width * s), H = Math.round(img.height * s);
  const key = img.src.length + ":" + img.src.slice(-40) + ":" + state.lines;
  let trace;
  if (opts.img) trace = findStrokes(img, state.lines);
  else { if (state.traceKey !== key) { state.trace = findStrokes(img, state.lines); state.traceKey = key; } trace = state.trace; }
  const strokes = trace.strokes.map((pts) => pts.map(([x, y]) => [x * s, y * s]));

  const after = target || $("after");
  after.width = W; after.height = H;
  if (!target) { const before = $("before"); before.width = W; before.height = H; before.getContext("2d").drawImage(img, 0, 0, W, H); }

  const ctx = after.getContext("2d");
  const scale = Math.max(W, H) / 900;
  const dark = state.look === "dark";
  // Film-graded versions of the photo and of the smoothed color image
  const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
  const tx = tmp.getContext("2d", { willReadFrequently: true }); tx.drawImage(img, 0, 0, W, H);
  const d = tx.getImageData(0, 0, W, H); gradePixels(d.data, state.look); tx.putImageData(d, 0, 0);
  const fl = trace.flat, flatG = document.createElement("canvas"); flatG.width = fl.width; flatG.height = fl.height;
  const fgx = flatG.getContext("2d", { willReadFrequently: true }); fgx.drawImage(fl, 0, 0);
  const fd = fgx.getImageData(0, 0, fl.width, fl.height); gradePixels(fd.data, state.look); fgx.putImageData(fd, 0, 0);

  const paper = () => { ctx.fillStyle = paperColor(); ctx.fillRect(0, 0, W, H); };
  const finish = (grainAmt = 0.16) => {
    ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = grainAmt;
    ctx.fillStyle = ctx.createPattern(grain(), "repeat"); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  };
  const wash = (alpha, levels, blurK, lift = 0) => {
    const post = upscale(flatG, W, H, Math.max(1, blurK * scale));
    posterize(post, levels, 1.1, dark ? 0 : lift);
    ctx.globalAlpha = alpha; ctx.globalCompositeOperation = dark ? "screen" : "multiply";
    ctx.filter = `blur(${Math.max(1, 1.5 * scale)}px)`; ctx.drawImage(post, 0, 0); ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    return post;
  };

  let lineCount = strokes.length;
  if (!target) $("replay").hidden = state.style !== "oneline";
  switch (state.style) {
    case "ink":
      ctx.drawImage(tmp, 0, 0); drawStrokes(ctx, strokes, scale); finish(); break;
    case "storybook":
      paper(); wash(dark ? 0.85 : 0.8, 5, 2, 0.05); drawStrokes(ctx, strokes, scale); finish(); break;
    case "watercolor": {
      paper();
      const post = wash(dark ? 0.7 : 0.75, 4, 7, 0.22);
      // Pigment pools at the edges of each wash
      ctx.globalCompositeOperation = dark ? "screen" : "multiply"; ctx.globalAlpha = 0.22;
      ctx.drawImage(post, 1.6 * scale, 1.2 * scale); ctx.drawImage(post, -1.2 * scale, -1.4 * scale);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      drawStrokes(ctx, strokes, scale, { weight: 0.45, alpha: 0.5, single: true });
      ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = dark ? 0.12 : 0.3;
      ctx.fillStyle = ctx.createPattern(grain(), "repeat"); ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      break;
    }
    case "penink":
      paper(); hatch(ctx, flatG, W, H, scale); drawStrokes(ctx, strokes, scale, { weight: 1.1 }); finish(0.1); break;
    case "cartoon": {
      const post = upscale(flatG, W, H, 0);
      posterize(post, 5, 1.45);
      ctx.filter = `blur(${Math.max(0.6, 0.8 * scale)}px)`; ctx.drawImage(post, 0, 0); ctx.filter = "none";
      drawStrokes(ctx, strokes, scale, { weight: 1.6, wobble: 0.4 }); finish(0.08); break;
    }
    case "oneline": {
      paper(); finish(0.1);
      const path = oneLinePath(strokes, scale);
      lineCount = path.length ? 1 : 0;
      drawOneLine(ctx, path, scale, () => {}, !!target);
      break;
    }
  }

  if (target) return;
  fitFrame();
  $("edgeLook").textContent = dark ? "AFTER DARK 400" : "GOLDEN HOUR 200";
  $("edgeStyle").textContent = STYLE_NAMES[state.style];
  $("edgeLines").textContent = state.style === "oneline" ? `1 LINE · ${strokes.length} PARTS` : `${strokes.length} LINES`;
  $("status").textContent = state.style === "oneline"
    ? `One unbroken line through ${strokes.length} traced shapes.`
    : `${STYLE_NAMES[state.style].charAt(0) + STYLE_NAMES[state.style].slice(1).toLowerCase()} · ${strokes.length} lines · ${((performance.now() - t0) / 1000).toFixed(2)} s`;
}

let pending = 0;
function schedule() {
  $("busy").hidden = false;
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(() => setTimeout(() => { try { render(); } finally { $("busy").hidden = true; } }, 10));
}

function loadSrc(src, label) {
  const img = new Image();
  img.onload = () => {
    state.img = img; state.traceKey = "";
    state.frame += 1;
    $("edgeFrame").textContent = `▸ ${state.frame}`; $("edgeFrameA").textContent = `▸ ${state.frame}A`;
    $("after").setAttribute("aria-label", `${label}, edited`);
    schedule();
  };
  img.onerror = () => { $("status").textContent = "That file did not open as a photo. Try a JPG, PNG or HEIC exported as JPG."; };
  img.src = src;
}
function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) { $("status").textContent = "That is not an image file. Choose a JPG or PNG."; return; }
  for (const b of $("samples").children) b.setAttribute("aria-pressed", "false");
  const r = new FileReader(); r.onload = () => loadSrc(r.result, file.name); r.readAsDataURL(file);
}

/* ---------- Controls ---------- */
function segment(id, key) {
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    for (const x of $(id).children) x.setAttribute("aria-pressed", String(x === b));
    state[key] = b.dataset.v; schedule();
  });
}
segment("look", "look"); segment("style", "style"); segment("ink", "ink");
for (const k of ["lines", "weight", "wobble"]) {
  $(k).addEventListener("input", () => { state[k] = +$(k).value; $(k + "Out").textContent = $(k).value; schedule(); });
}
$("replay").addEventListener("click", () => schedule());
$("file").addEventListener("change", (e) => loadFile(e.target.files[0]));
const stage = $("stage");
stage.addEventListener("dragover", (e) => { e.preventDefault(); stage.classList.add("drag"); });
stage.addEventListener("dragleave", () => stage.classList.remove("drag"));
stage.addEventListener("drop", (e) => { e.preventDefault(); stage.classList.remove("drag"); loadFile(e.dataTransfer.files[0]); });
window.addEventListener("paste", (e) => { const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/")); if (f) loadFile(f); });

const split = $("split");
split.addEventListener("input", () => { $("frame").style.setProperty("--split", split.value + "%"); });
$("frame").style.setProperty("--split", split.value + "%");
function dragSplit(e) {
  const r = $("frame").getBoundingClientRect();
  const v = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
  split.value = v; $("frame").style.setProperty("--split", v + "%");
}
stage.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" && e.button !== 0) return; dragSplit(e); stage.setPointerCapture(e.pointerId); });
stage.addEventListener("pointermove", (e) => { if (stage.hasPointerCapture(e.pointerId)) dragSplit(e); });

for (const [k, src] of Object.entries(SAMPLES)) {
  const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-pressed", k === "portrait" ? "true" : "false");
  b.setAttribute("aria-label", SAMPLE_LABELS[k]);
  const im = document.createElement("img"); im.src = src; im.alt = ""; b.append(im);
  b.addEventListener("click", () => { for (const x of $("samples").children) x.setAttribute("aria-pressed", String(x === b)); loadSrc(src, SAMPLE_LABELS[k]); });
  $("samples").append(b);
}
state.frame = 0;
loadSrc(SAMPLES.portrait, SAMPLE_LABELS.portrait);
