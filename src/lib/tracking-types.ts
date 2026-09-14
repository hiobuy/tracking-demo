export type TrackingEvent = {
  time: string | null;
  status: string | null;
  label: string;
  description: string | null;
  location: string | null;
  station_name: string | null;
};

export type TrackingRecord = {
  id: string | null;
  order_sn: string | null;
  tracking_number: string;
  shipping_channel: string | null;
  status: string;
  status_label: string;
  timeline: TrackingEvent[];
  request_id: string | null;
  source: "live" | "demo";
};

export type TrackingSuccessResponse = {
  data: TrackingRecord;
  request_id: string | null;
};

export type TrackingErrorResponse = {
  error: {
    code: string;
    message: string;
    request_id: string | null;
  };
};
