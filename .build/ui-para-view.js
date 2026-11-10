/* 只负责摆好画面截图：让带标的普通段落停在视口上方，便于人工核对标记形态 */
(async () => {
  const wait = ms => new Promise(x => setTimeout(x, ms));
  const parts = ["# 长夜将至", "", "## 第一章 更鼓", ""];
  for (let i = 1; i <= 60; i++){
    if (i % 7 === 0) parts.push("> 引用一句：风从窗缝里钻进来，灯芯晃了一下。", "");
    parts.push("　　**灯火**在风里晃了一下，他把手里的书翻到第" + i +
      "页，忽然听见远处传来一声更鼓，夜色像一层薄薄的墨慢慢渗进窗棂，谁也没有说话。", "");
  }
  loadContent(parts.join("\n"), "长夜将至.md", null);
  await wait(400);

  const reader = document.getElementById("reader");
  const main = document.getElementById("main");
  const marks = Array.from(reader.querySelectorAll(".wm"));
  // 选一个标在普通段落上的（不是引用块里的）
  const pick = marks.find(m => m.closest(WM_BLOCK) && !m.closest("blockquote")) || marks[0];
  const blk = pick.closest(WM_BLOCK);
  const prev = main.style.scrollBehavior;
  main.style.scrollBehavior = "auto";
  main.scrollTop = main.scrollTop + blk.getBoundingClientRect().top - main.getBoundingClientRect().top - 120;
  main.style.scrollBehavior = prev;
  const toast = document.getElementById("toast");
  if(toast) toast.style.display = "none";
  await wait(400);

  return JSON.stringify({
    total: marks.length,
    nums: marks.map(m => +m.dataset.n),
    picked: +pick.dataset.n,
    cls: blk.className,
    barBg: getComputedStyle(blk, "::before").backgroundColor,
    barW: getComputedStyle(blk, "::before").width
  });
})()
