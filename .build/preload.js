/* Markdown 小说阅读器 — 预加载桥接层 */
const { contextBridge, ipcRenderer, webUtils } = require("electron");

function listen(channel){
  const subs = [];
  ipcRenderer.on(channel, (_e, arg) => { for (const fn of subs) { try { fn(arg); } catch {} } });
  return (fn) => subs.push(fn);
}

const api = {
  available: true,
  platform: process.platform,
  version: process.versions.electron,

  openFile:      () => ipcRenderer.invoke("fs:openFile"),
  readFile:      (p) => ipcRenderer.invoke("fs:readFile", p),
  writeFile:     (p, c) => ipcRenderer.invoke("fs:writeFile", p, c),
  saveAs:        (name, c) => ipcRenderer.invoke("fs:saveAs", name, c),
  openFolder:    () => ipcRenderer.invoke("fs:openFolder"),
  listDir:       (root) => ipcRenderer.invoke("fs:listDir", root),
  exists:        (p) => ipcRenderer.invoke("fs:exists", p),
  isDir:         (p) => ipcRenderer.invoke("fs:isDir", p),
  statFile:      (p) => ipcRenderer.invoke("fs:stat", p),
  defaultPaths:  () => ipcRenderer.invoke("fs:defaultPaths"),

  getProject:    () => ipcRenderer.invoke("state:getProject"),
  setProject:    (o) => ipcRenderer.invoke("state:setProject", o),
  getProjectByRoot: (root) => ipcRenderer.invoke("state:getProjectByRoot", root),
  getRevIndex:   () => ipcRenderer.invoke("state:getRevIndex"),
  mergeRevIndex: (o) => ipcRenderer.invoke("state:mergeRevIndex", o),

  getConfig:     () => ipcRenderer.invoke("cfg:get"),
  setConfig:     (o) => ipcRenderer.invoke("cfg:set", o),
  revealConfig:  () => ipcRenderer.invoke("cfg:reveal"),

  reveal:        (p) => ipcRenderer.invoke("app:reveal", p),
  copyText:      (t) => ipcRenderer.invoke("app:copyText", t),
  info:          () => ipcRenderer.invoke("app:info"),
  close:         () => ipcRenderer.invoke("app:close"),
  closeReady:    () => ipcRenderer.send("app:close-ready"),

  // 拖拽文件时取真实磁盘路径（Electron 32+ 需要 webUtils）
  pathForFile: (file) => {
    try { return webUtils.getPathForFile(file); } catch { return ""; }
  },

  onOpenPath: listen("app:openPath"),
  onWillClose: listen("app:willClose")
};

contextBridge.exposeInMainWorld("nativeFS", api);
