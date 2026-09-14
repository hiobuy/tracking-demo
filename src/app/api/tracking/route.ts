import type { TrackingEvent, TrackingRecord } from "@/lib/tracking-types";

const DEFAULT_API_BASE_URL = "https://api.hiobuy.com";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return null;
}

function formatLocation(value: unknown): string | null {
  const direct = text(value);
  if (direct) return direct;
  const location = object(value);
  if (!location) return null;
  return [location.city, location.state, location.region, location.country]
    .map(text)
    .filter((part): part is string => Boolean(part))
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(", ") || firstText(location.name, location.label);
}

function normalizeEvent(value: unknown): TrackingEvent | null {
  const event = object(value);
  if (!event) return null;
  const details = object(event.details);
  const status = firstText(event.code, event.event_code, event.status);
  const label = firstText(event.status_label, event.label, event.title, event.event, status, "Tracking update")!;
  return {
    time: firstText(event.time, event.occurred_at, event.event_time, event.timestamp, event.created_at, event.datetime),
    status,
    label,
    description: firstText(event.description, event.message, event.content, event.details),
    location: formatLocation(event.location) ?? firstText(event.location_name, event.city, event.country),
    station_name: firstText(details?.station_name),
  };
}

function shippingChannel(value: unknown): string | null {
  const direct = text(value);
  if (direct) return direct;
  const channel = object(value);
  return channel ? firstText(channel.name, channel.code, channel.label) : null;
}

function trackingNumber(value: unknown, fallback: string): string {
  const direct = text(value);
  if (direct) return direct;
  const tracking = object(value);
  return tracking
    ? firstText(tracking.logistics_sn, tracking.tracking_number, tracking.number, tracking.sn, fallback)!
    : fallback;
}

function unwrap(body: unknown): Record<string, unknown> | null {
  const root = object(body);
  if (!root) return null;
  return object(root.data) ?? object(root.result) ?? root;
}

function requestId(body: unknown, data: Record<string, unknown> | null, response: Response): string | null {
  const root = object(body);
  return firstText(data?.request_id, root?.request_id, response.headers.get("x-request-id"));
}

function errorMessage(body: unknown): string | null {
  const root = object(body);
  const error = object(root?.error);
  return firstText(error?.message, root?.message, root?.detail);
}

function normalizeTracking(body: unknown, sn: string, response: Response): TrackingRecord | null {
  const data = unwrap(body);
  if (!data) return null;
  const timeline = Array.isArray(data.timeline)
    ? data.timeline.map(normalizeEvent).filter((event): event is TrackingEvent => Boolean(event))
    : [];
  const status = firstText(data.status, "UNKNOWN")!;
  const record: TrackingRecord = {
    id: firstText(data.id),
    order_sn: firstText(data.order_sn),
    tracking_number: trackingNumber(data.international_tracking, sn),
    shipping_channel: shippingChannel(data.shipping_channel),
    status,
    status_label: firstText(data.status_label, status.replaceAll("_", " "))!,
    timeline,
    request_id: requestId(body, data, response),
    source: "live",
  };
  const hasShipment = Boolean(record.id || record.order_sn || record.tracking_number !== sn || timeline.length || firstText(data.status));
  return hasShipment ? record : null;
}

export async function GET(request: Request) {
  const sn = new URL(request.url).searchParams.get("sn")?.trim() ?? "";
  if (!sn || sn.length > 200) {
    return json({ error: { code: "INVALID_TRACKING_NUMBER", message: "Enter a tracking number between 1 and 200 characters.", request_id: null } }, 400);
  }

  const apiKey = process.env.HIOBUY_API_KEY?.trim();
  if (!apiKey) {
    return json({ error: { code: "TRACKING_NOT_CONFIGURED", message: "Live tracking is not configured on this server.", request_id: null } }, 503);
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL("/v1/fulfillment/tracking", process.env.HIOBUY_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL);
  } catch {
    return json({ error: { code: "TRACKING_NOT_CONFIGURED", message: "The tracking API base URL is invalid.", request_id: null } }, 503);
  }
  upstreamUrl.searchParams.set("sn", sn);

  let response: Response;
  try {
    response = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return json({ error: { code: "TRACKING_NETWORK_ERROR", message: "The tracking service could not be reached. Try again shortly.", request_id: null } }, 502);
  }

  let body: unknown = null;
  try { body = await response.json(); } catch { body = null; }
  const data = unwrap(body);
  const upstreamRequestId = requestId(body, data, response);

  if (response.status === 401) return json({ error: { code: "TRACKING_AUTH_ERROR", message: "The server tracking credential was rejected.", request_id: upstreamRequestId } }, 401);
  if (response.status === 403) return json({ error: { code: "TRACKING_PERMISSION_ERROR", message: "This API key does not have the tracking:read permission.", request_id: upstreamRequestId } }, 403);
  if (response.status === 404) return json({ error: { code: "TRACKING_NOT_FOUND", message: "No tracking information was found for this number.", request_id: upstreamRequestId } }, 404);
  if (!response.ok) return json({ error: { code: "TRACKING_UPSTREAM_ERROR", message: errorMessage(body) || "The tracking service returned an error. Try again shortly.", request_id: upstreamRequestId } }, 502);

  const root = object(body);
  if (root?.success === false) {
    const code = firstText(object(root.error)?.code, "TRACKING_UPSTREAM_ERROR")!;
    const notFound = /NOT_FOUND|NO_TRACKING/i.test(code);
    return json({ error: { code: notFound ? "TRACKING_NOT_FOUND" : "TRACKING_UPSTREAM_ERROR", message: errorMessage(body) || (notFound ? "No tracking information was found for this number." : "The tracking service returned an error."), request_id: upstreamRequestId } }, notFound ? 404 : 502);
  }

  const record = normalizeTracking(body, sn, response);
  if (!record) return json({ error: { code: "TRACKING_NOT_FOUND", message: "No tracking information was found for this number.", request_id: upstreamRequestId } }, 404);
  return json({ data: record, request_id: record.request_id });
}
