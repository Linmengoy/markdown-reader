/* 在真实 Electron 环境里验证「草稿 / 已修订」：标记、计数、筛选、持久化、快捷键 */
(async () => {
  const T = __TESTDIR__;
  const r = { steps: [] };
  const wait = ms => new Promise(x => setTimeout(x, ms));
  const rows = () => Array.from(document.querySelectorAll("#fileList .file-item"));
  const rowOf = name => rows().find(b => (b.querySelector(".fname") || {}).textContent === name);
  const chipOf = name => rowOf(name) && rowOf(name).querySelector(".fstat");
  const counts = () => ({
    all: document.getElementById("stAll").textContent,
    draft: document.getElementById("stDraft").textContent,
    rev: document.getElementById("stRev").textContent
  });
  const pill = () => {
    const p = document.getElementById("statPill");
    return { hidden: p.classList.contains("hide"), text: p.textContent, rev: p.classList.contains("rev") };
  };
  const chips = () => rows().map(b => ({
    name: (b.querySelector(".fname") || {}).textContent,
    stat: (b.querySelector(".fstat") || {}).textContent,
    rev: (b.querySelector(".fstat") || { classList: { contains: () => false } }).classList.contains("rev")
  }));

  await loadProject(vDir(T, "selftest"));
  await wait(400);

  r.initial = { chips: chips(), counts: counts(), pill: pill(), barHidden: document.getElementById("statBar").classList.contains("hide") };

  // 1) 点文件行右侧的状态标 → 直接改成已修订（不应打开该文件）
  const beforeOpen = state.fileName;
  chipOf("第二章").click();
  await wait(250);
  r.afterChipClick = {
    chips: chips(), counts: counts(),
    stillSameFile: state.fileName === beforeOpen,
    stored: JSON.parse(JSON.stringify(state.project.status))
  };

  // 2) 打开「第二章」→ 顶栏小标应显示已修订
  rowOf("第二章").click();
  await wait(400);
  r.afterOpenRevised = { pill: pill(), currentPath: state.project.currentPath };

  // 3) 点顶栏小标切回草稿
  document.getElementById("statPill").click();
  await wait(250);
  r.afterPillToggle = { pill: pill(), counts: counts(), chip: chipOf("第二章").textContent };

  // 4) 再标两个，验证计数与筛选
  chipOf("第四章").click();
  await wait(200);
  chipOf("番外").click();
  await wait(250);
  r.afterMulti = { counts: counts(), stored: JSON.parse(JSON.stringify(state.project.status)) };

  const bar = document.getElementById("statBar");
  bar.querySelector('button[data-st="revised"]').click();
  await wait(200);
  r.revisedFilter = { rows: rows().map(b => b.querySelector(".fname").textContent), empty: !!document.querySelector("#fileList .toc-empty") };

  bar.querySelector('button[data-st="draft"]').click();
  await wait(200);
  r.draftFilter = { rows: rows().map(b => b.querySelector(".fname").textContent) };

  bar.querySelector('button[data-st="all"]').click();
  await wait(200);

  // 5) 快捷键：当前文件（第二章）Ctrl+Shift+D 标为已修订
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "d", ctrlKey: true, shiftKey: true, bubbles: true }));
  await wait(250);
  r.shortcut = { pill: pill(), counts: counts() };

  // 6) 落盘检查
  try { r.persisted = await window.nativeFS.getProject(); } catch (e) { r.persistErr = e.message; }

  // 7) 目录计数跟着筛选走吗
  bar.querySelector('button[data-st="revised"]').click();
  await wait(200);
  r.dirCountsOnFilter = Array.from(document.querySelectorAll("#fileList .dir-item")).map(b => ({
    name: b.querySelector(".dname").textContent, n: b.querySelector(".dcount").textContent
  }));
  bar.querySelector('button[data-st="all"]').click();
  await wait(150);

  return JSON.stringify(r);
})()
