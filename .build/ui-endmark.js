/* 验证：段落级字数标（挂在段首左侧空白、覆盖整段）+ 全文复制 */
(async () => {
  const r = {};
  const wait = ms => new Promise(x => setTimeout(x, ms));

  const parts = ["# 长夜将至", "", "## 第一章 更鼓", ""];
  for (let i = 1; i <= 130; i++){
    if (i % 8 === 0) parts.push("> 引用一句：风从窗缝里钻进来，灯芯晃了一下。", "");
    if (i % 6 === 0) parts.push("- 记一笔：影子拉得很长", "- 又记一笔：更鼓响过三声", "");
    if (i === 60) parts.push("```js", "const a = 1; // 这段代码不该计入字数", "```", "");
    parts.push("　　**灯火**在风里晃了一下，他把手里的书翻到第" + i +
      "页，忽然听见远处传来一声更鼓，夜色像一层薄薄的墨慢慢渗进窗棂，谁也没有说话。", "");
  }
  loadContent(parts.join("\n"), "长夜将至.md", null);
  await wait(400);

  const reader = document.getElementById("reader");
  const marks = Array.from(reader.querySelectorAll(".wm"));
  r.marksCount = marks.length;

  // 每个标都属于某段，且段落带 wm-host；标挂在段的左侧空白处、纵向对齐段首
  r.marks = marks.map(m => {
    const blk = m.closest(WM_BLOCK);
    const mb = m.getBoundingClientRect();
    const bb = blk ? blk.getBoundingClientRect() : null;
    return {
      n: +m.dataset.n,
      host: !!(blk && blk.classList.contains("wm-host")),
      flat: m.classList.contains("flat"),
      leftGap: bb ? Math.round(bb.left - mb.right) : null,
      topDelta: bb ? Math.round(mb.top - bb.top) : null
    };
  });
  r.allHosted = r.marks.every(x => x.host);
  r.allGutter = r.marks.every(x => !x.flat && x.leftGap > 14 && x.leftGap <= 26);
  r.allTopAligned = r.marks.every(x => x.topDelta >= -6 && x.topDelta <= 26);

  // 数字＝标所在段落结束时的真实累计字数（独立复算）
  function countAtBlockEnd(mark){
    const target = mark.closest(WM_BLOCK);
    let count = 0, entered = false;
    const w = document.createTreeWalker(document.getElementById("reader"), NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if(!n.parentElement || n.parentElement.closest("pre, code, .wm")) return NodeFilter.FILTER_REJECT;
        if(!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while((n = w.nextNode())){
      const blk = n.parentElement.closest(WM_BLOCK);
      if(blk === target) entered = true;
      else if(entered) break;
      for(let i = 0; i < n.nodeValue.length; i++){
        const c = n.nodeValue.charCodeAt(i);
        if(c === 32 || c === 9 || c === 10 || c === 13 || c === 0x3000) continue;
        count++;
      }
    }
    return count;
  }
  r.recheck = marks.map(m => ({ n: +m.dataset.n, real: countAtBlockEnd(m) }));
  r.recheckOK = r.recheck.every(x => x.n === x.real);

  // 一个段落只挂一个标
  const perBlock = new Map();
  marks.forEach(m => {
    const b = m.closest(WM_BLOCK);
    perBlock.set(b, (perBlock.get(b) || 0) + 1);
  });
  r.onePerBlock = Array.from(perBlock.values()).every(v => v === 1);

  // 导航：数字一致，摘要取该段开头（因为跳过去落在段首）
  r.navNums = Array.from(document.querySelectorAll("#wmList .wm-item")).map(b => +b.dataset.n);
  r.navMatch = r.navNums.length === marks.length && r.navNums.every((n, i) => n === +marks[i].dataset.n);
  r.navSnips = Array.from(document.querySelectorAll("#wmList .wm-item .wm-snip")).map(e => e.textContent);

  // 点第二个标：段首贴到视口顶部，标也在视口内
  const main = document.getElementById("main");
  const btn = document.querySelectorAll("#wmList .wm-item")[1];
  btn.click();
  await wait(900);
  const mk = reader.querySelector('.wm[data-n="' + btn.dataset.n + '"]');
  const line = mk.closest(WM_BLOCK);
  const mtop = mk.getBoundingClientRect().top;
  r.jump = {
    n: +btn.dataset.n,
    lineTop: Math.round(line.getBoundingClientRect().top - main.getBoundingClientRect().top),
    markVisible: mtop >= main.getBoundingClientRect().top && mtop < main.getBoundingClientRect().bottom,
    markLeftGap: Math.round(line.getBoundingClientRect().left - mk.getBoundingClientRect().right)
  };

  // 切到编辑模式：窄栏应退回段末内联（flat）
  setMode("edit");
  await wait(500);
  const pv = document.getElementById("preview");
  const pvMarks = Array.from(pv.querySelectorAll(".wm"));
  r.edit = {
    total: pvMarks.length,
    flat: pvMarks.filter(m => m.classList.contains("flat")).length
  };
  setMode("read");
  await wait(400);

  // 段落左侧细线是否真的画出来了
  const first = marks[0].closest(WM_BLOCK);
  const cs = getComputedStyle(first, "::before");
  const fbb = first.getBoundingClientRect();
  r.bar = {
    cls: first.className,
    content: cs.content,
    width: cs.width,
    bg: cs.backgroundColor,
    left: Math.round(fbb.left + parseFloat(cs.left || "0") - fbb.left),   // 相对段左缘
    height: Math.round(fbb.height)
  };

  // 复制全文
  r.copyOk = await window.nativeFS.copyText(state.content);

  return JSON.stringify(r);
})()
