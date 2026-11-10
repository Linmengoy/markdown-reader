/* 段落号 + 字数标并排的视觉检查（长文，保证跨过 2000 字阈值） */
(async () => {
  const r = {};
  const wait = ms => new Promise(x => setTimeout(x, ms));
  await wait(400);

  const lines = ["# 第一章 雾起", ""];
  for (let i = 1; i <= 40; i++) {
    lines.push("　　第 " + i + " 段。天色尚未亮透，河面上浮着一层薄薄的白雾，像是谁把整夜的梦都摊开晾在了水面上，摆渡的老周把竹篙往水里一插，船身轻轻晃了晃。", "");
  }
  loadContent(lines.join("\n"), "长文.md", null);
  await wait(600);

  const reader = document.getElementById("reader");
  const main = document.getElementById("main");

  const cb = document.getElementById("optParaNo");
  cb.checked = true;
  cb.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(500);

  setMode("read");
  await wait(500);

  const pns = [...reader.querySelectorAll("[data-pn]")];
  const wms = [...reader.querySelectorAll(".wm")];
  const base = main.getBoundingClientRect().left;

  let minGutter = 999, hidden = 0;
  pns.forEach(el => {
    if (el.classList.contains("pn-off")) hidden++;
    const left = el.getBoundingClientRect().left - base;
    if (left < minGutter) minGutter = Math.round(left);
  });

  const overlap = wms.filter(w => {
    if (w.classList.contains("flat")) return false;
    const b = w.parentElement.getBoundingClientRect();
    return w.getBoundingClientRect().right > b.left - 24;
  }).length;

  r.read = {
    parano: document.body.classList.contains("parano"),
    paragraphs: pns.length,
    wm: wms.length,
    wmFlat: wms.filter(w => w.classList.contains("flat")).length,
    wmOverlap: overlap,
    hiddenPno: hidden,
    minGutter: minGutter
  };

  const m = reader.querySelector(".wm:not(.flat)") || reader.querySelector(".wm");
  if (m) {
    const mr = m.getBoundingClientRect(), cr = main.getBoundingClientRect();
    main.scrollTop += (mr.top - cr.top) - 250;
  }
  await wait(700);

  setMode("edit");
  await wait(800);
  const prev = document.getElementById("preview");
  const pane = prev.parentElement;
  const pBase = pane.getBoundingClientRect().left;
  const ppns = [...prev.querySelectorAll("[data-pn]")];
  r.edit = {
    paragraphs: ppns.length,
    hidden: ppns.filter(e => e.classList.contains("pn-off")).length,
    minGutter: ppns.length ? Math.round(Math.min(...ppns.map(e => e.getBoundingClientRect().left - pBase))) : -1,
    firstNum: ppns[0] ? ppns[0].dataset.pn : null
  };
  setMode("read");
  await wait(600);

  // 复位并滚到第一个字数标处，方便看段号与字数标是否分列
  main.scrollTop = 0;
  await wait(200);
  const m2 = reader.querySelector(".wm:not(.flat)") || reader.querySelector(".wm");
  if (m2) {
    const mr2 = m2.getBoundingClientRect(), cr2 = main.getBoundingClientRect();
    main.scrollTop += (mr2.top - cr2.top) - 230;
  }
  await wait(700);
  r.wmBox = m2 ? {
    n: m2.dataset.n,
    flat: m2.classList.contains("flat"),
    rightEdgeGap: Math.round(m2.parentElement.getBoundingClientRect().left - m2.getBoundingClientRect().right)
  } : null;

  return JSON.stringify(r);
})()
