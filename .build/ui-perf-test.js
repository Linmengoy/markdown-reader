/* 大字数量性能测试：30 万字 / 150 个标记 */
(async () => {
  const parts = [];
  for (let c = 1; c <= 300; c++){
    parts.push("## 第" + c + "章 风起时");
    parts.push("");
    for (let k = 0; k < 8; k++){
      parts.push("　　夜色像一层薄薄的墨，慢慢渗进窗棂。他坐在桌前，听见远处传来更鼓声，心里忽然空了一下。风从窗缝里钻进来，吹得灯芯微微一晃，把墙上的影子拉得很长很长。");
      parts.push("");
    }
  }
  const text = parts.join("\n");
  const out = { kb: Math.round(text.length / 1000) };

  const t0 = performance.now();
  loadContent(text, "长篇.md", null);
  out.renderMs = Math.round(performance.now() - t0);

  await new Promise(r => setTimeout(r, 300));

  const items = document.querySelectorAll("#wmList .wm-item");
  out.marks = document.querySelectorAll("#reader .wm").length;
  out.navItems = items.length;
  out.chars = state.charCount;

  // 重建导航耗时
  const t1 = performance.now();
  buildWmNav();
  out.navBuildMs = Math.round(performance.now() - t1);

  // 模拟滚动：连续调用 updateProgress
  const main = document.getElementById("main");
  const t2 = performance.now();
  for (let i = 0; i < 60; i++){
    main.scrollTop = Math.round((main.scrollHeight - main.clientHeight) * (i / 60));
    updateProgress();
  }
  out.scroll60FramesMs = Math.round(performance.now() - t2);

  // 跳到中间某个标记，看耗时
  const t3 = performance.now();
  const mid = items[Math.floor(items.length / 2)];
  mid.click();
  out.jumpCallMs = Math.round(performance.now() - t3);

  await new Promise(r => setTimeout(r, 800));
  out.afterJumpScrollTop = Math.round(main.scrollTop);
  out.active = (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none";
  out.targetN = mid.dataset.n;

  return JSON.stringify(out);
})()
