/* 编辑模式下看段落号：左源码、右预览（预览栏窄，段号应仍完整显示） */
(async () => {
  const r = {};
  const wait = ms => new Promise(x => setTimeout(x, ms));
  await wait(400);

  const lines = ["# 第一章 雾起", ""];
  for (let i = 1; i <= 32; i++) {
    lines.push("　　第 " + i + " 段。天色尚未亮透，河面上浮着一层薄薄的白雾，像是谁把整夜的梦都摊开晾在了水面上。", "");
  }
  loadContent(lines.join("\n"), "长文.md", null);
  await wait(600);

  const cb = document.getElementById("optParaNo");
  cb.checked = true;
  cb.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(400);
  setMode("edit");
  await wait(800);

  const prev = document.getElementById("preview");
  const pane = prev.parentElement;
  const base = pane.getBoundingClientRect().left;
  const pns = [...prev.querySelectorAll("[data-pn]")];

  r.edit = {
    mode: state.mode,
    paragraphs: pns.length,
    hidden: pns.filter(e => e.classList.contains("pn-off")).length,
    minGutter: pns.length ? Math.round(Math.min(...pns.map(e => e.getBoundingClientRect().left - base))) : -1,
    nums: pns.slice(0, 3).map(e => e.dataset.pn).join(","),
    wm: prev.querySelectorAll(".wm").length,
    wmFlat: prev.querySelectorAll(".wm.flat").length
  };

  const ed = document.getElementById("editor");
  ed.value = ed.value;   // 保持内容
  pane.scrollTop = 0;
  await wait(500);

  return JSON.stringify(r);
})()
