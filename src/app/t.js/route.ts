import { CURRENT_VERCEL_URL } from "@/lib/brand";

const SCRIPT = `(function () {
  var script = document.currentScript || document.querySelector("script[data-groovgro-id],script[data-gromogia-id]");
  var trackingId = script && (script.getAttribute("data-groovgro-id") || script.getAttribute("data-gromogia-id"));
  if (!trackingId) return;
  var endpoint = "${CURRENT_VERCEL_URL}/api/track";
  if (script && script.src) {
    try {
      endpoint = new URL("/api/track", script.src).toString();
    } catch (error) {}
  }
  var sessionId = null;
  try {
    sessionId = window.localStorage.getItem("groovgro_sid") || window.localStorage.getItem("gromogia_sid");
    if (!sessionId) {
      sessionId = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2);
    }
    window.localStorage.setItem("groovgro_sid", sessionId);
  } catch (error) {
    sessionId = String(Date.now());
  }
  var params = new URLSearchParams(window.location.search);
  try {
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
      var value = params.get(key);
      if (value) window.localStorage.setItem("groovgro_" + key, value);
    });
  } catch (error) {}
  function remembered(key) {
    try { return window.localStorage.getItem("groovgro_" + key); } catch (error) { return null; }
  }
  var utmSource = params.get("utm_source") || remembered("utm_source");
  var utmMedium = params.get("utm_medium") || remembered("utm_medium");
  var utmCampaign = params.get("utm_campaign") || remembered("utm_campaign");
  fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      trackingId: trackingId,
      sessionId: sessionId,
      landingPage: window.location.href,
      referrer: document.referrer,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      channel: utmSource || undefined
    }),
    keepalive: true,
    mode: "cors"
  }).catch(function () {});
})();`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=60",
      "access-control-allow-origin": "*",
    },
  });
}
