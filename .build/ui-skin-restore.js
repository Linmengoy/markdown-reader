/* 重启后是否还记得上次的皮肤与配置 */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  await wait(400);

  const r = {
    skinOn: document.body.classList.contains("skin-on"),
    skinOpacity: $("#bgSkin").style.opacity,
    maskOpacity: $("#bgMask").style.opacity,
    bgImageSet: /^url\("data:image\//.test($("#bgSkin").style.backgroundImage),
    thumbOk: !!document.querySelector("#skinGrid img") && String(document.querySelector("#skinGrid img").src).startsWith("data:image/"),
    cells: document.querySelectorAll("#skinGrid .skin-cell").length,
    cellOn: document.querySelectorAll("#skinGrid .skin-cell.on").length,
    profItems: document.querySelectorAll("#profList .prof-item").length,
    profName: (document.querySelector("#profList .pn") || {}).textContent,
    sliders: {
      op: $("#skinOp").value, dim: $("#skinDim").value, paper: $("#skinPaper").value, fit: $("#skinFit").value
    },
    cfgHintHasPath: ($("#cfgHint") || {}).textContent.indexOf("config.json") >= 0
  };

  // 套用保存的那套配置，确认皮肤仍在
  const btn = document.querySelector("#profList [data-apply]");
  if (btn) {
    btn.click();
    await wait(700);
    r.reapply = {
      skinOn: document.body.classList.contains("skin-on"),
      fs: settings.fs,
      maskOpacity: $("#bgMask").style.opacity
    };
  }

  // 关掉皮肤 → 面板恢复不透明
  $("#btnSkinOff").click();
  await wait(500);
  r.skinOff = {
    skinOn: document.body.classList.contains("skin-on"),
    maskOpacity: $("#bgMask").style.opacity,
    topbarBg: getComputedStyle(document.querySelector(".topbar")).backgroundColor,
    enabled: settings.bg.enabled
  };

  // 再点缩略图打开
  const cell = document.querySelector("#skinGrid .skin-cell");
  if (cell) {
    cell.click();
    await wait(600);
    r.skinBack = { skinOn: document.body.classList.contains("skin-on"), enabled: settings.bg.enabled };
  }

  return JSON.stringify(r);
})()
