/* 重启后状态是否还原（依赖上一次运行写进 state.json 的 status） */
(async () => {
  const wait = ms => new Promise(x => setTimeout(x, ms));
  await wait(900);
  const rows = Array.from(document.querySelectorAll("#fileList .file-item")).map(b => ({
    name: (b.querySelector(".fname") || {}).textContent,
    stat: (b.querySelector(".fstat") || {}).textContent
  }));
  return JSON.stringify({
    currentPath: state.project.currentPath,
    status: JSON.parse(JSON.stringify(state.project.status || {})),
    rows,
    counts: {
      all: document.getElementById("stAll").textContent,
      draft: document.getElementById("stDraft").textContent,
      rev: document.getElementById("stRev").textContent
    },
    pill: (() => { const p = document.getElementById("statPill"); return { hidden: p.classList.contains("hide"), text: p.textContent }; })()
  });
})()
