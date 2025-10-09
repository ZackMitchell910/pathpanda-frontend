// Only enable when URL has ?debug=1
if (typeof window !== "undefined" && new URLSearchParams(location.search).has("debug")) {
  const show = (title: string, msg: string) => {
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;z-index:99999;top:8px;right:8px;max-width:520px;background:#160b0b;color:#ffd7d7;border:1px solid #ff6b6b;padding:10px 12px;border-radius:10px;font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;";
    el.innerHTML = `<b>${title}</b><pre style="white-space:pre-wrap;margin:6px 0 0">${msg}</pre>`;
    document.body.appendChild(el);
  };

  window.addEventListener("error", (e) => show("window.onerror", e.error?.stack || e.message));
  window.addEventListener("unhandledrejection", (e: any) => {
    const r = e?.reason;
    show("unhandledrejection", (r?.stack || r?.message || String(r)));
  });
}
