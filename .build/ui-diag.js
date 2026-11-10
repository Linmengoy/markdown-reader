/* 诊断2：拦截 scrollTo 参数 + 关闭 CSS 平滑后再验证 */
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

  /* ===== A. 阅读模式 ===== */
  const main = document.getElementById("main");
  main.style.scrollBehavior = "auto";           // 关掉 CSS 平滑，便于断言
  const mainCalls = [];
  const mainTo = main.scrollTo.bind(main);
  main.scrollTo = function(o){ mainCalls.push(Math.round(o.top)); mainTo({ top: o.top, behavior: "auto" }); };

  const btnA = items[1];
  btnA.click();
  await new Promise(r => setTimeout(r, 300));

  const mkA = document.querySelector('#reader .wm[data-n="' + btnA.dataset.n + '"]');
  const lnA = mkA.closest("p");
  out.read = {
    n: btnA.dataset.n,
    calledTop: mainCalls[0],
    scrollTop: Math.round(main.scrollTop),
    lineTop: Math.round(lnA.getBoundingClientRect().top - main.getBoundingClientRect().top),
    active: (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none"
  };

  /* 滚动联动：定位到不同位置后检查高亮 */
  function probeAt(f){
    main.scrollTop = Math.round((main.scrollHeight - main.clientHeight) * f);
    updateProgress();
    const a = document.querySelector("#wmList .wm-item.active");
    return a ? a.dataset.n : "none";
  }
  out.at0 = probeAt(0);
  out.at20 = probeAt(0.2);
  out.at55 = probeAt(0.55);
  out.at99 = probeAt(0.99);

  /* ===== B. 编辑模式 ===== */
  setMode("edit");
  await new Promise(r => setTimeout(r, 600));
  const pane = document.querySelector("#preview").parentElement;
  const paneCalls = [];
  const paneTo = pane.scrollTo.bind(pane);
  pane.scrollTo = function(o){ paneCalls.push(Math.round(o.top)); paneTo({ top: o.top, behavior: "auto" }); };

  const btnB = items[0];
  btnB.click();
  await new Promise(r => setTimeout(r, 300));

  const mkB = document.querySelector('#preview .wm[data-n="' + btnB.dataset.n + '"]');
  const lnB = mkB.closest("p");
  out.edit = {
    n: btnB.dataset.n,
    calledTop: paneCalls[0],
    scrollTop: Math.round(pane.scrollTop),
    lineTop: Math.round(lnB.getBoundingClientRect().top - pane.getBoundingClientRect().top),
    paneH: pane.scrollHeight,
    active: (document.querySelector("#wmList .wm-item.active") || { dataset: {} }).dataset.n || "none"
  };

  return JSON.stringify(out);
})()
