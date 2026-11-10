(async function(){
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(900);
  const P = await window.nativeFS.defaultPaths();
  const f0 = P.temp.replace(/\\/g, "/") + "/mdnr-shot-chapter.md";
  const body = [];
  const lines = [
    "河风把灯影吹得摇晃，他把帆布包往肩上提了提，脚下的木板发出沉闷的声响。",
    "「你来得比说好的早。」老周把竹篙斜插在水里，船身稳稳地停住了。",
    "「路上没耽搁。」",
    "对面岸上有人在等，提着一盏旧马灯，光晕被雾气揉开，像一小团化不开的糖。"
  ];
  for (let i = 0; i < 26; i++) body.push("　　" + lines[i % lines.length]);
  const text = "# 第005章 三天\n\n" + body.join("\n\n") + "\n";
  await window.nativeFS.writeFile(f0, text);

  loadContent(await window.nativeFS.readFile(f0), "第005章-三天.md", vFile(f0, "第005章-三天.md"));
  setMode("edit");
  await wait(500);

  const ed = document.getElementById("editor");
  ed.focus();
  ed.value = ed.value.replace("　　路上没耽搁。", "　　路上没耽搁，就是船钱涨了。");
  ed.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(300);
  const mid = document.getElementById("stSave").textContent;
  await wait(1400);
  const done = document.getElementById("stSave").textContent;

  // 让状态栏露出来：滚到能同时看到正文的位置
  document.getElementById("main").scrollTop = 260;
  await wait(500);

  return JSON.stringify({ mid, done, dirty: state.dirty, file: f0 });
})()
