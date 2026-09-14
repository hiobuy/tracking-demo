import type { TrackingEvent } from "./tracking-types.ts";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  WAIT_PAYMENT: "Awaiting payment",
  WAIT_SHIP: "Awaiting shipment",
  SHIPPED: "Shipped",
  SIGNED: "Delivered",
  CANCELLED: "Cancelled",
};

const LEGACY_STATUS_LABELS: Record<string, string> = {
  待处理: "Pending",
  待付款: "Awaiting payment",
  待支付: "Awaiting payment",
  待发货: "Awaiting shipment",
  已发货: "Shipped",
  已签收: "Delivered",
  已取消: "Cancelled",
  已作废: "Cancelled",
};

const LEGACY_TIMELINE_CODES: Record<string, string> = {
  ORDER_CREATED: "SHIPMENT_CREATED",
  WAREHOUSE_PACKED: "SHIPMENT_PACKED",
  ORDER_PAID: "SHIPMENT_PAID",
  ORDER_SHIPPED: "SHIPMENT_DISPATCHED",
  ORDER_SIGNED: "SHIPMENT_SIGNED",
  ORDER_VOIDED: "SHIPMENT_CANCELLED",
  ORDER_ARRIVED_PICKUP_STATION: "PICKUP_STATION_ARRIVED",
  ORDER_PICKUP_STATION_SHELVED: "PICKUP_STATION_SHELVED",
  ORDER_PICKUP_STATION_CHECKED_OUT: "PICKUP_STATION_CHECKED_OUT",
  ORDER_PICKUP_STATION_TRANSFERRED_OUT: "PICKUP_STATION_TRANSFERRED_OUT",
  ORDER_SORTED_DISTRIBUTION_CENTER: "DISTRIBUTION_CENTER_SORTED",
};

const TIMELINE_LABELS: Record<string, string> = {
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

const PICKUP_LABELS: Record<string, string> = {
  PICKUP_STATION_ARRIVED: "Arrived at pickup station",
  PICKUP_STATION_SHELVED: "Shelved at pickup station",
  PICKUP_STATION_CHECKED_OUT: "Checked out from pickup station",
  PICKUP_STATION_TRANSFERRED_OUT: "Transferred out of pickup station",
};

const LEGACY_TIMELINE_LABELS: Record<string, string> = {
  订单已创建: "Shipment created",
  仓库已打包: "Shipment packed",
  订单已支付: "Payment received",
  已发货: "Shipment dispatched",
  发货单已发货: "Shipment dispatched",
  订单已发货: "Shipment dispatched",
  订单已签收: "Shipment delivered",
  订单已取消: "Shipment cancelled",
  订单已作废: "Shipment cancelled",
  订单已到达自提点: "Arrived at pickup station",
  订单已在自提点上架: "Shelved at pickup station",
  订单已从自提点出库: "Checked out from pickup station",
  订单已从自提点转出: "Transferred out of pickup station",
  订单已在分拨中心分拣: "Sorted at distribution center",
};

function code(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

export function localizeShipmentStatus(status: string, fallback: string): string {
  return STATUS_LABELS[code(status)] ?? LEGACY_STATUS_LABELS[fallback.trim()] ?? fallback;
}

export function localizeTimelineLabel(event: TrackingEvent): string {
  const rawCode = code(event.status);
  const standardCode = LEGACY_TIMELINE_CODES[rawCode] ?? rawCode;
  const pickupLabel = PICKUP_LABELS[standardCode];

  if (pickupLabel) {
    if (event.station_name) return `${pickupLabel} · ${event.station_name}`;
    return LEGACY_TIMELINE_LABELS[event.label.trim()] ?? event.label;
  }

  return TIMELINE_LABELS[standardCode]
    ?? LEGACY_TIMELINE_LABELS[event.label.trim()]
    ?? event.label;
}
