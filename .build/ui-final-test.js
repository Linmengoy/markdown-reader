/* 最终验证：远/近距离跳转、章节跳转回归、编辑模式 */
(async () => {
  const parts = ["# 长夜将至", "", "## 第一章 更鼓"];
  for (let i = 1; i <= 240; i++){
    parts.push("");
    if (i === 60) parts.push("## 第二章 河灯");
    if (i === 120) parts.push("## 第三章 归途");
    if (i === 180) parts.push("## 第四章 雪夜");
    parts.push("　　夜色像一层薄薄的墨，慢慢渗进窗棂。他坐在桌前，听见远处传来第" + i +
      "声更鼓，心里忽然空了一下。风从窗缝里钻进来，吹得灯芯微微一晃，把墙上的影子拉得很长很长。");
  }
  loadContent(parts.join("\n"), "长夜.md", null);
  await new Promise(r => setTimeout(r, 500));

  const out = {};
  const main = document.getElementById("main");
  const items = Array.from(document.querySelectorAll("#wmList .wm-item"));
  out.navCount = items.length;
  out.labels = items.map(b => b.dataset.n).join(",");

  const lineTopOf = (n) => {
    const m = document.querySelector('#reader .wm[data-n="' + n + '"]');
    return m ? Math.round(m.closest("p").getBoundingClientRect().top - main.getBoundingClientRect().top) : null;
  };

  /* 1. 远距离：点最后一条，应立即到位（不等动画） */
  const last = items[items.length - 1];
  last.click();
  await new Promise(r => setTimeout(r, 120));
  out.farJump = {
    n: last.dataset.n,
    scrollTop: Math.round(main.scrollTop),
    lineTop: lineTopOf(last.dataset.n),
    active: (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none"
  };

  /* 2. 远距离：回第一条 */
  const first = items[0];
  first.click();
  await new Promise(r => setTimeout(r, 120));
  out.backJump = {
    n: first.dataset.n,
    scrollTop: Math.round(main.scrollTop),
    lineTop: lineTopOf(first.dataset.n),
    active: (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none"
  };

  /* 3. 近距离：相邻两条之间，走平滑动画 */
  const a = items[2], b = items[3];
  a.click();
  await new Promise(r => setTimeout(r, 400));
  const before = Math.round(main.scrollTop);
  b.click();
  await new Promise(r => setTimeout(r, 150));
  const mid = Math.round(main.scrollTop);
  await new Promise(r => setTimeout(r, 900));
  out.nearJump = {
    from: before,
    midWay: mid,
    final: Math.round(main.scrollTop),
    lineTop: lineTopOf(b.dataset.n),
    animated: mid !== Math.round(main.scrollTop) || mid !== before
  };

  /* 4. 章节跳转回归 */
  const tocBtn = document.querySelectorAll("#toc .toc-item")[2];
  const targetHead = document.querySelector("#" + tocBtn.dataset.id);
  tocBtn.click();
  await new Promise(r => setTimeout(r, 900));
  out.chapterJump = {
    title: tocBtn.textContent,
    scrollTop: Math.round(main.scrollTop),
    headTop: targetHead
      ? Math.round(targetHead.getBoundingClientRect().top - main.getBoundingClientRect().top)
      : null,
    active: (document.querySelector("#toc .toc-item.active") || {}).textContent || "none"
  };

  /* 5. 编辑模式 */
  setMode("edit");
  await new Promise(r => setTimeout(r, 600));
  const pane = document.querySelector("#preview").parentElement;
  const btnE = items[1];
  btnE.click();
  await new Promise(r => setTimeout(r, 600));
  const mkE = document.querySelector('#preview .wm[data-n="' + btnE.dataset.n + '"]');
  out.editJump = {
    n: btnE.dataset.n,
    scrollTop: Math.round(pane.scrollTop),
    lineTop: mkE ? Math.round(mkE.closest("p").getBoundingClientRect().top - pane.getBoundingClientRect().top) : null,
    active: (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none"
  };

  return JSON.stringify(out);
})()
