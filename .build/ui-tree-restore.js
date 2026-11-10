/* 验证重启后项目树折叠状态是否还原 */
(async () => {
  await new Promise(r => setTimeout(r, 900));
  const dirs = Array.from(document.querySelectorAll("#fileList .dir-item"));
  return JSON.stringify({
    files: state.project.files.length,
    collapsed: Array.from(state.project.collapsed || []),
    tree: dirs.map(b => ({
      name: b.querySelector(".dname").textContent,
      open: b.classList.contains("open")
    })),
    shownFiles: Array.from(document.querySelectorAll("#fileList .file-item .fname")).map(e => e.textContent)
  });
})()
