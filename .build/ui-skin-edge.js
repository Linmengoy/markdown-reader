/* 边界：删除皮肤后状态归零；配置条目可删除 */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  await wait(400);
  const r = { before: { cells: document.querySelectorAll("#skinGrid .skin-cell").length, on: document.body.classList.contains("skin-on") } };

  // 删掉唯一的皮肤
  const del = document.querySelector("#skinGrid .del");
  if (del) {
    del.click();
    await wait(900);
  }
  r.afterDel = {
    cells: document.querySelectorAll("#skinGrid .skin-cell").length,
    on: document.body.classList.contains("skin-on"),
    enabled: settings.bg.enabled,
    masks: $("#bgMask").style.opacity,
    skins: (settings.skins || []).length,
    toast: $("#toast").textContent
  };

  // 删掉配置条目
  const rm = document.querySelector("#profList [data-rm]");
  if (rm) {
    rm.click();
    await wait(300);
  }
  r.afterProfDel = {
    items: document.querySelectorAll("#profList .prof-item").length,
    ls: (JSON.parse(localStorage.getItem("mdnr.profiles.v1") || "[]") || []).length,
    empty: !!document.querySelector("#profList .prof-empty")
  };

  await wait(400);
  const c = await window.nativeFS.getConfig();
  r.disk = {
    skins: c.data.settings.skins.length,
    enabled: c.data.settings.bg.enabled,
    profiles: c.data.profiles.length
  };
  return JSON.stringify(r);
})()
