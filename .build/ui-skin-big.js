/* 大图（4000×2600）上传：应被压缩后存下，且能正常显示 */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);

  const cv = document.createElement("canvas");
  cv.width = 4000; cv.height = 2600;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 4000, 2600);
  g.addColorStop(0, "#0b1020"); g.addColorStop(1, "#c9773f");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4000, 2600);
  ctx.fillStyle = "rgba(255,255,255,.5)";
  for (let i = 0; i < 900; i++) {
    ctx.beginPath(); ctx.arc(Math.random() * 4000, Math.random() * 2600, Math.random() * 4 + 1, 0, 7); ctx.fill();
  }
  const blob = await new Promise(res => cv.toBlob(res, "image/png"));
  const file = new File([blob], "超大星空.png", { type: "image/png" });

  const input = $("#skinFile");
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  const t0 = performance.now();
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(2200);
  const ms = Math.round(performance.now() - t0);

  const id = (settings.skins[0] || {}).id;
  const stored = id ? await idbGet("skin:" + id) : "";
  const img = document.querySelector("#skinGrid img");

  return JSON.stringify({
    fileBytes: file.size,
    storedLen: String(stored || "").length,
    ratio: +(String(stored || "").length / file.size).toFixed(2),
    mime: String(stored || "").slice(0, 22),
    skinOn: document.body.classList.contains("skin-on"),
    thumbOk: !!(img && img.src.length > 100),
    ms: ms
  });
})()
