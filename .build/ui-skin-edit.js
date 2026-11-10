/* 编辑模式 + 浅色主题下的皮肤观感 */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  await wait(300);
  if (window.__LIGHTTEST) { settings.theme = {name:"纸白",bg:"#fbfaf7",fg:"#2b2b2b",accent:"#c05a3e"}; applyTheme(); saveSettings(); }

  const light = (location.hash === "#light") || window.__LIGHT === true;
  if (light) {
    settings.theme = { name: "纸白", bg: "#fbfaf7", fg: "#2b2b2b", accent: "#c05a3e" };
    applyTheme(); saveSettings();
  }
  setMode("edit");
  await wait(900);
  const ed = $("#editor");
  return JSON.stringify({
    light: light,
    skinOn: document.body.classList.contains("skin-on"),
    srcBg: getComputedStyle(ed).backgroundColor,
    paneSrcBg: getComputedStyle($(".pane.src")).backgroundColor,
    pvBg: getComputedStyle($("#preview")).backgroundColor,
    paperT: getComputedStyle(document.documentElement).getPropertyValue("--paper-t").trim(),
    maskOpacity: $("#bgMask").style.opacity
  });
})()
