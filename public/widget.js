(function () {
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var merchantId = new URL(script.src).searchParams.get("id");
  if (!merchantId) return;

  var SUPABASE_URL = "https://piuaelsbocjtpdwzykfe.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdWFlbHNib2NqdHBkd3p5a2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjkyMzcsImV4cCI6MjA5MDU0NTIzN30.utJZqywFyX9FUlBcy-pWqlcY6eK_nwgGfiKts1h3nXs";

  function fetchBusiness(id, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", SUPABASE_URL + "/rest/v1/businesses?id=eq." + encodeURIComponent(id) + "&select=id,name,accent_color,slug&limit=1", true);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Authorization", "Bearer " + SUPABASE_KEY);
    xhr.onload = function () {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        if (data && data.length > 0) callback(data[0]);
      }
    };
    xhr.send();
  }

  function injectBanner(business) {
    var accentColor = business.accent_color || "#F59E0B";
    var joinUrl = window.location.origin + "/b/" + business.id;
    if (business.slug) {
      joinUrl = "https://app.fidelispro.fr/b/" + business.id;
    }

    var banner = document.createElement("div");
    banner.id = "fidelispro-widget";
    banner.style.cssText = [
      "position: fixed",
      "bottom: 20px",
      "left: 50%",
      "transform: translateX(-50%)",
      "z-index: 99999",
      "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "max-width: 420px",
      "width: calc(100% - 40px)",
      "animation: fidelispro-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
    ].join(";");

    var style = document.createElement("style");
    style.textContent = [
      "@keyframes fidelispro-slide-up {",
      "  from { opacity: 0; transform: translateX(-50%) translateY(20px); }",
      "  to { opacity: 1; transform: translateX(-50%) translateY(0); }",
      "}",
      "#fidelispro-widget:hover { transform: translateX(-50%) translateY(-2px); transition: transform 0.2s ease; }",
    ].join("");
    document.head.appendChild(style);

    banner.innerHTML = [
      '<div style="',
      "background: linear-gradient(135deg, " + accentColor + "f0, " + accentColor + "cc);",
      "backdrop-filter: blur(12px);",
      "-webkit-backdrop-filter: blur(12px);",
      "border-radius: 18px;",
      "padding: 14px 18px;",
      "display: flex;",
      "align-items: center;",
      "gap: 14px;",
      "box-shadow: 0 8px 32px " + accentColor + "40, 0 2px 8px rgba(0,0,0,0.15);",
      "border: 1px solid " + accentColor + "30;",
      '">',
      '<div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">',
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
      '<path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>',
      '<path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>',
      "</svg>",
      "</div>",
      '<div style="flex:1;min-width:0;">',
      '<p style="margin:0;color:#fff;font-weight:700;font-size:13px;line-height:1.3;">Rejoignez notre programme de fidélité 🎁</p>',
      '<p style="margin:3px 0 0;color:rgba(255,255,255,0.85);font-size:11px;">' + business.name + " — Cumulez des points à chaque visite</p>",
      "</div>",
      '<a href="' + joinUrl + '" target="_blank" rel="noopener" style="',
      "flex-shrink:0;",
      "background:rgba(255,255,255,0.95);",
      "color:" + accentColor + ";",
      "font-weight:700;",
      "font-size:12px;",
      "padding:8px 14px;",
      "border-radius:10px;",
      "text-decoration:none;",
      "white-space:nowrap;",
      "transition:all 0.15s;",
      '">',
      "Rejoindre →",
      "</a>",
      '<button onclick="document.getElementById(\'fidelispro-widget\').remove()" style="',
      "flex-shrink:0;",
      "background:rgba(255,255,255,0.2);",
      "border:none;",
      "color:#fff;",
      "width:26px;height:26px;",
      "border-radius:8px;",
      "cursor:pointer;",
      "display:flex;align-items:center;justify-content:center;",
      "font-size:14px;",
      "line-height:1;",
      '">✕</button>',
      "</div>",
    ].join("");

    document.body.appendChild(banner);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      fetchBusiness(merchantId, injectBanner);
    });
  } else {
    fetchBusiness(merchantId, injectBanner);
  }
})();
