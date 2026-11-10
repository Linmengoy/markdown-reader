(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(900);
  const T = __TESTDIR__;
  const r = {};

  // 重启后：直接打开 A，看「已修订」是否还在（用户报的就是这个场景）
  await loadProject(vDir(T, "A卷"), null);
  await wait(300);
  r.afterRestart = isRevised("第一章.md");
  r.revisedCount = statusCounts().revised;

  // 抹掉项目级记录，只留全局文件索引 —— 验证「状态绑文件」
  try{
    await window.nativeFS.setProject({ root: T, name: "A卷", currentPath: "", collapsed: [], status: {}, ts: Date.now() });
  }catch(e){ r.clearErr = e.message; }
  revIndexLoaded = false;
  revIndex = {};
  await loadProject(vDir(T, "A卷"), null);
  await wait(300);
  r.fromFileIndexOnly = isRevised("第一章.md");

  return JSON.stringify(r);
})()
