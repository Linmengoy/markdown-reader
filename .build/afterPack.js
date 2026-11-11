/* 打包后置处理：写入 exe 图标与版本信息（改用直接调用 rcedit，绕开 builder 内建步骤的失败） */
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

function findRcedit(){
  const cache = path.join(process.env.LOCALAPPDATA || "", "electron-builder", "Cache", "winCodeSign");
  const candidates = [
    path.join(cache, "winCodeSign-2.6.0", "rcedit-x64.exe"),
    path.join(cache, "winCodeSign-2.6.0", "rcedit.exe")
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function runRcedit(rcedit, args){
  let lastErr = null;
  for (let i = 0; i < 5; i++){
    try {
      execFileSync(rcedit, args, { stdio: "pipe" });
      return true;
    } catch (e) {
      lastErr = e;
      // 刚写出的 exe 常被杀软/索引服务短暂占用，等一会儿再试
      await sleep(1500);
    }
  }
  throw lastErr;
}

exports.default = async function(context){
  // CI 里改由 electron-builder 内建的 rcedit 写入，这里跳过以免重复写同一个 exe
  if (process.env.MDNR_SKIP_AFTERPACK === "1"){
    console.log("[afterPack] MDNR_SKIP_AFTERPACK=1，跳过");
    return;
  }
  // 只处理 Windows exe 的版本信息与图标；macOS 的图标由 icns 决定
  if (context.electronPlatformName !== "win32"){
    console.log("[afterPack] 非 Windows 目标，跳过");
    return;
  }
  const { appOutDir, packager } = context;
  const exeName = packager.appInfo.productFilename + ".exe";
  const exePath = path.join(appOutDir, exeName);
  const iconPath = path.join(__dirname, "build", "icon.ico");

  if (!fs.existsSync(exePath)){
    console.log("[afterPack] 跳过：找不到 " + exePath);
    return;
  }

  const rcedit = findRcedit();
  if (!rcedit){
    console.log("[afterPack] 跳过：找不到 rcedit");
    return;
  }

  await sleep(2000);

  const appInfo = packager.appInfo;
  const args = [
    exePath,
    "--set-version-string", "FileDescription", appInfo.productName || "Markdown 小说阅读器",
    "--set-version-string", "ProductName", appInfo.productName || "Markdown 小说阅读器",
    "--set-version-string", "CompanyName", appInfo.companyName || "local",
    "--set-version-string", "LegalCopyright", "Copyright (c) 2026",
    "--set-file-version", appInfo.version,
    "--set-product-version", appInfo.version
  ];
  if (fs.existsSync(iconPath)) args.push("--set-icon", iconPath);

  try {
    await runRcedit(rcedit, args);
    console.log("[afterPack] 图标与版本信息已写入 " + exeName);
    // 给 build.sh 留个记号：这一步成功了，别在外面再重复写一遍
    // （刚写完的 exe 句柄还没释放，重复写反而容易失败）
    try { fs.writeFileSync(path.join(appOutDir, "..", ".rcedit-ok"), appInfo.version); } catch {}
  } catch (e) {
    console.log("[afterPack] rcedit 失败：" + (e.message || e));
  }
};
