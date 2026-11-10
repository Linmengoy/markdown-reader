/* 验证「复制已选中」：选中浮标出现、可点击复制、阅读态/编辑态都可用 */
(async () => {
  const r = {};
  const wait = ms => new Promise(x => setTimeout(x, ms));
  const pop = document.getElementById("selPop");
  const btn = document.getElementById("selCopy");
  const toastText = () => (document.getElementById("toast") || {}).textContent || "";

  const parts = ["# 第一章 夜行", ""];
  for (let i = 1; i <= 24; i++) {
    parts.push("　　这是第" + i + "段，灯火在风里晃了一下，他把书翻到第" + i + "页，远处传来更鼓声，夜色像墨。", "");
  }
  loadContent(parts.join("\n"), "复制测试.md", null);
  await wait(500);
  setMode("read");
  await wait(300);

  const ps = document.querySelectorAll("#reader p");
  const target = ps[6];

  /* ---------- 1) 编辑态：textarea 选区 → 鼠标旁浮标 → 复制 ---------- */
  setMode("edit");
  await wait(500);
  const ed = document.getElementById("editor");
  ed.focus();
  const start = ed.value.indexOf("这是第3段");
  document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 320, clientY: 240 }));
  ed.setSelectionRange(start, start + 12);
  ed.dispatchEvent(new Event("select"));
  // 真实环境里指针位置来自 mousemove，这里补一个，保证浮标落在指针附近
  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 320, clientY: 240 }));
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 320, clientY: 240 }));
  await wait(300);

  r.editor = {
    shown: pop.classList.contains("show"),
    chars: document.getElementById("selPopNum").textContent,
    btnText: btn.textContent,
    nearPointer: Math.abs(parseFloat(pop.style.left) - 320) < 70,
    inViewport: (parseFloat(pop.style.left) > 0 && parseFloat(pop.style.left) < innerWidth && parseFloat(pop.style.top) > 0 && parseFloat(pop.style.top) < innerHeight),
    selLen: (state.selText || "").length
  };
  btn.click();
  await wait(400);
  r.editorCopy = { toast: toastText(), btnText: btn.textContent, stateChars: state.selChars };

  /* ---------- 2) 拖选过程中浮标不挡鼠标 ---------- */
  setMode("read");
  await wait(400);
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(target);
  document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 500, clientY: 400 }));
  sel.removeAllRanges();
  sel.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
  await wait(200);
  r.duringDrag = { dragging: pop.classList.contains("dragging"), pe: getComputedStyle(pop).pointerEvents };
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 500, clientY: 400 }));
  await wait(300);

  /* ---------- 3) 阅读态：选中整段 → 浮标 → 复制 ---------- */
  r.reader = {
    shown: pop.classList.contains("show"),
    chars: document.getElementById("selPopNum").textContent,
    expectChars: target.textContent.replace(/\s/g, "").length,
    btnText: btn.textContent,
    pe: getComputedStyle(pop).pointerEvents,
    selHead: (state.selText || "").slice(0, 8),
    selLen: (state.selText || "").length
  };

  // 点浮标空白处不应让选区消失（mousedown 被 preventDefault）
  pop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  await wait(120);
  r.clickKeepsSelection = {
    stillShown: pop.classList.contains("show"),
    selStillThere: (window.getSelection().toString() || "").length > 0
  };

  btn.click();
  await wait(450);
  r.readerCopy = { toast: toastText(), btnText: btn.textContent };

  // 供外部用剪贴板核对
  r.expectClipboard = target.textContent;
  r.stateSelLen = (state.selText || "").length;
  return JSON.stringify(r);
})()
