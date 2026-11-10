(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(900);
  const T = __TESTDIR__;
  const r = {};

  await loadProject(vDir(T, "A卷"), null);
  await wait(500);
  r.before = (state.project.files || []).length;

  // AI 在文件夹里新建一个章节文件
  await NATIVE.writeFile(T + "\\新章节.md", "# 新章节\n\n这一段是 AI 新建的。\n");
  await wait(200);
  document.getElementById("btnReload").click();
  await wait(900);
  r.after = (state.project.files || []).length;
  r.grew = r.after === r.before + 1;
  r.hasNew = (state.project.files || []).some(f => f.path === "新章节.md");
  r.domHasNew = [...document.querySelectorAll("#fileList .file-item")].some(e => e.textContent.includes("新章节"));

  // 已修订标记不该因为刷新而丢
  await setFileStatus("第二章.md", true, { silent: true });
  await wait(200);
  document.getElementById("btnReload").click();
  await wait(900);
  r.keptRevised = isRevised("第二章.md");

  return JSON.stringify(r);
})()
