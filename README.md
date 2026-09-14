# HioBuy Package Tracking Demo

A simple developer demo showing how to query package tracking information using the HioBuy Tracking API.

It demonstrates how to retrieve normalized shipment status and tracking events using a logistics tracking number, warehouse order number, or client order number.

## Demo

Live Demo: [https://tracking.demo.hiobuy.com/](https://tracking.demo.hiobuy.com/)

The demo includes:

- Package tracking lookup
- Normalized shipment status
- Tracking event timeline
- Shipping channel information
- Shareable tracking result URLs
- Developer View with request and response examples
- Built-in demo data for testing without an API key

## Tracking API

The demo uses the HioBuy Tracking API:

```http
GET https://api.hiobuy.com/v1/fulfillment/tracking?sn={sn}
```

`sn` can be:

- Logistics tracking number
- Warehouse order number
- Client order number

Example:

```bash
curl "https://api.hiobuy.com/v1/fulfillment/tracking?sn=YOUR_TRACKING_NUMBER" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

The API returns normalized tracking information across supported shipping channels, including shipment status and tracking events.

## Run locally

### Requirements

- Node.js 20+
- pnpm
- HioBuy API key

Clone the repository:

```bash
git clone https://github.com/hiobuy/tracking-demo.git
cd tracking-demo
```

Install dependencies:

```bash
pnpm install
```

Create your local environment file:

```bash
cp .env.example .env.local
```

Add your HioBuy API key:

```env
HIOBUY_API_KEY=your_api_key
```

Start the development server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

## How it works

The browser calls the local endpoint:

```text
/api/tracking?sn={tracking-number}
```

The Next.js server securely adds the HioBuy API key and forwards the request to:

```http
GET https://api.hiobuy.com/v1/fulfillment/tracking?sn={sn}
```

This keeps the HioBuy API key out of browser-side code.

The tracking number is forwarded unchanged to HioBuy and can represent a logistics tracking number, warehouse order number, or client order number.

## Environment variables

### `HIOBUY_API_KEY`

Required for live tracking requests.

The API key is used only by the server and should never be exposed in browser-side code.

Do not rename it to a `NEXT_PUBLIC_*` environment variable.

### `HIOBUY_API_BASE_URL`

Optional.

Default:

```text
https://api.hiobuy.com
```

This can be changed if you need to use another HioBuy API environment.

## Demo data

The repository includes local demo shipments for testing the interface without configuring an API key.

Available demo states include:

- In Transit
- Delivered
- Exception
- No Result

Only the example tracking numbers displayed under **Demo data** use local responses.

All other tracking numbers are sent to the live HioBuy Tracking API.

## Developer View

The tracking result page includes a Developer View that shows:

- The public proxy request
- A sanitized normalized response
- Shipment and order identifiers
- Tracking status and events
- Request ID

The upstream HioBuy API key and `Authorization` header are never exposed to the browser.

## Useful commands

```bash
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## HioBuy Developer Resources

- [HioBuy](https://hiobuy.com)
- [HioBuy Developer Platform](https://developers.hiobuy.com)
- [HioBuy GitHub](https://github.com/hiobuy)

## License

MIT
