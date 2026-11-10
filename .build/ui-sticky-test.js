/* 截图：标记很多时，点靠后的条目，检查标题是否吸顶 */
(async () => {
  const parts = ["# 长夜将至", "", "## 第一章 更鼓"];
  for (let i = 1; i <= 300; i++){
    parts.push("");
    parts.push("　　夜色像一层薄薄的墨，慢慢渗进窗棂。他坐在桌前，听见远处传来第" + i +
      "声更鼓，心里忽然空了一下。风从窗缝里钻进来，吹得灯芯微微一晃，把墙上的影子拉得很长很长。");
  }
  loadContent(parts.join("\n"), "长夜.md", null);
  await new Promise(r => setTimeout(r, 500));

  const items = Array.from(document.querySelectorAll("#wmList .wm-item"));
  const nav = document.getElementById("wmNav");
  const hd = nav.querySelector(".wm-sec-hd");

  // 点接近末尾的条目，触发 nav 内部滚动
  items[items.length - 2].click();
  await new Promise(r => setTimeout(r, 800));

  const nb = nav.getBoundingClientRect();
  const hb = hd.getBoundingClientRect();
  return JSON.stringify({
    navItems: items.length,
    navScrollTop: Math.round(nav.scrollTop),
    navScrollable: nav.scrollHeight > nav.clientHeight,
    headerTopInNav: Math.round(hb.top - nb.top),
    headerVisible: hb.top >= nb.top - 1,
    active: (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none",
    activeVisible: (function(){
      const a = document.querySelector("#wmList .wm-item.active");
      if (!a) return false;
      const r = a.getBoundingClientRect();
      return r.top >= nb.top - 1 && r.bottom <= nb.bottom + 1;
    })()
  });
})()
