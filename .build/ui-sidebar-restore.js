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
    btnOn: btn.classList.contains("on"),
    left: Math.round(sb.getBoundingClientRect().left)
  });

  r.afterRestart = snap("afterRestart");     // 期望 collapsed=true

  // 展开（偏好改为 false），再走一遍 源码全屏 → 退出，期望退出后仍展开
  btn.click();
  await wait(360);
  r.expanded = snap("expanded");
  setMode("source");
  await wait(420);
  r.inSource = snap("inSource");             // 源码模式应自动收起
  setMode("edit");
  await wait(420);
  r.afterSourceAgain = snap("afterSourceAgain"); // 期望 collapsed=false（回到偏好）

  // 窄窗口下按钮隐藏判断
  r.btnVisible = getComputedStyle(btn).display !== "none";
  return JSON.stringify(r);
})()
