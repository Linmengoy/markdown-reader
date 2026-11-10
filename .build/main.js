/* Markdown 小说阅读器 — 桌面版主进程 */

// 若身处 ELECTRON_RUN_AS_NODE=1 的环境，require("electron") 只会返回 exe 路径，
// 应用会直接崩在 app.requestSingleInstanceLock 上。这里自动以正常模式重启一次。
if (process.env.ELECTRON_RUN_AS_NODE === "1"){
  try {
    const { spawn } = require("node:child_process");
    const env = Object.assign({}, process.env);
    delete env.ELECTRON_RUN_AS_NODE;
    spawn(process.execPath, process.argv.slice(1), { env, detached: true, stdio: "ignore" }).unref();
    process.exit(0);
  } catch {}
}

const { app, BrowserWindow, ipcMain, dialog, Menu, shell, clipboard, screen } = require("electron");

// 测试运行时把配置目录隔离开，避免覆盖用户真实的窗口位置与上次项目
if (process.env.MDNR_USERDATA) {
  try { app.setPath("userData", process.env.MDNR_USERDATA); } catch {}
}

const path = require("node:path");
const fs = require("node:fs/promises");
const fss = require("node:fs");

const MD_RE = /\.(md|markdown|mdtxt|txt)$/i;
const HTML = path.join(__dirname, "app", "markdown-novel-reader.html");
const IS_SMOKE = process.env.MDNR_SMOKE === "1";

let win = null;
let allowClose = false;
let pendingOpen = null;

const userDir = () => app.getPath("userData");
const statePath = () => path.join(userDir(), "state.json");
const configPath = () => path.join(userDir(), "config.json");

function readJSON(p, def){
  try { return JSON.parse(fss.readFileSync(p, "utf8")); } catch { return def; }
}
function writeJSON(p, o){
  try {
    fss.mkdirSync(path.dirname(p), { recursive: true });
    fss.writeFileSync(p, JSON.stringify(o, null, 2));
  } catch {}
}

function readState(){ return readJSON(statePath(), {}); }
function patchState(patch){
  const s = readState();
  Object.assign(s, patch);
  writeJSON(statePath(), s);
}

/* ---------------- 目录扫描 ---------------- */
const SKIP_DIRS = new Set(["node_modules", ".git", ".svn", ".idea", ".vscode", "$RECYCLE.BIN", "System Volume Information"]);

async function scanDir(root, prefix, depth, bucket){
  if (depth > 12 || bucket.length >= 20000) return bucket;
  let entries = [];
  try {
    entries = await fs.readdir(path.join(root, prefix), { withFileTypes: true });
  } catch { return bucket; }

  entries.sort((a, b) => a.name.localeCompare(b.name, "zh", { numeric: true }));

  for (const e of entries){
    if (e.name.startsWith(".")) continue;
    const rel = prefix ? prefix + "/" + e.name : e.name;
    if (e.isDirectory()){
      if (SKIP_DIRS.has(e.name)) continue;
      await scanDir(root, rel, depth + 1, bucket);
    } else if (MD_RE.test(e.name)){
      bucket.push({
        path: rel,
        name: e.name,
        full: path.join(root, rel),
        size: 0
      });
    }
  }
  return bucket;
}

/* ---------------- IPC ---------------- */
function registerIpc(){
  ipcMain.handle("fs:openFile", async () => {
    const r = await dialog.showOpenDialog(win, {
      title: "打开 Markdown / 文本",
      properties: ["openFile"],
      filters: [
        { name: "Markdown / 文本", extensions: ["md", "markdown", "mdtxt", "txt"] },
        { name: "所有文件", extensions: ["*"] }
      ]
    });
    if (r.canceled || !r.filePaths.length) return null;
    const p = r.filePaths[0];
    const content = await fs.readFile(p, "utf8");
    return { path: p, name: path.basename(p), content };
  });

  ipcMain.handle("fs:readFile", async (_e, p) => {
    return await fs.readFile(p, "utf8");
  });

  ipcMain.handle("fs:writeFile", async (_e, p, content) => {
    await fs.writeFile(p, content, "utf8");
    return true;
  });

  ipcMain.handle("fs:saveAs", async (_e, suggested, content) => {
    const r = await dialog.showSaveDialog(win, {
      title: "另存为",
      defaultPath: path.join(app.getPath("documents"), suggested || "novel.md"),
      filters: [{ name: "Markdown", extensions: ["md"] }, { name: "文本", extensions: ["txt"] }]
    });
    if (r.canceled || !r.filePath) return null;
    await fs.writeFile(r.filePath, content, "utf8");
    return { path: r.filePath, name: path.basename(r.filePath) };
  });

  ipcMain.handle("fs:openFolder", async () => {
    const r = await dialog.showOpenDialog(win, {
      title: "选择小说文件夹",
      properties: ["openDirectory"]
    });
    if (r.canceled || !r.filePaths.length) return null;
    const root = r.filePaths[0];
    return { root, name: path.basename(root) || root };
  });

  ipcMain.handle("fs:listDir", async (_e, root) => {
    const list = await scanDir(root, "", 0, []);
    return list;
  });

  ipcMain.handle("fs:exists", async (_e, p) => {
    try { await fs.access(p); return true; } catch { return false; }
  });

  ipcMain.handle("fs:isDir", async (_e, p) => {
    try { return (await fs.stat(p)).isDirectory(); } catch { return false; }
  });

  // 轻量探测文件是否被外部改动（AI 写入 / 其他编辑器保存）
  ipcMain.handle("fs:stat", async (_e, p) => {
    try {
      const s = await fs.stat(p);
      return { exists: true, mtimeMs: s.mtimeMs, size: s.size };
    } catch {
      return { exists: false, mtimeMs: 0, size: 0 };
    }
  });

  ipcMain.handle("fs:defaultPaths", async () => ({
    documents: app.getPath("documents"),
    downloads: app.getPath("downloads"),
    temp: app.getPath("temp")
  }));

  ipcMain.handle("state:getProject", async () => readState().project || null);

  // 项目状态按文件夹（root）各存一份。以前只存单个 project，切到另一个文件夹就把它覆盖了，
  // 回到原文件夹时「已修订 / 折叠 / 上次打开的文件」全丢。
  const projKey = (r) => String(r || "").replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

  ipcMain.handle("state:setProject", async (_e, o) => {
    const s = readState();
    const projects = (s.projects && typeof s.projects === "object") ? s.projects : {};
    const k = projKey(o && o.root);
    if (k) projects[k] = o;
    patchState({ project: o, projects });
    return true;
  });

  ipcMain.handle("state:getProjectByRoot", async (_e, root) => {
    const s = readState();
    const projects = s.projects || {};
    return projects[projKey(root)] || null;
  });

  // 「已修订」全局索引：key 是文件的绝对路径。
  // 状态绑在文件上而不是绑在「当前项目」上，换文件夹 / 换项目打开同一个文件也还认得。
  ipcMain.handle("state:getRevIndex", async () => {
    const r = readState().revs;
    return (r && typeof r === "object") ? r : {};
  });

  ipcMain.handle("state:mergeRevIndex", async (_e, obj) => {
    if (!obj || typeof obj !== "object") return false;
    const s = readState();
    const revs = (s.revs && typeof s.revs === "object") ? s.revs : {};
    let changed = false;
    for (const k of Object.keys(obj)){
      if (obj[k]){ if (revs[k] !== 1){ revs[k] = 1; changed = true; } }
      else if (k in revs){ delete revs[k]; changed = true; }
    }
    if (changed) patchState({ revs });
    return true;
  });

  // 阅读设置 + 我的配置：单独落一份 config.json，即使浏览器缓存被清也能还原
  ipcMain.handle("cfg:get", async () => ({ path: configPath(), data: readJSON(configPath(), null) }));
  ipcMain.handle("cfg:set", async (_e, o) => { writeJSON(configPath(), o || {}); return true; });
  ipcMain.handle("cfg:reveal", async () => { shell.showItemInFolder(configPath()); return configPath(); });

  // 复制全文：走主进程写系统剪贴板，避免 file:// 下 clipboard API 受限
  ipcMain.handle("app:copyText", async (_e, text) => {
    try { clipboard.writeText(String(text == null ? "" : text)); return true; }
    catch { return false; }
  });

  ipcMain.handle("app:reveal", async (_e, p) => { shell.showItemInFolder(p); });
  ipcMain.handle("app:close", async () => { allowClose = true; if (win) win.close(); });
  ipcMain.handle("app:info", async () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome
  }));

  // 渲染进程保存完毕 → 真正关窗
  ipcMain.on("app:close-ready", () => {
    allowClose = true;
    if (win && !win.isDestroyed()) win.close();
    else app.quit();
  });
}

/* ---------------- 窗口位置合法性（防止窗口开到屏幕外/只剩一条边） ---------------- */
const MIN_W = 760, MIN_H = 540;
const MIN_VISIBLE = 160 * 90;     // 至少要有这么大一块落在某个显示器上，否则视为「看不见」

function workAreas(){
  try { return screen.getAllDisplays().map(d => d.workArea); }
  catch { return []; }
}

function overlap(b, a){
  const w = Math.min(b.x + b.width, a.x + a.width) - Math.max(b.x, a.x);
  const h = Math.min(b.y + b.height, a.y + a.height) - Math.max(b.y, a.y);
  return (w > 0 && h > 0) ? w * h : 0;
}

function visibleArea(b, areas){
  let sum = 0;
  for (const a of areas) sum += overlap(b, a);
  return sum;
}

function primaryArea(){
  try { return screen.getPrimaryDisplay().workArea; }
  catch { return { x: 0, y: 0, width: 1440, height: 900 }; }
}

/* 记住的位置若已不在主屏可见范围（拔掉副屏、改分辨率、缩放变化），宁可不给坐标：
   主屏与副屏 DPI 不同时，跨屏 setBounds 会把窗口尺寸按 DPI 比例缩放（实测 900x600 → 450x300），
   坐标交给系统默认放置最安全，至少窗口一定看得见。 */
function safeBounds(saved){
  const wa = primaryArea();
  const width = Math.max(MIN_W, Math.min(saved && saved.width || 1280, Math.max(MIN_W, wa.width)));
  const height = Math.max(MIN_H, Math.min(saved && saved.height || 880, Math.max(MIN_H, wa.height)));

  if(!saved || typeof saved.x !== "number" || typeof saved.y !== "number"){
    return { width, height };   // 交给系统放置
  }
  const b = { x: Math.round(saved.x), y: Math.round(saved.y), width, height };
  // 必须主要落在主屏上：副屏上的位置一律放弃（跨屏移动有 DPI 缩放 bug，
  // 而且副屏常常是关着的，窗口开过去就等于「打不开」）
  if(overlap(b, wa) < Math.min(MIN_VISIBLE, width * height * 0.5)){
    return { width, height };
  }
  // 同一块屏内夹紧，保证标题栏整个露出来
  return {
    x: Math.round(Math.min(Math.max(b.x, wa.x), wa.x + wa.width - width)),
    y: Math.round(Math.min(Math.max(b.y, wa.y), wa.y + wa.height - height)),
    width, height
  };
}

/* 运行中窗口跑到看不见的地方时，只平移（center）不改变尺寸，避免 DPI 缩放 */
function ensureOnScreen(){
  if(!win || win.isDestroyed()) return;
  const b = win.getBounds();
  if(visibleArea(b, workAreas()) >= Math.min(MIN_VISIBLE, b.width * b.height * 0.5)) return;
  try { win.center(); } catch {}
}

/* ---------------- 窗口 ---------------- */
function createWindow(){
  const st = readState();
  const b = safeBounds(st.bounds);
  win = new BrowserWindow({
    width: b.width,
    height: b.height,
    x: b.x,
    y: b.y,
    minWidth: 720,
    minHeight: 520,
    show: false,
    backgroundColor: "#14161d",
    title: "Markdown 小说阅读器",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      devTools: !app.isPackaged
    }
  });

  Menu.setApplicationMenu(null);

  win.once("ready-to-show", () => {
    // 显示前再兜一次底：确保窗口落在可见区域内，而不是开到屏幕外
    ensureOnScreen();
    // 平滑滚动等合成动画在隐藏窗口里不会推进，测试时可强制显示
    if (!IS_SMOKE || process.env.MDNR_SHOW === "1") win.show();
    if (IS_SMOKE) {
      console.log("SMOKE_BOUNDS " + JSON.stringify(win.getBounds()));
      // 自检时把窗口位置落盘，方便在打包后的 exe 里核对（stdout 有时取不到）
      try {
        fss.writeFileSync(path.join(userDir(), "smoke-bounds.json"), JSON.stringify({
          bounds: win.getBounds(),
          displays: screen.getAllDisplays().map(d => ({ bounds: d.bounds, scale: d.scaleFactor }))
        }, null, 2));
      } catch {}
    }
  });

  // 副屏拔掉 / 分辨率、缩放变化后，把窗口拉回屏幕内
  ["display-removed", "display-added", "display-metrics-changed"].forEach(ev => {
    try { screen.on(ev, () => setTimeout(ensureOnScreen, 120)); } catch {}
  });

  win.loadFile(HTML);

  // 兜底：万一页面没能触发 ready-to-show，也别让进程在后台空转，
  // 否则用户双击图标既看不到窗口、又因为单实例锁「怎么也打不开」
  setTimeout(() => {
    if(IS_SMOKE || !win || win.isDestroyed() || win.isVisible()) return;
    try { ensureOnScreen(); win.show(); } catch {}
  }, 3500);

  if (IS_SMOKE){
    const testDir = path.join(app.getPath("temp"), "mdnr-selftest");
    try {
      fss.rmSync(testDir, { recursive: true, force: true });
    } catch {}
    fss.mkdirSync(path.join(testDir, "第一卷"), { recursive: true });
    fss.writeFileSync(path.join(testDir, "第一章.md"), "# 第一章\n夜色像墨。", "utf8");
    fss.writeFileSync(path.join(testDir, "第二章.md"), "# 第二章\n河灯顺流。", "utf8");
    fss.writeFileSync(path.join(testDir, "第一卷", "番外.md"), "# 番外\n那年冬天。", "utf8");
    fss.mkdirSync(path.join(testDir, "第一卷", "上卷"), { recursive: true });
    fss.writeFileSync(path.join(testDir, "第一卷", "上卷", "第三章.md"), "# 第三章\n雪落下来。", "utf8");
    fss.mkdirSync(path.join(testDir, "第二卷"), { recursive: true });
    fss.writeFileSync(path.join(testDir, "第二卷", "第四章.md"), "# 第四章\n春水初生。", "utf8");
    fss.writeFileSync(path.join(testDir, "忽略我.docx"), "x", "utf8");

    win.webContents.on("did-finish-load", async () => {
      setTimeout(async () => {
        try {
          // 传入 MDNR_SCRIPT 时只跑外部脚本（UI 回归测试用）
          const scriptFile = process.env.MDNR_SCRIPT;
          if (scriptFile && fss.existsSync(scriptFile)) {
            const code = fss.readFileSync(scriptFile, "utf8")
              .replace(/__TESTDIR__/g, JSON.stringify(testDir));
            const r = await win.webContents.executeJavaScript(code);
            console.log("SMOKE_SCRIPT " + JSON.stringify(r));
            // 便携版没有终端，console 看不到：同时落一份到 userData，方便打包后核对
            try { fss.writeFileSync(path.join(userDir(), "smoke-script.txt"), String(r), "utf8"); } catch (e) {}
            // 自检辅助：把系统剪贴板内容落一份文件，便于验证「复制」类功能
            if (process.env.MDNR_CLIP === "1"){
              try { fss.writeFileSync(path.join(userDir(), "clip.txt"), clipboard.readText(), "utf8"); } catch (e) {}
            }
          } else {
            const probe = await win.webContents.executeJavaScript(`(async function(){
              const T = ${JSON.stringify(testDir)};
              const r = { hasNative: !!window.nativeFS,
                          isDesktop: (typeof IS_DESKTOP !== "undefined") ? IS_DESKTOP : null,
                          title: document.title };
              try { r.info = await window.nativeFS.info(); } catch (e) { r.infoErr = e.message; }
              try {
                const list = await window.nativeFS.listDir(T);
                r.files = list.map(f => f.path);
              } catch (e) { r.listErr = e.message; }
              try {
                r.read = await window.nativeFS.readFile(T + "/第一章.md");
                await window.nativeFS.writeFile(T + "/第一章.md", "# 第一章\\n改过的内容。");
                r.edited = await window.nativeFS.readFile(T + "/第一章.md");
              } catch (e) { r.ioErr = e.message; }
              try { r.isDir = await window.nativeFS.isDir(T); } catch (e) { r.dirErr = e.message; }
              try {
                await window.nativeFS.setProject({ root: T, name: "selftest", currentPath: "第一章.md" });
                r.project = await window.nativeFS.getProject();
              } catch (e) { r.stateErr = e.message; }

              try {
                await loadProject(vDir(T, "selftest"));
                r.projectFiles = state.project.files.map(f => f.path);
                r.currentFile = state.fileName;
                r.loadedText = (state.content || "").slice(0, 20);
              } catch (e) { r.loadErr = e.message; }

              try {
                state.content = "# 第一章\\n经由编辑器保存。";
                state.dirty = true;
                await saveFile(false);
                r.savedToDisk = await window.nativeFS.readFile(state.handle.__native);
              } catch (e) { r.saveErr = e.message; }

              r.chars = (document.querySelector("#stChars") || {}).textContent || "";
              return JSON.stringify(r);
            })()`);
            console.log("SMOKE_PROBE " + probe);
          }
          const img = await win.webContents.capturePage();
          const shot = process.env.MDNR_SHOT || path.join(app.getPath("temp"), "mdnr-smoke.png");
          fss.writeFileSync(shot, img.toPNG());
          console.log("SMOKE_SHOT " + shot);
        } catch (e) {
          console.log("SMOKE_FAIL " + e.message);
          try { fss.writeFileSync(path.join(userDir(), "smoke-error.txt"), String((e && e.stack) || e), "utf8"); } catch (e2) {}
        }
        allowClose = true;
        app.quit();
      }, 2400);
    });
  }

  win.on("resize", saveBounds);
  win.on("move", saveBounds);
  win.on("close", (e) => {
    saveBounds();
    if (!allowClose){
      e.preventDefault();
      win.webContents.send("app:willClose");
      // 兜底：渲染进程 1.5s 内没响应就强制关闭，避免窗口关不掉
      setTimeout(() => {
        if (!allowClose){ allowClose = true; if (win && !win.isDestroyed()) win.close(); }
      }, 1500);
    }
  });
  win.on("closed", () => { win = null; });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
}

let boundsTimer = null;
function saveBounds(){
  if (!win || win.isDestroyed()) return;
  clearTimeout(boundsTimer);
  boundsTimer = setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    const b = win.getBounds();
    patchState({ bounds: b });
  }, 500);
}

/* ---------------- 单实例 / 命令行打开 ---------------- */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock){
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    if (win){
      // 旧窗口若跑到了屏幕外（副屏被拔掉等），先拉回来再聚焦，
      // 否则用户双击图标只会「唤起一个看不见的窗口」，看起来就是打不开
      ensureOnScreen();
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      const file = pickFileArg(argv);
      if (file) win.webContents.send("app:openPath", file);
    }
  });

  app.whenReady().then(() => {
    registerIpc();
    createWindow();
    const file = pickFileArg(process.argv);
    if (file && win){
      win.webContents.once("did-finish-load", () => {
        setTimeout(() => win.webContents.send("app:openPath", file), 400);
      });
    }
  });

  app.on("window-all-closed", () => { allowClose = true; app.quit(); });
}

function pickFileArg(argv){
  if (!Array.isArray(argv)) return null;
  for (const a of argv.slice(1)){
    if (!a || a.startsWith("-")) continue;
    if (MD_RE.test(a) && fss.existsSync(a)) return path.resolve(a);
  }
  return null;
}
