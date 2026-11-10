/* 只加载项目并截图，供人工核对视觉效果 */
(async () => {
  const T = __TESTDIR__;
  await loadProject(vDir(T, "selftest"));
  await new Promise(r => setTimeout(r, 400));
  document.getElementById("sbTabs").classList.add("hide"); // 保留，不动
  document.getElementById("sbTabs").classList.remove("hide");
  await loadProject(vDir(T, "selftest"));   // 再载一次，确保是干净的初始态
  await new Promise(r => setTimeout(r, 400));
  return JSON.stringify({
    rows: Array.from(document.querySelectorAll("#fileList .dir-item, #fileList .file-item")).map(el => ({
      t: (el.querySelector(".dname, .fname") || {}).textContent,
      p: parseInt(el.style.paddingLeft)
    }))
  });
})()
