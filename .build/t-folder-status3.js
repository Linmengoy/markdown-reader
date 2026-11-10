(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(900);
  const T = __TESTDIR__, B = T + "\\第二卷";
  const r = {};

  await loadProject(vDir(T, "A卷"), null);
  await wait(300);
  r.before = isRevised("第一章.md");

  // 改回草稿
  await setFileStatus("第一章.md", false, { silent: true });
  await wait(200);
  r.afterUnmark = isRevised("第一章.md");

  // 切走再回来
  await loadProject(vDir(B, "B卷"), null);
  await wait(200);
  await loadProject(vDir(T, "A卷"), null);
  await wait(300);
  r.backStillDraft = !isRevised("第一章.md");
  r.revisedCount = statusCounts().revised;

  // 索引里应该已经清掉
  const saved = await window.nativeFS.getRevIndex();
  r.indexCleared = !Object.keys(saved).some(k => k.endsWith("第一章.md"));

  // 反向：再标记一次，切走再回来，仍为已修订
  await setFileStatus("第二章.md", true, { silent: true });
  await loadProject(vDir(B, "B卷"), null);
  await wait(200);
  await loadProject(vDir(T, "A卷"), null);
  await wait(300);
  r.secondFileKept = isRevised("第二章.md");
  r.totalRevised = statusCounts().revised;

  return JSON.stringify(r);
})()
