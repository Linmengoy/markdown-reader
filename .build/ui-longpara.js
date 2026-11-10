/* 超长段落（比一屏还高）时，点标记应让标记本身可见 */
(async () => {
  const wait = ms => new Promise(x => setTimeout(x, ms));
  const long = [];
  for (let i = 0; i < 120; i++){
    long.push("夜色像一层薄薄的墨慢慢渗进窗棂他听见更鼓响过第" + i + "声谁也没有说话");
  }
  const text = "# 长夜\n\n" + long.join("") + "\n\n" + "　　短段落，收尾。";
  loadContent(text, "长夜.md", null);
  await wait(300);

  const reader = document.getElementById("reader");
  const mark = reader.querySelector(".wm");
  const line = mark.closest(WM_BLOCK);
  const main = document.getElementById("main");

  const before = {
    marks: reader.querySelectorAll(".wm").length,
    n: mark ? +mark.dataset.n : 0,
    lineH: line ? Math.round(line.getBoundingClientRect().height) : 0,
    viewH: main.clientHeight
  };

  document.querySelector("#wmList .wm-item").click();
  await wait(900);

  const mr = main.getBoundingClientRect();
  const mk = mark.getBoundingClientRect();
  return JSON.stringify({
    before,
    after: {
      scrollTop: Math.round(main.scrollTop),
      markTop: Math.round(mk.top - mr.top),
      markInView: mk.top >= mr.top - 2 && mk.bottom <= mr.bottom + 2,
      lineTop: Math.round(line.getBoundingClientRect().top - mr.top)
    }
  });
})()
