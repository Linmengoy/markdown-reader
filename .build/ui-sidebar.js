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
    width: Math.round(sb.getBoundingClientRect().width),
    left: Math.round(sb.getBoundingClientRect().left)
  });

  r.boot = snap("boot");                 // 干净配置：应展开

  btn.click();                            // 手动收起
  await wait(420);
  r.afterClickCollapse = snap("collapse");

  btn.click();                            // 再展开
  await wait(420);
  r.afterClickExpand = snap("expand");

  // 收起状态 + 进源码全屏 + 退出，验证退出后仍保持「收起」这个偏好
  btn.click();
  await wait(360);
  r.beforeSource = snap("beforeSource");
  setMode("source");
  await wait(420);
  r.inSource = snap("inSource");
  setMode("edit");
  await wait(420);
  r.afterSource = snap("afterSource");    // 期望 collapsed=true（按偏好还原）

  // 切回展开，留给重启验证
  if(sb.classList.contains("collapsed")) { btn.click(); await wait(300); }
  r.leftExpanded = snap("leftExpanded");

  // 手动收起，作为重启前的最终状态
  btn.click();
  await wait(360);
  r.beforeRestart = snap("beforeRestart"); // 期望 collapsed=true
  return JSON.stringify(r);
})()
