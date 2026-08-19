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
  fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      trackingId: trackingId,
      sessionId: sessionId,
      landingPage: window.location.href,
      referrer: document.referrer,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      channel: params.get("utm_source") || undefined
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
