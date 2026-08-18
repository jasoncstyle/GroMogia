const SCRIPT = `(function () {
  var script = document.currentScript;
  var trackingId = script && script.getAttribute("data-gromogia-id");
  if (!trackingId) return;
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
  fetch("/api/track", {
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
    keepalive: true
  }).catch(function () {});
})();`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
