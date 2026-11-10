(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(900);
  const T = __TESTDIR__;
  const A = T, B = T + "\\第二卷";
  const r = {};

  // 1. 打开 A，把一个文件标成已修订
  await loadProject(vDir(A, "A卷"), null);
  await wait(300);
  r.aFiles = (state.project.files || []).map(f => f.path);
  await setFileStatus("第一章.md", true, { silent: true });
  await wait(200);
  r.aMarked = isRevised("第一章.md");
  r.aStatusKeys = Object.keys(statusMap());

  // 2. 切到 B
  await loadProject(vDir(B, "B卷"), null);
  await wait(300);
  r.bFiles = (state.project.files || []).map(f => f.path);
  r.bStatusKeys = Object.keys(statusMap());
  r.bHasA = isRevised("第一章.md");

  // 3. 切回 A —— 这里以前会丢
  await loadProject(vDir(A, "A卷"), null);
  await wait(300);
  r.backMarked = isRevised("第一章.md");
  r.backStatusKeys = Object.keys(statusMap());
  r.backRevisedCount = statusCounts().revised;

  // 4. 再切一次 B 再回来（连续切换）
  await loadProject(vDir(B, "B卷"), null);
  await wait(200);
  await loadProject(vDir(A, "A卷"), null);
  await wait(300);
  r.againMarked = isRevised("第一章.md");

  // 5. 落盘内容
  const saved = await window.nativeFS.getRevIndex();
  r.revIndexKeys = Object.keys(saved).length;
  r.savedHasFirst = Object.keys(saved).some(k => k.endsWith("第一章.md"));

  return JSON.stringify(r);
})()
