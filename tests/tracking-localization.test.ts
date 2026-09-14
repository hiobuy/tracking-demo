import assert from "node:assert/strict";
import { test } from "node:test";

import { localizeShipmentStatus, localizeTimelineLabel } from "../src/lib/tracking-localization.ts";
import type { TrackingEvent } from "../src/lib/tracking-types.ts";

function event(status: string | null, label: string, stationName: string | null = null): TrackingEvent {
  return {
    time: null,
    status,
    label,
    description: null,
    location: null,
    station_name: stationName,
  };
}

test("localizes every supported shipment status from its stable code", () => {
  const cases = {
    PENDING: "Pending",
    WAIT_PAYMENT: "Awaiting payment",
    WAIT_SHIP: "Awaiting shipment",
    SHIPPED: "Shipped",
    SIGNED: "Delivered",
    CANCELLED: "Cancelled",
  };

  for (const [status, expected] of Object.entries(cases)) {
    assert.equal(localizeShipmentStatus(status, "上游中文"), expected);
  }
});

test("localizes all standard timeline codes without using the upstream label", () => {
  const cases = {
    SHIPMENT_CREATED: "Shipment created",
    SHIPMENT_PACKED: "Shipment packed",
    SHIPMENT_PAID: "Payment received",
    SHIPMENT_DISPATCHED: "Shipment dispatched",
    SHIPMENT_SIGNED: "Shipment delivered",
    SHIPMENT_CANCELLED: "Shipment cancelled",
    SHIPMENT_INTERCEPTION_REQUESTED: "Interception requested",
    SHIPMENT_INTERCEPTION_PROCESSING: "Interception in progress",
    SHIPMENT_INTERCEPTION_SUCCEEDED: "Interception completed",
    SHIPMENT_INTERCEPTION_FAILED: "Interception failed",
    DISTRIBUTION_CENTER_SORTED: "Sorted at distribution center",
  };

  for (const [status, expected] of Object.entries(cases)) {
    assert.equal(localizeTimelineLabel(event(status, "上游中文")), expected);
  }
});

test("supports legacy timeline codes", () => {
  const cases = {
    ORDER_CREATED: "Shipment created",
    WAREHOUSE_PACKED: "Shipment packed",
    ORDER_PAID: "Payment received",
    ORDER_SHIPPED: "Shipment dispatched",
    ORDER_SIGNED: "Shipment delivered",
    ORDER_VOIDED: "Shipment cancelled",
    ORDER_SORTED_DISTRIBUTION_CENTER: "Sorted at distribution center",
  };

  for (const [status, expected] of Object.entries(cases)) {
    assert.equal(localizeTimelineLabel(event(status, "旧版中文")), expected);
  }
});

test("uses the pickup station name when details are available", () => {
  const standardCases = {
    PICKUP_STATION_ARRIVED: "Arrived at pickup station · Seoul Station",
    PICKUP_STATION_SHELVED: "Shelved at pickup station · Seoul Station",
    PICKUP_STATION_CHECKED_OUT: "Checked out from pickup station · Seoul Station",
    PICKUP_STATION_TRANSFERRED_OUT: "Transferred out of pickup station · Seoul Station",
  };

  for (const [status, expected] of Object.entries(standardCases)) {
    assert.equal(localizeTimelineLabel(event(status, "上游中文", "Seoul Station")), expected);
  }

  assert.equal(
    localizeTimelineLabel(event("ORDER_PICKUP_STATION_SHELVED", "订单已在自提点上架", "Gangnam Hub")),
    "Shelved at pickup station · Gangnam Hub",
  );
});

test("falls back safely for empty codes and old pickup responses", () => {
  assert.equal(localizeTimelineLabel(event(null, "订单已创建")), "Shipment created");
  assert.equal(localizeTimelineLabel(event("", "仓库已打包")), "Shipment packed");
  assert.equal(localizeTimelineLabel(event(null, "发货单已发货")), "Shipment dispatched");
  assert.equal(localizeTimelineLabel(event(null, "未知上游文案")), "未知上游文案");
  assert.equal(
    localizeTimelineLabel(event("ORDER_ARRIVED_PICKUP_STATION", "订单已到达自提点【江南站】")),
    "订单已到达自提点【江南站】",
  );
});

test("keeps unknown English values as the final fallback", () => {
  assert.equal(localizeShipmentStatus("CUSTOM_STATUS", "Custom status"), "Custom status");
  assert.equal(localizeTimelineLabel(event("CUSTOM_EVENT", "Custom event")), "Custom event");
});
