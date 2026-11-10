/* 在真实 Electron 环境里验证项目文件树：层级、折叠、自动展开、过滤 */
(async () => {
  const T = __TESTDIR__;
  const r = { steps: [] };
  const wait = ms => new Promise(x => setTimeout(x, ms));
  const list = () => Array.from(document.querySelectorAll("#fileList .dir-item, #fileList .file-item"));

  await loadProject(vDir(T, "selftest"));
  await wait(400);

  const snap = () => list().map(el => {
    const dir = el.classList.contains("dir-item");
    return {
      kind: dir ? "D" : "F",
      name: (el.querySelector(".dname, .fname") || {}).textContent || "",
      count: dir ? (el.querySelector(".dcount") || {}).textContent : null,
      pad: parseInt(el.style.paddingLeft) || 0,
      open: dir ? el.classList.contains("open") : null
    };
  });

  r.steps.push({ step: "初始树", tree: snap() });

  // 1) 折叠「第一卷」→ 子项消失
  const vol1 = Array.from(document.querySelectorAll("#fileList .dir-item"))
    .find(b => b.querySelector(".dname").textContent === "第一卷");
  vol1.click();
  await wait(120);
  r.steps.push({ step: "折叠第一卷", tree: snap() });

  // 2) 展开回来
  Array.from(document.querySelectorAll("#fileList .dir-item"))
    .find(b => b.querySelector(".dname").textContent === "第一卷").click();
  await wait(120);
  r.steps.push({ step: "再展开", tree: snap() });

  // 3) 折叠后打开深层文件，应自动展开祖先
  Array.from(document.querySelectorAll("#fileList .dir-item"))
    .find(b => b.querySelector(".dname").textContent === "第一卷").click();
  await wait(100);
  const deep = state.project.files.find(f => f.path === "第一卷/上卷/第三章.md");
  await openProjectFile(deep, true);
  await wait(300);
  r.autoExpand = {
    openDirs: Array.from(document.querySelectorAll("#fileList .dir-item.open"))
      .map(b => b.querySelector(".dname").textContent),
    activeName: (document.querySelector("#fileList .file-item.active .fname") || {}).textContent || "",
    currentPath: state.project.currentPath
  };

  // 4) 过滤：输入「番外」只留命中项与祖先目录
  const filter = document.getElementById("fileFilter");
  filter.value = "番外";
  renderFileList();
  await wait(80);
  r.filtered = snap();
  filter.value = "";
  renderFileList();
  await wait(80);

  // 5) 缩进层级检查
  const pads = {};
  for (const el of list()){
    const n = (el.querySelector(".dname, .fname") || {}).textContent || "";
    pads[n] = parseInt(el.style.paddingLeft) || 0;
  }
  r.pads = pads;

  // 6) 折叠状态应写进项目记录，重启后能还原
  await loadProject(vDir(T, "selftest"));
  await wait(300);
  const vol = Array.from(document.querySelectorAll("#fileList .dir-item"))
    .find(b => b.querySelector(".dname").textContent === "第一卷");
  vol.click();
  await wait(750);
  r.savedMap = await window.nativeFS.getProject();

  // 7) 浏览器 webkitdirectory 场景：path 带根目录名，树里应剥掉
  const fake = ["我的小说/第一章.md", "我的小说/第一卷/第二章.md", "我的小说/第一卷/上卷/第三章.md"]
    .map(p => ({ path: p, name: p.split("/").pop(), handle: null }));
  state.project = {
    handle: null, name: "我的小说", files: fake,
    currentPath: "我的小说/第一卷/上卷/第三章.md", fromFiles: true, collapsed: new Set()
  };
  filter.value = "";
  renderFileList();
  await wait(80);
  r.browserTree = snap();

  return JSON.stringify(r);
})()
