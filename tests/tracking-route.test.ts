import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { GET } from "../src/app/api/tracking/route.ts";

const originalApiKey = process.env.HIOBUY_API_KEY;
const originalBaseUrl = process.env.HIOBUY_API_BASE_URL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.HIOBUY_API_KEY;
  else process.env.HIOBUY_API_KEY = originalApiKey;

  if (originalBaseUrl === undefined) delete process.env.HIOBUY_API_BASE_URL;
  else process.env.HIOBUY_API_BASE_URL = originalBaseUrl;

  globalThis.fetch = originalFetch;
});

test("returns an explicit configuration error when the server API key is missing", async () => {
  delete process.env.HIOBUY_API_KEY;
  let upstreamCalled = false;
  globalThis.fetch = async () => {
    upstreamCalled = true;
    throw new Error("unexpected upstream call");
  };

  const response = await GET(new Request("http://localhost/api/tracking?sn=ORDER-1"));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error.code, "TRACKING_NOT_CONFIGURED");
  assert.equal(upstreamCalled, false);
});

test("encodes sn, authenticates upstream, and returns a sanitized normalized response", async () => {
  process.env.HIOBUY_API_KEY = "test_key";
  process.env.HIOBUY_API_BASE_URL = "https://api.hiobuy.com";
  const serialNumber = "ORDER / 中文?&";
  let capturedUrl: URL | undefined;
  let capturedAuthorization: string | null = null;

  globalThis.fetch = async (input, init) => {
    capturedUrl = new URL(input instanceof Request ? input.url : input.toString());
    capturedAuthorization = new Headers(init?.headers).get("authorization");
    return Response.json({
      id: "shipment-123",
      order_sn: "ORDER-1",
      shipping_channel: { code: "UPS", name: "UPS" },
      international_tracking: { logistics_sn: "TRACK-1" },
      status: "IN_TRANSIT",
      status_label: "In transit",
      timeline: [{
        event_time: "2026-09-14T12:00:00Z",
        code: "SHIPMENT_DISPATCHED",
        status: "已发货",
        status_label: "In transit",
        description: "Departed facility",
        location: "New York",
        details: { station_name: "Manhattan Pickup" },
      }],
      request_id: "req-test",
    });
  };

  const query = new URLSearchParams({ sn: serialNumber });
  const response = await GET(new Request(`http://localhost/api/tracking?${query}`));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(capturedUrl?.pathname, "/v1/fulfillment/tracking");
  assert.equal(capturedUrl?.searchParams.get("sn"), serialNumber);
  assert.equal(capturedAuthorization, "Bearer test_key");
  assert.equal(body.data.tracking_number, "TRACK-1");
  assert.equal(body.data.shipping_channel, "UPS");
  assert.equal(body.data.timeline[0].label, "In transit");
  assert.equal(body.data.timeline[0].status, "SHIPMENT_DISPATCHED");
  assert.equal(body.data.timeline[0].station_name, "Manhattan Pickup");
  assert.equal(body.data.source, "live");
  assert.equal(JSON.stringify(body).includes("test_key"), false);
});
