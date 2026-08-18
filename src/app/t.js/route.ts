const SCRIPT = `(function () {
  var script = document.currentScript || document.querySelector("script[data-gromogia-id]");
  var trackingId = script && script.getAttribute("data-gromogia-id");
  if (!trackingId) return;
  var endpoint = "https://gro-mogia.vercel.app/api/track";
  if (script && script.src) {
    try {
      endpoint = new URL("/api/track", script.src).toString();
    } catch (error) {}
  }
  var storageKey = "gromogia_sid";
  var sessionId = null;
  try {
    sessionId = window.localStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2);
      window.localStorage.setItem(storageKey, sessionId);
    }
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
