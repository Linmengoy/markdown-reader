/* 验证：编辑模式点字数导航（段落级标记）时，左侧源码定位到同一段的段首 */
(async () => {
  const r = {};
  const wait = ms => new Promise(x => setTimeout(x, ms));

  const parts = ["# 长夜将至", "", "## 第一章 更鼓", ""];
  for (let i = 1; i <= 150; i++){
    if (i % 10 === 0) parts.push("## 第" + (i / 10 + 1) + " 节 夜行", "");
    if (i % 7 === 0) parts.push("> 引用一句：风从窗缝里钻进来。", "");
    if (i % 9 === 0) parts.push("- 记一笔：灯芯晃了一下", "- 又记一笔：影子拉得很长", "");
    // 每 5 段写成一个多行源码段落，检验「跳段首」而不是「跳字数所在行」
    if (i % 5 === 0){
      parts.push("　　灯火在风里晃了一下，他把手里的书翻到第" + i + "页，",
        "　　忽然听见远处传来一声更鼓，夜色像一层薄薄的墨慢慢渗进窗棂，",
        "　　谁也没有说话。", "");
    }else{
      parts.push("　　**灯火**在风里晃了一下，他把手里的书翻到第" + i +
        "页，忽然听见远处传来一声更鼓，夜色像一层薄薄的墨慢慢渗进窗棂，谁也没有说话。", "");
    }
  }
  const text = parts.join("\n");

  loadContent(text, "长夜将至.md", null);
  await wait(350);
  setMode("edit");
  await wait(300);

  const ed = document.getElementById("editor");
  const pane = document.getElementById("preview").closest(".pane");
  const nums = Array.from(document.querySelectorAll("#wmList .wm-item")).map(b => +b.dataset.n);
  r.marks = nums;

  // 点第 2 个标
  const n = nums[1];
  document.querySelector('#wmList .wm-item[data-n="' + n + '"]').click();
  await wait(900);

  const mark = document.querySelector('#preview .wm[data-n="' + n + '"]');
  const blk = mark.closest(WM_BLOCK);
  const chars = blockCharCount(blk);
  const startChar = Math.max(1, n - (chars - 1));
  const off = sourceOffsetAt(startChar);
  const wantTop = editorContentTop(ed, off) - 12;
  const lineEnd = text.indexOf("\n", off);

  r.jump = {
    n: n,
    chars: chars,                 // 该段自身字数
    startChar: startChar,         // 段首是第几个字
    srcDiff: Math.round(ed.scrollTop - wantTop),
    pvTop: Math.round(blk.getBoundingClientRect().top - pane.getBoundingClientRect().top),
    srcLine: text.slice(off, lineEnd < 0 ? text.length : lineEnd).slice(0, 26),
    pvText: (blk.textContent || "").replace(/\s/g, "").slice(0, 26),
    markTop: Math.round(mark.getBoundingClientRect().top - pane.getBoundingClientRect().top)
  };
  // 源码行去语法后应与预览段落开头一致
  const norm = s => s.replace(/[*>`#\-　\s]/g, "");
  r.sameHead = norm(r.jump.srcLine).slice(0, 8) === norm(r.jump.pvText).slice(0, 8);

  // 点第 1 个标回跳
  const n0 = nums[0];
  document.querySelector('#wmList .wm-item[data-n="' + n0 + '"]').click();
  await wait(900);
  const mk0 = document.querySelector('#preview .wm[data-n="' + n0 + '"]');
  const blk0 = mk0.closest(WM_BLOCK);
  const off0 = sourceOffsetAt(Math.max(1, n0 - (blockCharCount(blk0) - 1)));
  r.back = { n: n0, diff: Math.round(ed.scrollTop - (editorContentTop(ed, off0) - 12)) };

  // 阅读模式点第 3 个标，再切编辑：源码应落在该段段首
  setMode("read");
  await wait(350);
  const n2 = nums[2];
  document.querySelector('#wmList .wm-item[data-n="' + n2 + '"]').click();
  await wait(900);
  setMode("edit");
  await wait(500);
  const mk2 = document.querySelector('#preview .wm[data-n="' + n2 + '"]');
  const blk2 = mk2.closest(WM_BLOCK);
  const off2 = sourceOffsetAt(Math.max(1, n2 - (blockCharCount(blk2) - 1)));
  r.modeSwitch = {
    n: n2,
    diff: Math.round(ed.scrollTop - (editorContentTop(ed, off2) - 12)),
    flat: Array.from(document.querySelectorAll("#preview .wm")).every(m => m.classList.contains("flat"))
  };

  return JSON.stringify(r);
})()
