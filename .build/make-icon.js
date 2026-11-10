/* 从 assets/logo.jpg 生成应用图标
 * - build/icon.ico  多尺寸（圆角方形，透明外角，保留原图绿底）
 * - build/icon.png  256px 单图
 * - build/logo-64.png / logo-128.png 圆形版，供界面内嵌
 * 依赖 Electron 的 Chromium 做高质量缩放：用 electron 运行本文件。
 *   node_modules/.bin/electron make-icon.js
 */
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const SRC = path.join(__dirname, "assets", "logo.jpg");
const OUT = path.join(__dirname, "build");

const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256];
const PNG_SIZES = [64, 128];

/* Chromium 侧绘制：圆角/圆形遮罩 + 中心主体轻微放大 */
function pageScript(sizes, pngSizes, dataURL){
  return `(async () => {
    const sizes = ${JSON.stringify(sizes)};
    const pngSizes = ${JSON.stringify(pngSizes)};
    const img = new Image();
    img.src = ${JSON.stringify(dataURL)};
    await img.decode();

    // 主体放大：源图四周留白较多，裁掉 13% 边距让小尺寸也看得清
    const CROP = 0.13;
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const sx = sw * CROP, sy = sh * CROP, sSize = sw * (1 - CROP * 2);

    function draw(size, mask){
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      g.beginPath();
      if (mask === "circle"){
        g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      } else {
        const r = size * 0.225;
        g.roundRect ? g.roundRect(0, 0, size, size, r) : g.rect(0, 0, size, size);
      }
      g.closePath();
      g.clip();
      g.drawImage(img, sx, sy, sSize, sSize, 0, 0, size, size);
      return c.toDataURL("image/png");
    }

    const ico = sizes.map(s => ({ size: s, data: draw(s, "rounded") }));
    const rnd = pngSizes.map(s => ({ size: s, data: draw(s, "circle") }));
    return { ico, rnd };
  })()`;
}

/* 组装 ICO（PNG 内嵌格式，Vista+ 原生支持） */
function buildICO(entries){
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + 16 * entries.length;
  const dir = [];
  for (const e of entries){
    const d = Buffer.alloc(16);
    d[0] = e.size >= 256 ? 0 : e.size;
    d[1] = e.size >= 256 ? 0 : e.size;
    d[2] = 0; d[3] = 0;
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(e.buf.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += e.buf.length;
    dir.push(d);
  }
  return Buffer.concat([header, ...dir, ...entries.map(e => e.buf)]);
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  if (!fs.existsSync(SRC)){
    console.error("缺少源图：" + SRC);
    app.exit(1);
    return;
  }
  const ext = path.extname(SRC).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const dataURL = "data:" + mime + ";base64," + fs.readFileSync(SRC).toString("base64");

  const win = new BrowserWindow({ show: false, width: 320, height: 200, webPreferences: { offscreen: false } });
  await win.loadURL("data:text/html,<html><body></body></html>");

  const res = await win.webContents.executeJavaScript(pageScript(ICO_SIZES, PNG_SIZES, dataURL));

  const toBuf = d => Buffer.from(d.slice(d.indexOf(",") + 1), "base64");

  fs.mkdirSync(OUT, { recursive: true });

  const entries = res.ico.map(e => ({ size: e.size, buf: toBuf(e.data) }));
  const ico = buildICO(entries);
  fs.writeFileSync(path.join(OUT, "icon.ico"), ico);
  fs.writeFileSync(path.join(OUT, "icon.png"), entries[entries.length - 1].buf);

  for (const r of res.rnd){
    fs.writeFileSync(path.join(OUT, "logo-" + r.size + ".png"), toBuf(r.data));
  }

  console.log("icon.ico " + ico.length + " 字节 / " + entries.length + " 尺寸");
  console.log("icon.png " + entries[entries.length - 1].buf.length + " 字节");
  console.log("圆形 logo：" + res.rnd.map(r => r.size + "px").join(", "));

  win.destroy();
  app.quit();
});
