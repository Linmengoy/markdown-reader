/* 在真实 Electron 渲染环境里验证字数导航跳转 */
(async () => {
  const parts = ["# 长夜将至", "", "## 第一章 更鼓"];
  for (let i = 1; i <= 120; i++){
    parts.push("");
    parts.push("　　夜色像一层薄薄的墨，慢慢渗进窗棂。他坐在桌前，听见远处传来第" + i +
      "声更鼓，心里忽然空了一下。风从窗缝里钻进来，吹得灯芯微微一晃，把墙上的影子拉得很长很长。");
  }
  loadContent(parts.join("\n"), "长夜将至.md", null);
  await new Promise(r => setTimeout(r, 500));

  const items = Array.from(document.querySelectorAll("#wmList .wm-item"));
  const out = {
    count: items.length,
    labels: items.map(b => b.dataset.n).join(",")
  };

  const main = document.getElementById("main");
  const btn = items[1];

  // 点击前：目标行在文中的位置
  const n = btn.dataset.n;
  const mark = document.querySelector('#reader .wm[data-n="' + n + '"]');
  const line = mark.closest("p") || mark;
  out.beforeScrollTop = Math.round(main.scrollTop);
  out.beforeLineTop = Math.round(line.getBoundingClientRect().top - main.getBoundingClientRect().top);

  btn.click();
  await new Promise(r => setTimeout(r, 1000));   // 等平滑滚动结束

  out.afterScrollTop = Math.round(main.scrollTop);
  out.afterLineTop = Math.round(line.getBoundingClientRect().top - main.getBoundingClientRect().top);
  out.markTop = Math.round(mark.getBoundingClientRect().top - main.getBoundingClientRect().top);
  out.maxScroll = main.scrollHeight - main.clientHeight;
  out.active = (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none";

  const mr = main.getBoundingClientRect();
  const mk = mark.getBoundingClientRect();
  out.markInView = mk.top >= mr.top - 2 && mk.bottom <= mr.bottom;

  return JSON.stringify(out);
})()
