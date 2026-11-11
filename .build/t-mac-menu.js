(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(900);
  const native = !!window.nativeFS;
  const menuApi = typeof window.nativeFS.onMenu === "function";
  let fired = null;
  if (menuApi) window.nativeFS.onMenu(a => { fired = a; });
  return JSON.stringify({ booted: true, native, menuApi, title: document.title });
})()
