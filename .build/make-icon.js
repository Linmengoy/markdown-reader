/* 从 assets/logo.jpg 生成应用图标
 *   build/icon.ico     多尺寸，BMP(DIB) 内嵌 —— 必须用 BMP：Windows Shell 只认 256×256 的 PNG 压缩图标，
 *                      小尺寸若用 PNG，会导致整组图标解析失败、资源管理器退回「通用程序」图标
 *   build/icon.png     256px PNG，供预览 / electron-builder 备用
 *   build/logo-64.png  圆形 PNG，供界面顶栏内嵌
 *   build/logo-128.png 同上，2x 备用
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
const ICON_PNG = 1024;  // electron-builder 生成 macOS icns 要求 ≥512，1024 最稳
const CROP = 0.13;      // 源图四周留白多，裁掉让主体更饱满
const RADIUS = 0.225;   // 圆角半径占边长比例

function pageScript(dataURL, sizes, pngSizes, crop, radius, iconPng){
  return `(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(dataURL)};
    await img.decode();
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const c = ${crop};
    const sx = sw * c, sy = sh * c, ss = sw * (1 - c * 2);

    function paint(size, mask){
      const cv = document.createElement("canvas");
      cv.width = cv.height = size;
      const g = cv.getContext("2d");
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      g.beginPath();
      if (mask === "circle") g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      else {
        const r = size * ${radius};
        g.roundRect ? g.roundRect(0, 0, size, size, r) : g.rect(0, 0, size, size);
      }
      g.closePath();
      g.clip();
      g.drawImage(img, sx, sy, ss, ss, 0, 0, size, size);
      return cv;
    }
    const b64 = bytes => {
      let bin = "";
      const CH = 0x8000;
      for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
      return btoa(bin);
    };

    // BMP(DIB) 图标数据：BITMAPINFOHEADER + 自下而上 BGRA + AND 掩码(全 0，形状由 alpha 决定)
    function dib(size){
      const cv = paint(size, "rounded");
      const px = cv.getContext("2d").getImageData(0, 0, size, size).data;
      const xorLen = size * 4 * size;
      const maskRow = Math.ceil(size / 32) * 4;
      const maskLen = maskRow * size;
      const buf = new Uint8Array(40 + xorLen + maskLen);
      const dv = new DataView(buf.buffer);
      dv.setUint32(0, 40, true);
      dv.setInt32(4, size, true);
      dv.setInt32(8, size * 2, true);
      dv.setUint16(12, 1, true);
      dv.setUint16(14, 32, true);
      dv.setUint32(16, 0, true);
      dv.setUint32(20, xorLen, true);
      let o = 40;
      for (let y = size - 1; y >= 0; y--){
        for (let x = 0; x < size; x++){
          const i = (y * size + x) * 4;
          buf[o++] = px[i + 2];
          buf[o++] = px[i + 1];
          buf[o++] = px[i];
          buf[o++] = px[i + 3];
        }
      }
      return b64(buf);
    }

    const dibs = ${JSON.stringify(sizes)}.map(s => ({ size: s, b64: dib(s) }));
    const pngIcon = paint(${iconPng}, "rounded").toDataURL("image/png").split(",")[1];
    const circles = ${JSON.stringify(pngSizes)}.map(s => ({ size: s, b64: paint(s, "circle").toDataURL("image/png").split(",")[1] }));
    return { dibs, pngIcon, circles };
  })()`;
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

  const win = new BrowserWindow({ show: false, width: 320, height: 200 });
  await win.loadURL("data:text/html,<body></body>");
  const res = await win.webContents.executeJavaScript(pageScript(dataURL, ICO_SIZES, PNG_SIZES, CROP, RADIUS, ICON_PNG));
  fs.mkdirSync(OUT, { recursive: true });

  /* 组装 ICO */
  const items = res.dibs.map(d => ({ size: d.size, buf: Buffer.from(d.b64, "base64") }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(items.length, 4);
  let offset = 6 + 16 * items.length;
  const dir = [];
  for (const it of items){
    const d = Buffer.alloc(16);
    d[0] = it.size >= 256 ? 0 : it.size;
    d[1] = it.size >= 256 ? 0 : it.size;
    d[2] = 0; d[3] = 0;
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(it.buf.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += it.buf.length;
    dir.push(d);
  }
  const ico = Buffer.concat([header, ...dir, ...items.map(i => i.buf)]);
  fs.writeFileSync(path.join(OUT, "icon.ico"), ico);
  fs.writeFileSync(path.join(OUT, "icon.png"), Buffer.from(res.pngIcon, "base64"));
  for (const c of res.circles) fs.writeFileSync(path.join(OUT, "logo-" + c.size + ".png"), Buffer.from(c.b64, "base64"));

  console.log("icon.ico " + (ico.length / 1024).toFixed(0) + " KB / " + items.length + " 尺寸（BMP 内嵌）");
  console.log("icon.png " + ICON_PNG + "px（Windows 备用 + macOS icns 源）/ 圆形 logo：" + res.circles.map(c => c.size + "px").join(", "));

  win.destroy();
  app.quit();
});
