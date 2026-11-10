(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const bar = () => document.getElementById("extBar").classList.contains("show");
  await wait(900);
  const T = __TESTDIR__;
  const F = T + "\\第一章.md";
  const r = {};

  // 1. 打开文件，建立基线
  loadContent(await NATIVE.readFile(F), "第一章.md", vFile(F, "第一章.md"));
  await wait(400);
  r.baseStamp = !!diskStamp;
  r.baseText = state.content.trim().slice(0, 8);

  // 2. 没有本地改动时，外部写入 → 应自动载入
  await NATIVE.writeFile(F, "# 第一章\n夜色像墨，AI 从外部重写了这一段。");
  await wait(2600);
  r.autoPicked = state.content.includes("AI 从外部重写了这一段");
  r.autoDirty = state.dirty;
  r.autoNoBar = !bar();

  // 3. 有本地未保存改动时，外部写入 → 应停下来问，且不覆盖磁盘
  $("#editor").value = state.content + "\n\n我这边又加了一句。";
  onEditorInput();
  await wait(60);
  r.localDirty = state.dirty;
  await NATIVE.writeFile(F, "# 第一章\nAI 第二次改。");
  await wait(2600);
  r.conflictBar = bar();
  r.localKeptInMemory = state.content.includes("我这边又加了一句");
  r.diskKeptAI = (await NATIVE.readFile(F)).includes("AI 第二次改");

  // 4. 选「载入磁盘版本」
  document.getElementById("extTakeDisk").click();
  await wait(600);
  r.tookDisk = state.content.includes("AI 第二次改");
  r.barAfterTake = bar();
  r.dirtyAfterTake = state.dirty;

  // 5. 再测「保留我的改动」
  $("#editor").value = state.content + "\n\n我坚持这么写。";
  onEditorInput();
  await wait(60);
  await NATIVE.writeFile(F, "# 第一章\nAI 第三次改。");
  await wait(2600);
  r.conflict2 = bar();
  document.getElementById("extKeepMine").click();
  await wait(900);
  const afterKeep = await NATIVE.readFile(F);
  r.keepMineWrote = afterKeep.includes("我坚持这么写");
  r.barAfterKeep = bar();

  // 6. 手动刷新按钮：外部改完后点刷新
  await NATIVE.writeFile(F, "# 第一章\n第四次，外部写入。");
  await wait(150);
  document.getElementById("btnReload").click();
  await wait(600);
  r.manualReload = state.content.includes("第四次，外部写入");

  // 7. 刷新不应把内容清空、也不该残留提示条
  r.stillHasTitle = state.content.startsWith("# 第一章");
  r.finalBar = bar();
  r.revisedNoErr = true;

  return JSON.stringify(r);
})()
