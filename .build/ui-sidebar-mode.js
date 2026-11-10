(async function(){
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(900);
  const r = {};
  const sb = document.getElementById("sidebar");
  const btn = document.getElementById("btnToc");
  const snap = tag => ({
    tag,
    collapsed: sb.classList.contains("collapsed"),
    side: !!settings.side,
    btnOn: btn.classList.contains("on")
  });

  // 强制成「偏好展开」
  settings.side = false; applySidebar(); saveSettings();
  await wait(300);
  r.preferOpen = snap("preferOpen");

  setMode("source"); await wait(400);
  r.sourceAutoCollapse = snap("sourceAutoCollapse");   // 期望 collapsed=true 且 btnOn=false
  setMode("edit"); await wait(400);
  r.backToEdit = snap("backToEdit");                   // 期望回到偏好展开

  // 再强制成「偏好收起」
  settings.side = true; applySidebar(); saveSettings();
  await wait(300);
  r.preferClosed = snap("preferClosed");
  setMode("source"); await wait(400);
  r.sourceAgain = snap("sourceAgain");
  setMode("edit"); await wait(400);
  r.backAgain = snap("backAgain");                     // 期望仍收起

  // 收尾：回到展开，避免影响后续
  settings.side = false; applySidebar(); saveSettings();
  return JSON.stringify(r);
})()
