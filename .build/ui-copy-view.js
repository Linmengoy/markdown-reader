/* 只截图：选中一段后浮标的样子 */
(async () => {
  const wait = ms => new Promise(x => setTimeout(x, ms));
  const parts = ["# 第一章 夜行", ""];
  for (let i = 1; i <= 40; i++) parts.push("　　这是第" + i + "段，灯火在风里晃了一下，他把书翻到第" + i + "页，远处传来更鼓声，夜色像墨。", "");
  loadContent(parts.join("\n"), "复制测试.md", null);
  await wait(500);
  setMode("read");
  await wait(300);
  const p = document.querySelectorAll("#reader p")[5];
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(p);
  sel.removeAllRanges();
  sel.addRange(range);
  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 470, clientY: 300 }));
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 470, clientY: 300 }));
  await wait(400);
  const t = document.getElementById("toast");
  if (t) t.style.display = "none";
  const pop = document.getElementById("selPop");
  const rc = pop.getBoundingClientRect();
  return JSON.stringify({ shown: pop.classList.contains("show"),
    rect: { x: rc.x, y: rc.y, w: rc.width, h: rc.height },
    dpr: window.devicePixelRatio, inner: [innerWidth, innerHeight] });
})()
