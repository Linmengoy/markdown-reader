/* 浅色主题（纸白）下的皮肤观感 */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  await wait(400);

  settings.theme = { name: "纸白", bg: "#fbfaf7", fg: "#2b2b2b", accent: "#c05a3e" };
  settings.bg.paper = 72; settings.bg.dim = 30;
  applyTheme(); applySkin(); syncControls(); saveSettings();
  await wait(400);

  return JSON.stringify({
    skinOn: document.body.classList.contains("skin-on"),
    paperT: getComputedStyle(document.documentElement).getPropertyValue("--paper-t").trim(),
    topbarBg: getComputedStyle(document.querySelector(".topbar")).backgroundColor,
    proseBg: getComputedStyle($("#reader")).backgroundColor,
    fg: getComputedStyle($("#reader")).color,
    maskOpacity: $("#bgMask").style.opacity
  });
})()
