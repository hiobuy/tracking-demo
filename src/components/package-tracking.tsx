"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  TrackingErrorResponse,
  TrackingRecord,
  TrackingSuccessResponse,
} from "@/lib/tracking-types";
import { localizeShipmentStatus, localizeTimelineLabel } from "@/lib/tracking-localization";

type ExampleKey = "transit" | "delivered" | "exception";
type DemoExample = {
  status: string;
  tracking: string;
  carrier: string;
  origin: [string, string];
  destination: [string, string];
  eta: string;
  updated: string;
  events: readonly (readonly [string, string, string])[];
};
type DisplayRecord = TrackingRecord & {
  origin?: [string, string];
  destination?: [string, string];
  eta?: string;
};
type Issue = {
  code: string;
  message: string;
  request_id: string | null;
};

const examples: Record<ExampleKey, DemoExample> = {
  transit: {
    status: "In Transit",
    tracking: "SF123456789CN",
    carrier: "SF Express",
    origin: ["Weihai", "China"],
    destination: ["Seoul", "South Korea"],
    eta: "Sep 14–16",
    updated: "Sep 11, 2026 · 14:32",
    events: [
      ["Sep 11, 14:32", "In transit", "Shipment departed from Weihai sorting center · Weihai, China"],
      ["Sep 11, 09:18", "Processed at facility", "Weihai, China"],
      ["Sep 10, 18:42", "Picked up", "Package received by carrier · Weihai, China"],
      ["Sep 10, 15:03", "Shipment information received", "Shipping information submitted to carrier"],
    ],
  },
  delivered: {
    status: "Delivered",
    tracking: "HIODMO882193KR",
    carrier: "CJ Logistics",
    origin: ["Weihai", "China"],
    destination: ["Busan", "South Korea"],
    eta: "Delivered Sep 11",
    updated: "Sep 11, 2026 · 16:08",
    events: [
      ["Sep 11, 16:08", "Delivered", "Package delivered to recipient · Busan, South Korea"],
      ["Sep 11, 11:25", "Out for delivery", "Courier is delivering the shipment"],
      ["Sep 11, 07:40", "Arrived at local facility", "Busan, South Korea"],
      ["Sep 10, 21:10", "Customs cleared", "Import customs clearance completed"],
    ],
  },
  exception: {
    status: "Exception",
    tracking: "HIOEXC774420JP",
    carrier: "Yamato",
    origin: ["Weihai", "China"],
    destination: ["Tokyo", "Japan"],
    eta: "Action required",
    updated: "Sep 11, 2026 · 10:12",
    events: [
      ["Sep 11, 10:12", "Delivery exception", "Recipient information requires verification · Tokyo, Japan"],
      ["Sep 11, 07:15", "Arrived at local facility", "Tokyo, Japan"],
      ["Sep 10, 20:32", "Customs cleared", "Import clearance completed"],
      ["Sep 10, 08:20", "Departed origin facility", "Weihai, China"],
    ],
  },
};
const NOT_FOUND_NUMBER = "HIONOTFOUND000";
const LIVE_EXAMPLES = ["JD1234567890", "JIYUNRI400"] as const;

function exampleFor(trackingNumber: string): DemoExample | null {
  return Object.values(examples).find((example) => example.tracking === trackingNumber) ?? null;
}

function demoRecord(example: DemoExample): DisplayRecord {
  return {
    id: "demo-shipment",
    order_sn: "HIO-DEMO-ORDER",
    tracking_number: example.tracking,
    shipping_channel: example.carrier,
    status: example.status.toUpperCase().replaceAll(" ", "_"),
    status_label: example.status,
    timeline: example.events.map(([time, label, description]) => ({
      time,
      status: label.toUpperCase().replaceAll(" ", "_"),
      label,
      description,
      location: null,
      station_name: null,
    })),
    request_id: null,
    source: "demo",
    origin: example.origin,
    destination: example.destination,
    eta: example.eta,
  };
}

function SiteHeader() {
  return <header className="site-header"><div className="container nav"><a className="brand" href="/"><span className="logo">H</span><span className="brand-copy">HioBuy<small>Developer Demo</small></span></a><nav className="navlinks" aria-label="Developer resources"><a className="btn hide-mobile" href="https://hiobuy.com/en/api-docs/fulfillment-tracking" target="_blank" rel="noreferrer">API Docs</a><a className="btn dark" href="https://github.com/hiobuy/tracking-demo" target="_blank" rel="noreferrer">View on GitHub</a></nav></div></header>;
}

function SiteFooter() {
  return <footer className="site-footer"><div className="container footerrow"><div>© 2026 HioBuy Developer Platform</div><div className="footerlinks"><a href="https://hiobuy.com/en/api-docs/fulfillment-tracking" target="_blank" rel="noreferrer">Documentation</a><a href="https://github.com/hiobuy/tracking-demo" target="_blank" rel="noreferrer">GitHub</a><a href="https://hiobuy.com" target="_blank" rel="noreferrer">API Status</a></div></div></footer>;
}

function TrackingSearch() {
  const router = useRouter();
  const [tracking, setTracking] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "open_package_tracking",
      title: "Open package tracking",
      description: "Open the shareable HioBuy tracking result page for one tracking number.",
      inputSchema: { type: "object", properties: { trackingNumber: { type: "string", minLength: 1, maxLength: 200 } }, required: ["trackingNumber"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = typeof input === "object" && input !== null && "trackingNumber" in input ? String((input as { trackingNumber: unknown }).trackingNumber).trim().toUpperCase() : "";
        if (!value || value.length > 200) throw new Error("A tracking number between 1 and 200 characters is required.");
        const resultUrl = `/track/${encodeURIComponent(value)}`;
        router.push(resultUrl);
        return { tracking_number: value, result_url: resultUrl };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [router]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = tracking.trim().toUpperCase();
    if (!value || value.length > 200) {
      setError("Enter a tracking number between 1 and 200 characters.");
      return;
    }
    setError("");
    setLoading(true);
    router.push(`/track/${encodeURIComponent(value)}`);
  }

  return <div>
    <form className="searchbox" onSubmit={submit}><input aria-label="Tracking number" value={tracking} maxLength={200} onChange={(event) => setTracking(event.target.value)} placeholder="Enter tracking number..." autoFocus/><button disabled={loading}>{loading ? "Opening…" : "Track →"}</button></form>
    <div className="examples"><span>Demo data:</span>{(["transit", "delivered", "exception"] as ExampleKey[]).map((key) => <button key={key} className="pill" type="button" onClick={() => router.push(`/track/${examples[key].tracking}`)}>{examples[key].status}</button>)}<button className="pill" type="button" onClick={() => router.push(`/track/${NOT_FOUND_NUMBER}`)}>No Result</button></div>
    <div className="examples live-examples"><span>Live examples:</span>{LIVE_EXAMPLES.map((trackingNumber) => <button key={trackingNumber} className="pill tracking-pill" type="button" onClick={() => router.push(`/track/${trackingNumber}`)}>{trackingNumber}</button>)}</div>
    {error && <div className="search-error" role="alert">{error}</div>}
  </div>;
}

export function TrackingHome() {
  return <><SiteHeader/><main className="container home-main"><section className="hero"><div className="eyebrow"><span className="eyebrow-dot"/>Package Tracking Demo</div><h1>Track a package</h1><p className="hero-copy">Retrieve normalized shipment status and tracking events across supported carriers using the HioBuy API.</p><TrackingSearch/></section><section className="home-note"><div><span>01</span><b>Enter a tracking number</b><p>Use a logistics, warehouse order, or client order number.</p></div><div><span>02</span><b>Open a shareable result</b><p>Every lookup has its own URL.</p></div><div><span>03</span><b>Use normalized events</b><p>One response format across carriers.</p></div></section></main><SiteFooter/></>;
}

export function TrackingDetails({ trackingNumber }: { trackingNumber: string }) {
  const example = exampleFor(trackingNumber);
  if (example) return <TrackingResultPage record={demoRecord(example)}/>;
  if (trackingNumber === NOT_FOUND_NUMBER) return <TrackingIssuePage trackingNumber={trackingNumber} issue={{ code: "DEMO_NOT_FOUND", message: "We couldn’t find any logistics events for this demo shipment yet.", request_id: null }}/>;
  return <LiveTrackingDetails trackingNumber={trackingNumber}/>;
}

function LiveTrackingDetails({ trackingNumber }: { trackingNumber: string }) {
  const [record, setRecord] = useState<TrackingRecord | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const lifecycle = new AbortController();
    setRecord(null);
    setIssue(null);
    fetch(`/api/tracking?${new URLSearchParams({ sn: trackingNumber })}`, { signal: lifecycle.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as TrackingSuccessResponse | TrackingErrorResponse;
        if (!response.ok || "error" in body) {
          const error = "error" in body ? body.error : { code: "TRACKING_UPSTREAM_ERROR", message: "The tracking request failed.", request_id: null };
          throw Object.assign(new Error(error.message), { issue: error });
        }
        setRecord(body.data);
      })
      .catch((reason: Error & { issue?: Issue }) => {
        if (reason.name === "AbortError") return;
        setIssue(reason.issue ?? { code: "TRACKING_NETWORK_ERROR", message: "The tracking service could not be reached. Try again shortly.", request_id: null });
      });
    return () => lifecycle.abort();
  }, [trackingNumber, attempt]);

  if (record) return <TrackingResultPage record={record}/>;
  if (issue) return <TrackingIssuePage trackingNumber={trackingNumber} issue={issue} onRetry={() => setAttempt((value) => value + 1)}/>;
  return <TrackingLoadingPage trackingNumber={trackingNumber}/>;
}

function ResultHeading({ trackingNumber }: { trackingNumber: string }) {
  return <section className="detail-search-heading"><a href="/" className="back-link">← New search</a><h1>Package tracking</h1><p>Tracking result for <strong>{trackingNumber}</strong></p></section>;
}

function TrackingLoadingPage({ trackingNumber }: { trackingNumber: string }) {
  return <><SiteHeader/><main className="container detail-main"><ResultHeading trackingNumber={trackingNumber}/><section className="card tracking-state-card" aria-live="polite" aria-busy="true"><div className="state-spinner"/><h2>Looking up this shipment</h2><p>Requesting the latest tracking events from HioBuy.</p></section></main><SiteFooter/></>;
}

function issueCopy(code: string) {
  if (code === "TRACKING_NOT_CONFIGURED") return { title: "Live tracking is not configured", help: "Add the server-only HIOBUY_API_KEY environment variable, then restart the application." };
  if (code === "TRACKING_AUTH_ERROR") return { title: "Tracking authentication failed", help: "The server credential was rejected. Replace HIOBUY_API_KEY with a valid key." };
  if (code === "TRACKING_PERMISSION_ERROR") return { title: "Tracking permission required", help: "The configured API key needs the tracking:read permission." };
  if (code === "TRACKING_NOT_FOUND" || code === "DEMO_NOT_FOUND") return { title: "No tracking information found", help: "The carrier may not have uploaded its first event, or the number may be incorrect, expired, or unsupported." };
  return { title: "Tracking is temporarily unavailable", help: "The upstream tracking service could not complete this request. Try again shortly." };
}

function TrackingIssuePage({ trackingNumber, issue, onRetry }: { trackingNumber: string; issue: Issue; onRetry?: () => void }) {
  const copy = issueCopy(issue.code);
  const isNotFound = issue.code === "TRACKING_NOT_FOUND" || issue.code === "DEMO_NOT_FOUND";
  return <><SiteHeader/><main className="container detail-main"><ResultHeading trackingNumber={trackingNumber}/><section className="card not-found-card" role="status"><div className="not-found-content"><div className={`not-found-icon ${isNotFound ? "" : "issue-icon"}`} aria-hidden="true">{isNotFound ? "?" : "!"}</div><h2>{copy.title}</h2><p className="not-found-lead">{issue.message}</p><code className="not-found-number">{trackingNumber}</code><div className="not-found-help"><b>What to do</b><p>{copy.help}</p>{issue.request_id && <small>Request ID: {issue.request_id}</small>}</div><div className="not-found-actions"><a className="btn dark" href="/">Try another number</a>{onRetry && <button className="btn" type="button" onClick={onRetry}>Retry request</button>}<a className="btn" href={`/track/${examples.transit.tracking}`}>View demo data</a></div></div></section></main><SiteFooter/></>;
}

function statusClass(status: string): ExampleKey {
  if (/DELIVERED|SIGNED/i.test(status)) return "delivered";
  if (/EXCEPTION|FAILED|ERROR|CANCELLED/i.test(status)) return "exception";
  return "transit";
}

function publicRequestUrl(trackingNumber: string) {
  return `/api/tracking?${new URLSearchParams({ sn: trackingNumber })}`;
}

function TrackingResultPage({ record }: { record: DisplayRecord }) {
  const [tab, setTab] = useState<"response" | "request">("response");
  const [copyLabel, setCopyLabel] = useState("Copy");
  const developerPayload = useMemo(() => ({
    request: { method: "GET", url: publicRequestUrl(record.tracking_number) },
    response: record,
  }), [record]);
  const code = tab === "response"
    ? JSON.stringify(developerPayload.response, null, 2)
    : `fetch(${JSON.stringify(developerPayload.request.url)}, {\n  method: "GET",\n  headers: { "Accept": "application/json" }\n});`;
  const latestTime = record.timeline[0]?.time ?? "—";
  const displayStatus = localizeShipmentStatus(record.status, record.status_label);

  async function copyCode() {
    await navigator.clipboard?.writeText(code);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy"), 1200);
  }

  return <><SiteHeader/><main className="container detail-main"><ResultHeading trackingNumber={record.tracking_number}/>{record.source === "demo" && <div className="demo-data-notice"><strong>Demo data</strong><span>This example does not call the live tracking API.</span></div>}<section className="tracking-grid"><div className="card"><div className="cardhead"><h2>Package Journey</h2><span className={`status ${statusClass(record.status)}`}>{displayStatus}</span></div><div className="journey">{record.origin && record.destination && <div className="route"><div className="city"><b>{record.origin[0]}</b><span>{record.origin[1]}</span></div><div className="arrow">→</div><div className="city"><b>{record.destination[0]}</b><span>{record.destination[1]}</span></div></div>}{record.eta && <div className="eta"><span>Estimated delivery</span><strong>{record.eta}</strong></div>}<div className={`timeline ${record.origin ? "" : "live-timeline"}`}>{record.timeline.length ? record.timeline.map((event, index) => <div className={`event ${index > 1 ? "muted" : ""}`} key={`${event.time}-${event.label}-${index}`}><div className="node"/><div><div className="event-time">{event.time || "Time unavailable"}</div><div className="event-title">{localizeTimelineLabel(event)}</div>{(event.description || event.location) && <div className="event-desc">{[event.description, event.location].filter(Boolean).join(" · ")}</div>}</div></div>) : <div className="timeline-empty">No scan events have been reported yet.</div>}</div></div></div><aside className="card"><div className="cardhead"><h2>Shipment Details</h2></div><div className="details"><Detail label="Status" value={displayStatus}/><Detail label="Tracking Number" value={record.tracking_number}/><Detail label="Order Number" value={record.order_sn || "—"}/><Detail label="Shipping Channel" value={record.shipping_channel || "—"}/><Detail label="Shipment ID" value={record.id || "—"}/><Detail label="Last Updated" value={latestTime}/>{record.request_id && <Detail label="Request ID" value={record.request_id}/>}</div></aside></section><section className="card developer"><div className="devtop"><h2>Developer View</h2><p>Server-proxied request and sanitized response. Authorization is never exposed.</p></div><div className="tabs" role="tablist"><button className={`tab ${tab === "response" ? "active" : ""}`} role="tab" aria-selected={tab === "response"} onClick={() => setTab("response")}>Normalized Response</button><button className={`tab ${tab === "request" ? "active" : ""}`} role="tab" aria-selected={tab === "request"} onClick={() => setTab("request")}>Public API Request</button></div><div className="codewrap"><pre className="codeblock">{code}</pre><button className="copybtn" type="button" onClick={() => void copyCode()}>{copyLabel}</button></div></section><section className="cta"><div><h3>Build package tracking into your product</h3><p>Use the HioBuy API to retrieve normalized shipment status and tracking events.</p></div><div className="actions"><a className="btn" href="https://hiobuy.com/en/api-docs/fulfillment-tracking" target="_blank" rel="noreferrer">View Tracking API Docs</a><a className="btn ghost" href="https://github.com/hiobuy/tracking-demo" target="_blank" rel="noreferrer">View GitHub Examples</a></div></section></main><SiteFooter/></>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="detail"><span>{label}</span><strong>{value}</strong></div>;
}
