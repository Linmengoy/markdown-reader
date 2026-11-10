/* 验证：源码全屏（三态）+ 源码行号 */
(async () => {
  const r = {};
  const wait = ms => new Promise(x => setTimeout(x, ms));
  await wait(400);

  const lines = ["# 第一章 试", ""];
  for (let i = 1; i <= 30; i++) lines.push("　　第 " + i + " 段。天色尚未亮透，河面上浮着一层薄薄的白雾，摆渡的老周把竹篙往水里一插。", "");
  // 再加一行超长内容，用来验证折行不会打乱行号
  lines.push("　　这一行特别长，" + "用来测试自动换行时行号是否仍然只标在逻辑行的第一行。".repeat(6));
  lines.push("");
  lines.push("最后一行。");
  loadContent(lines.join("\n"), "行号.md", null);
  await wait(700);

  const ed = document.getElementById("editor");
  const totalLines = ed.value.split("\n").length;

  /* ---------- 1) 编辑模式下的行号 ---------- */
  setMode("edit");
  await wait(500);
  const inner = document.getElementById("edGutterIn");
  const lns = [...inner.querySelectorAll(".ln")];
  const tops = lns.map(el => parseFloat(el.style.top));

  r.edit = {
    mode: state.mode,
    logicalLines: totalLines,
    rendered: lns.length,
    first3: lns.slice(0, 3).map(e => e.textContent).join(","),
    lastNum: lns.length ? lns[lns.length - 1].textContent : null,
    ascending: tops.every((t, i) => i === 0 || t > tops[i - 1]),
    gutterWidth: Math.round(document.getElementById("edGutter").getBoundingClientRect().width),
    editorPadLeft: getComputedStyle(ed).paddingLeft,
    // 行号是否压到文字：第一个行号右边缘应小于正文左边界
    firstNumRight: lns.length ? Math.round(lns[0].getBoundingClientRect().right) : -1,
    textLeft: Math.round(ed.getBoundingClientRect().left + parseFloat(getComputedStyle(ed).paddingLeft))
  };

  /* ---------- 2) 滚动跟随 ---------- */
  ed.scrollTop = 600;
  ed.dispatchEvent(new Event("scroll"));
  await wait(200);
  r.scrollSync = {
    scrollTop: ed.scrollTop,
    transform: inner.style.transform,
    expected: "translateY(" + (-ed.scrollTop) + "px)"
  };
  ed.scrollTop = 0;
  ed.dispatchEvent(new Event("scroll"));
  await wait(150);

  /* ---------- 3) 源码全屏 ---------- */
  setMode("source");
  await wait(600);
  const srcPane = document.querySelector(".pane.src");
  const pvPane = document.querySelector(".pane.pv");
  r.source = {
    mode: state.mode,
    bodySource: document.body.classList.contains("mode-source"),
    bodyEdit: document.body.classList.contains("mode-edit"),
    btnSrcOn: document.getElementById("btnSrc").classList.contains("on"),
    pvHidden: getComputedStyle(pvPane).display === "none",
    srcWidth: Math.round(srcPane.getBoundingClientRect().width),
    windowW: innerWidth,
    editorWrapW: Math.round(document.getElementById("editorWrap").getBoundingClientRect().width),
    statusText: document.getElementById("stMode").textContent,
    gutterStillThere: document.querySelectorAll("#edGutter .ln").length > 0
  };

  /* ---------- 4) 回到编辑 ---------- */
  setMode("edit");
  await wait(500);
  r.backEdit = {
    mode: state.mode,
    pvVisible: getComputedStyle(pvPane).display !== "none",
    btnEditOn: document.getElementById("btnEdit").classList.contains("on"),
    btnSrcOn: document.getElementById("btnSrc").classList.contains("on"),
    gutter: document.querySelectorAll("#edGutter .ln").length
  };

  /* ---------- 5) 关掉行号开关 ---------- */
  const cb = document.getElementById("optGutter");
  cb.checked = false;
  cb.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(300);
  r.gutterOff = {
    left: document.querySelectorAll("#edGutter .ln").length,
    padLeftWhenOn: getComputedStyle(ed).paddingLeft
  };
  cb.checked = true;
  cb.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(300);
  r.gutterBackOn = document.querySelectorAll("#edGutter .ln").length;

  /* ---------- 6) 阅读模式不应有行号 ---------- */
  setMode("read");
  await wait(400);
  r.readMode = {
    mode: state.mode,
    gutter: document.querySelectorAll("#edGutter .ln").length
  };
  setMode("edit");
  await wait(400);

  return JSON.stringify(r);
})()
