/* 重启后核对：模式是否沿用上次、段落号开关是否还原 */
(async () => {
  const r = {};
  const wait = ms => new Promise(x => setTimeout(x, ms));
  await wait(800);

  const reader = document.getElementById("reader");
  const pns = [...reader.querySelectorAll("[data-pn]")];

  r.boot = {
    mode: state.mode,
    bodyEdit: document.body.classList.contains("mode-edit"),
    bodyRead: document.body.classList.contains("mode-read"),
    btnReadOn: document.getElementById("btnRead").classList.contains("on"),
    parano: !!settings.parano,
    bodyParano: document.body.classList.contains("parano"),
    checkbox: document.getElementById("optParaNo").checked,
    readerParas: pns.length,
    firstNum: pns[0] ? pns[0].dataset.pn : null,
    continuous: pns.every((e, i) => e.dataset.pn === String(i + 1)),
    hidden: pns.filter(e => e.classList.contains("pn-off")).length
  };

  // 关掉段号后，再开回来，属性应能重建
  const cb = document.getElementById("optParaNo");
  cb.checked = false; cb.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(300);
  const afterOff = reader.querySelectorAll("[data-pn]").length;
  cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(400);
  const afterOn = [...reader.querySelectorAll("[data-pn]")];

  r.toggle = {
    leftAfterOff: afterOff,
    countAfterOn: afterOn.length,
    continuous: afterOn.every((e, i) => e.dataset.pn === String(i + 1))
  };

  return JSON.stringify(r);
})()
