/* 验证：① 默认编辑模式 ② 换文件保持上一个文件的模式 ③ 段落号开关与编号正确性 */
(async () => {
  const r = {};
  const wait = ms => new Promise(x => setTimeout(x, ms));
  await wait(400);

  const bodyCls = () => document.body.className;
  const snap = () => ({
    mode: state.mode,
    edit: document.body.classList.contains("mode-edit"),
    read: document.body.classList.contains("mode-read"),
    btnEditOn: document.getElementById("btnEdit").classList.contains("on"),
    btnReadOn: document.getElementById("btnRead").classList.contains("on"),
    cfgMode: settings.mode
  });

  /* ---------- 1) 干净配置首启：默认应是编辑模式 ---------- */
  r.boot = snap();

  /* ---------- 2) 编辑态打开下一个文件：模式不能变 ---------- */
  loadContent("# 一\n\n段落甲。\n\n段落乙。", "a.md", null);
  await wait(350);
  r.openWhileEdit = snap();

  /* ---------- 3) 切阅读后再打开下一个文件：应保持阅读 ---------- */
  setMode("read");
  await wait(350);
  loadContent("# 二\n\n段落丙。\n\n段落丁。", "b.md", null);
  await wait(350);
  r.openWhileRead = snap();

  /* ---------- 4) 段落号：编号与位置 ---------- */
  const lines = ["# 第一章 试", ""];
  for (let i = 1; i <= 26; i++) lines.push("　　这是第 " + i + " 段，灯下有人在抄书，纸页翻过去的时候，夜色跟着响了一声。", "");
  lines.push("> 引用块也算一段。", "");
  lines.push("- 列表项一", "- 列表项二", "");
  lines.push("最后一句话。", "");
  loadContent(lines.join("\n"), "段落号.md", null);
  await wait(500);
  setMode("read");
  await wait(400);

  const reader = document.getElementById("reader");
  const main = document.getElementById("main");
  const baseLeft = main.getBoundingClientRect().left;

  settings.parano = true;
  document.getElementById("optParaNo").checked = true;
  applyParaNo();
  await wait(450);

  const pns = [...reader.querySelectorAll("[data-pn]")];
  const nums = pns.map(e => e.dataset.pn);
  const first = pns[0] ? pns[0].getBoundingClientRect().left - baseLeft : -1;
  // 段号画在段落左边 10px 处再往左一个字宽，粗算它需要的空位
  const needGutter = pns.length ? 10 + Math.max(2, String(nums[nums.length - 1]).length) * 7 : 0;

  r.paraOn = {
    bodyClass: document.body.classList.contains("parano"),
    count: pns.length,
    expectAtLeast: 27,
    firstNums: nums.slice(0, 4).join(","),
    lastNum: nums[nums.length - 1],
    continuous: nums.every((v, i) => v === String(i + 1)),
    listExcluded: reader.querySelectorAll("li[data-pn]").length === 0,
    quoteNumbered: reader.querySelectorAll("blockquote[data-pn]").length === 1,
    hiddenCount: pns.filter(e => e.classList.contains("pn-off")).length,
    gutterPx: Math.round(first),
    enoughRoom: first >= needGutter,
    // 段号不能压到正文：段落左边界到栏左边的距离要容得下
    textLeft: Math.round(first)
  };

  // 字数标与段号是否分列（不重叠）：标右边缘应落在段号左侧
  const wms = [...reader.querySelectorAll(".wm:not(.flat)")];
  const overlaps = wms.filter(w => {
    const b = w.parentElement.getBoundingClientRect();
    return w.getBoundingClientRect().right > b.left - 18;
  }).length;
  r.gutter = { wmCount: wms.length, wmOverlapParaNo: overlaps };

  // 编辑预览里同样有编号
  setMode("edit");
  await wait(450);
  const prev = document.getElementById("preview");
  const pPns = [...prev.querySelectorAll("[data-pn]")];
  r.paraInEditPane = {
    count: pPns.length,
    firstNum: pPns[0] ? pPns[0].dataset.pn : null,
    hidden: pPns.filter(e => e.classList.contains("pn-off")).length
  };

  /* ---------- 5) 关掉段落号：属性清干净 ---------- */
  settings.parano = false;
  document.getElementById("optParaNo").checked = false;
  applyParaNo();
  await wait(350);
  r.paraOff = {
    bodyClass: document.body.classList.contains("parano"),
    leftInReader: reader.querySelectorAll("[data-pn]").length,
    leftInPreview: prev.querySelectorAll("[data-pn]").length
  };

  /* ---------- 6) 收尾：把状态摆成「阅读 + 开段号」，供重启测试核对 ---------- */
  settings.parano = true;
  document.getElementById("optParaNo").checked = true;
  setMode("read");
  applyParaNo();
  await wait(300);
  saveSettings();
  r.leaveForRestart = { mode: state.mode, parano: settings.parano };

  return JSON.stringify(r);
})()
