/* 验证：上传背景皮肤 + 我的配置（保存/套用/落盘） */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  const $ = s => document.querySelector(s);

  /* ---- 1) 造一张真实图片，走「上传」控件路径 ---- */
  const cv = document.createElement("canvas");
  cv.width = 1600; cv.height = 1000;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 1600, 1000);
  g.addColorStop(0, "#2b1f4d"); g.addColorStop(0.5, "#7a4b8c"); g.addColorStop(1, "#e0a458");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 1000);
  ctx.fillStyle = "rgba(255,255,255,.4)";
  for (let i = 0; i < 160; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 1600, Math.random() * 1000, Math.random() * 3 + 1, 0, 7);
    ctx.fill();
  }
  const blob = await new Promise(res => cv.toBlob(res, "image/png"));
  const file = new File([blob], "暮色星河.png", { type: "image/png" });
  r.fileSize = file.size;

  const input = $("#skinFile");
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(1500);

  const thumb = document.querySelector("#skinGrid img");
  r.afterUpload = {
    skinOn: document.body.classList.contains("skin-on"),
    cells: document.querySelectorAll("#skinGrid .skin-cell").length,
    cellOn: document.querySelectorAll("#skinGrid .skin-cell.on").length,
    thumbOk: !!(thumb && String(thumb.src).startsWith("data:image/")),
    thumbLen: thumb ? String(thumb.src).length : 0,
    bgImageSet: /^url\("data:image\//.test($("#bgSkin").style.backgroundImage),
    skinOpacity: $("#bgSkin").style.opacity,
    maskOpacity: $("#bgMask").style.opacity,
    paperT: getComputedStyle(document.documentElement).getPropertyValue("--paper-t").trim(),
    topbarBg: getComputedStyle(document.querySelector(".topbar")).backgroundColor,
    sidebarBg: getComputedStyle($("#sidebar")).backgroundColor,
    proseBg: getComputedStyle($("#reader")).backgroundColor,
    bgSettings: JSON.parse(JSON.stringify(settings.bg)),
    skinName: (settings.skins[0] || {}).name
  };

  /* ---- 2) 滑块：压暗 / 模糊 / 衬底 立刻生效 ---- */
  const setRange = async (sel, v) => {
    const el = $(sel); el.value = String(v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(60);
  };
  await setRange("#skinDim", 70);
  await setRange("#skinBlur", 6);
  await setRange("#skinPaper", 80);
  r.afterSliders = {
    maskOpacity: $("#bgMask").style.opacity,
    filter: $("#bgSkin").style.filter,
    paperT: getComputedStyle(document.documentElement).getPropertyValue("--paper-t").trim(),
    labelDim: $("#vSkinDim").textContent,
    labelBlur: $("#vSkinBlur").textContent,
    labelPaper: $("#vSkinPaper").textContent,
    blurVal: settings.bg.blur
  };

  /* ---- 3) 显示方式切换 ---- */
  $("#skinFit").value = "repeat";
  $("#skinFit").dispatchEvent(new Event("change", { bubbles: true }));
  await wait(80);
  r.fit = { size: $("#bgSkin").style.backgroundSize, repeat: $("#bgSkin").style.backgroundRepeat, v: settings.bg.fit };
  $("#skinFit").value = "cover";
  $("#skinFit").dispatchEvent(new Event("change", { bubbles: true }));
  await wait(60);

  /* ---- 4) 保存一套配置 ---- */
  $("#profName").value = "夜读·紫";
  $("#btnProfSave").click();
  await wait(250);
  r.saved = {
    items: document.querySelectorAll("#profList .prof-item").length,
    name: (document.querySelector("#profList .pn") || {}).textContent,
    lsCount: (JSON.parse(localStorage.getItem("mdnr.profiles.v1") || "[]") || []).length,
    cfgFs: (JSON.parse(localStorage.getItem("mdnr.profiles.v1") || "[]")[0] || {}).cfg.fs,
    cfgHasSkin: !!((JSON.parse(localStorage.getItem("mdnr.profiles.v1") || "[]")[0] || {}).cfg.bg.skinId)
  };

  /* ---- 5) 改乱设置，再套用回来 ---- */
  settings.fs = 32; settings.theme = { name: "纸白", bg: "#fbfaf7", fg: "#2b2b2b", accent: "#c05a3e" };
  applyTheme(); applyTypography(); syncControls();
  await wait(120);
  r.dirty = { fs: settings.fs, theme: settings.theme.name };

  $("#profList [data-apply]").click();
  await wait(900);
  r.afterApply = {
    fs: settings.fs,
    theme: settings.theme.name,
    skinOn: document.body.classList.contains("skin-on"),
    maskOpacity: $("#bgMask").style.opacity,
    readerFs: getComputedStyle($("#reader")).fontSize
  };

  /* ---- 6) 落盘：config.json ---- */
  await new Promise(res => setTimeout(res, 600));
  try {
    const c = await window.nativeFS.getConfig();
    r.disk = {
      path: c && c.path,
      hasSettings: !!(c && c.data && c.data.settings),
      fs: c && c.data && c.data.settings && c.data.settings.fs,
      skinId: c && c.data && c.data.settings && c.data.settings.bg && c.data.settings.bg.skinId,
      skins: c && c.data && c.data.settings && c.data.settings.skins && c.data.settings.skins.length,
      profiles: c && c.data && c.data.profiles && c.data.profiles.length
    };
  } catch (e) { r.diskErr = e.message; }

  return JSON.stringify(r);
})()
