/* 生成应用图标 icon.ico（多尺寸，PNG 内嵌） */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

/* ---------- CRC32 ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++){
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf){
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

/* ---------- PNG 编码 ---------- */
function chunk(type, data){
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function toPNG(rgba, size){
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++){
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/* ---------- 形状工具 ---------- */
function inRoundRect(x, y, x0, y0, x1, y1, r){
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r || (x >= x0 + r && x <= x1 - r) || (y >= y0 + r && y <= y1 - r);
}
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

/* ---------- 绘制：深色圆角底 + 书页 + 书脊 + 文字行 ---------- */
const BG_TOP = [44, 50, 74], BG_BOT = [19, 21, 30];
const PAGE = [242, 245, 252];
const SPINE = [111, 141, 255];
const LINE = [45, 52, 74];

function shade(u, v){
  // 外层圆角背景
  if (!inRoundRect(u, v, 0.02, 0.02, 0.98, 0.98, 0.21)) return [0, 0, 0, 0];
  let col = mix(BG_TOP, BG_BOT, v);

  // 页面
  if (inRoundRect(u, v, 0.235, 0.175, 0.775, 0.825, 0.045)){
    col = PAGE;
    // 书脊
    if (inRoundRect(u, v, 0.235, 0.175, 0.315, 0.825, 0.045)) col = SPINE;
    // 文字行
    const rows = [
      [0.345, 0.735, 0.315],
      [0.345, 0.700, 0.405],
      [0.345, 0.755, 0.495],
      [0.345, 0.640, 0.585],
      [0.345, 0.760, 0.675]
    ];
    for (const [x0, x1, yc] of rows){
      if (inRoundRect(u, v, x0, yc - 0.028, x1, yc + 0.028, 0.028)) col = LINE;
    }
  }
  return [col[0], col[1], col[2], 255];
}

function render(size){
  const SS = 4, N = size * SS;
  const out = Buffer.alloc(size * size * 4);
  const acc = new Float64Array(size * size * 4);
  for (let sy = 0; sy < N; sy++){
    const v = (sy + 0.5) / N;
    for (let sx = 0; sx < N; sx++){
      const u = (sx + 0.5) / N;
      const c = shade(u, v);
      const px = Math.floor(sx / SS), py = Math.floor(sy / SS);
      const i = (py * size + px) * 4;
      acc[i]     += c[0] * c[3] / 255;
      acc[i + 1] += c[1] * c[3] / 255;
      acc[i + 2] += c[2] * c[3] / 255;
      acc[i + 3] += c[3];
    }
  }
  const cnt = SS * SS;
  for (let i = 0; i < size * size; i++){
    const a = acc[i * 4 + 3] / cnt;
    if (a <= 0.5){
      out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = out[i * 4 + 3] = 0;
    } else {
      out[i * 4]     = Math.min(255, Math.round(acc[i * 4]     / cnt * 255 / a));
      out[i * 4 + 1] = Math.min(255, Math.round(acc[i * 4 + 1] / cnt * 255 / a));
      out[i * 4 + 2] = Math.min(255, Math.round(acc[i * 4 + 2] / cnt * 255 / a));
      out[i * 4 + 3] = Math.min(255, Math.round(a));
    }
  }
  return out;
}

/* ---------- 组装 ICO ---------- */
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = sizes.map(s => ({ size: s, buf: toPNG(render(s), s) }));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);

let offset = 6 + 16 * pngs.length;
const entries = [];
for (const p of pngs){
  const e = Buffer.alloc(16);
  e[0] = p.size >= 256 ? 0 : p.size;
  e[1] = p.size >= 256 ? 0 : p.size;
  e[2] = 0; e[3] = 0;
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(p.buf.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += p.buf.length;
  entries.push(e);
}

const outDir = path.join(__dirname, "build");
fs.mkdirSync(outDir, { recursive: true });
const ico = Buffer.concat([header, ...entries, ...pngs.map(p => p.buf)]);
fs.writeFileSync(path.join(outDir, "icon.ico"), ico);
fs.writeFileSync(path.join(outDir, "icon.png"), pngs[pngs.length - 1].buf);
console.log("icon.ico 写入完成：" + ico.length + " 字节，" + sizes.length + " 个尺寸");
