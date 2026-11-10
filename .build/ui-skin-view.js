/* 皮肤面板外观：上传一张图 → 打开设置并滚到「背景皮肤」 */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);

  const cv = document.createElement("canvas");
  cv.width = 1800; cv.height = 1200;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 1800, 1200);
  g.addColorStop(0, "#1b2a4a"); g.addColorStop(0.45, "#5c4a7d"); g.addColorStop(1, "#d9895b");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1800, 1200);
  // 一点山影 + 星点，像张风景图
  ctx.fillStyle = "rgba(10,14,24,.55)";
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(0, 1200);
    for (let x = 0; x <= 1800; x += 60) {
      ctx.lineTo(x, 900 - k * 90 + Math.sin(x / 220 + k) * 70);
    }
    ctx.lineTo(1800, 1200); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.5;
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,.75)";
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 1800, Math.random() * 620, Math.random() * 2 + 0.6, 0, 7);
    ctx.fill();
  }
  const blob = await new Promise(res => cv.toBlob(res, "image/png"));
  const file = new File([blob], "暮色山河.png", { type: "image/png" });

  const input = $("#skinFile");
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(1400);

  // 再存一套配置，让面板里既有皮肤也有配置
  $("#profName").value = "夜读·紫";
  $("#btnProfSave").click();
  await wait(260);

  $("#settingsPanel").classList.add("show");
  await wait(420);
  const body = $(".panel-body");
  const sec = Array.from(body.querySelectorAll("section")).find(s => s.querySelector("h4") && s.querySelector("h4").textContent.includes("背景皮肤"));
  if (sec) body.scrollTop = sec.offsetTop - 8;
  await wait(600);

  return JSON.stringify({
    skins: document.querySelectorAll("#skinGrid .skin-cell").length,
    on: document.body.classList.contains("skin-on"),
    maskOpacity: $("#bgMask").style.opacity,
    skinOpacity: $("#bgSkin").style.opacity,
    paperT: getComputedStyle(document.documentElement).getPropertyValue("--paper-t").trim(),
    profItems: document.querySelectorAll("#profList .prof-item").length,
    scrollTop: body.scrollTop
  });
})()
