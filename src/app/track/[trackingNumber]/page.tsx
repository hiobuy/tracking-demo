import type { Metadata } from "next";
import { TrackingDetails } from "@/components/package-tracking";

type PageProps = { params: Promise<{ trackingNumber: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { trackingNumber } = await params;
  const value = decodeURIComponent(trackingNumber).toUpperCase();
  return { title: `${value} · HioBuy Package Tracking` };
}

export default async function TrackingPage({ params }: PageProps) {
  const { trackingNumber } = await params;
  return <TrackingDetails trackingNumber={decodeURIComponent(trackingNumber).toUpperCase()} />;
}
