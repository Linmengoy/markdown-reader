(async function(){
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(900);
  const r = {};
  const P = await window.nativeFS.defaultPaths();
  const f0 = P.temp.replace(/\\/g, "/") + "/mdnr-autosave-a.md";
  const f1 = P.temp.replace(/\\/g, "/") + "/mdnr-autosave-b.md";
  r.files = [f0, f1];

  const read = p => window.nativeFS.readFile(p).catch(() => "<读取失败>");
  const st = () => document.getElementById("stSave").textContent;

  await window.nativeFS.writeFile(f0, "# 原稿\n\n第一段原样。\n");
  await window.nativeFS.writeFile(f1, "# 另一个文件\n\n这是另一个文件。\n");

  loadContent(await read(f0), "mdnr-autosave-a.md", vFile(f0, "mdnr-autosave-a.md"));
  setMode("edit");
  await wait(400);
  r.before = { dirty: state.dirty, st: st() };

  const ed = document.getElementById("editor");
  const type = (s) => { ed.value += s; ed.dispatchEvent(new Event("input", { bubbles: true })); };

  // 1) 打字后停顿：应自动写盘
  type("　　第一段，慢慢打完。\n");
  await wait(300);
  r.typing = { dirty: state.dirty, st: st() };
  await wait(1200);
  r.afterPause = { dirty: state.dirty, st: st(), disk: await read(f0) };

  // 2) 打完立刻切文件（走真实流程：beforeSwitch）
  type("　　第二段，刚打完就切文件。\n");
  await wait(50);
  await beforeSwitch();
  loadContent(await read(f1), "mdnr-autosave-b.md", vFile(f1, "mdnr-autosave-b.md"));
  await wait(300);
  r.switchDisk = await read(f0);

  // 3) 打完立刻切模式：应写盘
  loadContent(await read(f0), "mdnr-autosave-a.md", vFile(f0, "mdnr-autosave-a.md"));
  await wait(250);
  type("　　第三段，打完立刻切阅读。\n");
  await wait(50);
  setMode("read");
  await wait(500);
  r.modeDisk = await read(f0);
  r.modeSt = st();

  // 4) 窗口失焦：应写盘
  setMode("edit");
  await wait(300);
  type("　　第四段，打完切去别的窗口。\n");
  await wait(50);
  window.dispatchEvent(new Event("blur"));
  await wait(400);
  r.blurDisk = await read(f0);

  // 5) 关掉自动保存：只打字不切文件，不应写盘
  settings.autoSave = false; saveSettings(); updateStats();
  type("　　第五段，自动保存已关。\n");
  await wait(1600);
  r.offNoWrite = { disk: await read(f0), st: st(), dirty: state.dirty };
  settings.autoSave = true; saveSettings();
  await autoSaveNow();
  r.onAgain = { disk: await read(f0), st: st(), dirty: state.dirty };

  // 6) 设置面板里的勾选框与状态一致
  document.getElementById("btnSettings").click();
  await wait(250);
  r.checkbox = document.getElementById("optAutoSave").checked;
  document.getElementById("closeSettings").click();

  return JSON.stringify(r);
})()
