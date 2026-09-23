(function () {
  var script = document.currentScript;
  if (!script) return;
  var src = script.getAttribute("src") || "";
  var m = src.match(/embed\/([^/]+)\/chat\.js/);
  var tenant = m && m[1];
  if (!tenant) {
    var host = script.getAttribute("data-tenant");
    tenant = host || "";
  }
  if (!tenant) return;
  var base = script.getAttribute("data-base") || "";
  if (!base) {
    try {
      base = new URL(src).origin;
    } catch {
      base = "";
    }
  }
  var iframe = document.createElement("iframe");
  iframe.src = base + "/embed/" + tenant + "/chat";
  iframe.title = "Chat";
  iframe.style.cssText = "position:fixed;bottom:0;right:0;border:0;width:380px;height:520px;z-index:2147483646;";
  document.body.appendChild(iframe);
})();
