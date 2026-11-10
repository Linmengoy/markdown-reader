/* 源码全屏的视觉检查 */
(async () => {
  const wait = ms => new Promise(x => setTimeout(x, ms));
  await wait(400);

  const lines = ["# 第一章 雾起", ""];
  for (let i = 1; i <= 14; i++) lines.push("　　第 " + i + " 段。天色尚未亮透，河面上浮着一层薄薄的白雾，摆渡的老周把竹篙往水里一插，船身轻轻晃了晃。", "");
  loadContent(lines.join("\n"), "长文.md", null);
  await wait(700);

  setMode("source");
  await wait(800);

  const ed = document.getElementById("editor");
  ed.scrollTop = 0;
  ed.dispatchEvent(new Event("scroll"));
  await wait(400);

  return JSON.stringify({
    mode: state.mode,
    lns: document.querySelectorAll("#edGutter .ln").length,
    edWidth: Math.round(ed.getBoundingClientRect().width)
  });
})()
