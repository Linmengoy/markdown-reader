/* 编辑模式跳转 + 滚动联动测试 */
(async () => {
  const parts = ["# 长夜将至"];
  for (let i = 1; i <= 120; i++){
    parts.push("");
    parts.push("　　夜色像一层薄薄的墨，慢慢渗进窗棂。他坐在桌前，听见远处传来第" + i +
      "声更鼓，心里忽然空了一下。风从窗缝里钻进来，吹得灯芯微微一晃，把墙上的影子拉得很长很长。");
  }
  loadContent(parts.join("\n"), "长夜将至.md", null);
  await new Promise(r => setTimeout(r, 400));

  const out = {};
  const items = Array.from(document.querySelectorAll("#wmList .wm-item"));

  /* ---- 1. 编辑模式下点导航，应滚动预览区 ---- */
  setMode("edit");
  await new Promise(r => setTimeout(r, 400));

  const pane = document.querySelector("#preview").closest(".pane");
  const btn = items[1];
  const n = btn.dataset.n;
  const markInPreview = document.querySelector('#preview .wm[data-n="' + n + '"]');
  const line = markInPreview.closest("p") || markInPreview;

  out.editBeforeTop = Math.round(line.getBoundingClientRect().top - pane.getBoundingClientRect().top);
  btn.click();
  await new Promise(r => setTimeout(r, 1000));
  out.editAfterScrollTop = Math.round(pane.scrollTop);
  out.editAfterLineTop = Math.round(line.getBoundingClientRect().top - pane.getBoundingClientRect().top);
  out.editActive = (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none";

  /* ---- 2. 回阅读模式，滚动时导航自动联动 ---- */
  setMode("read");
  await new Promise(r => setTimeout(r, 400));
  const main = document.getElementById("main");

  function scrollToFraction(f){
    main.scrollTop = Math.round((main.scrollHeight - main.clientHeight) * f);
    updateProgress();
    return (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none";
  }

  out.atTop = scrollToFraction(0);
  out.at25 = scrollToFraction(0.25);
  out.at50 = scrollToFraction(0.5);
  out.at95 = scrollToFraction(0.95);
  out.atBottom = scrollToFraction(1);

  /* ---- 3. 导航长时高亮项是否在导航可视区 ---- */
  const activeBtn = document.querySelector("#wmList .wm-item.active");
  const navBox = document.getElementById("wmNav");
  if (activeBtn){
    const a = activeBtn.getBoundingClientRect();
    const nb = navBox.getBoundingClientRect();
    out.activeVisibleInNav = a.top >= nb.top - 1 && a.bottom <= nb.bottom + 1;
  }

  return JSON.stringify(out);
})()
