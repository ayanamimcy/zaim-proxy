# Zaim Proxy (Cloudflare Worker)

Cloudflare Worker that proxies to the Zaim API using OAuth1 (HMAC-SHA1), with optional API-key gate and OpenAPI docs via chanfana/Hono.

## Endpoints

- `POST /payment` — create a payment. Body: `{ category_id, genre_id, amount, comment?, date?, from_account_id? }`. Optional API key header (default `x-api-key`, overridable via `API_KEY_HEADER`).
- `GET /genre` — list genres.
- `GET /category` — list categories.
- `GET /account` — list accounts.

All requests accept an optional API key header when you set `API_KEY`; the header name defaults to `x-api-key` unless `API_KEY_HEADER` overrides it.

## Setup

1) Install: `npm install`
2) Login: `npx wrangler login`
3) Set secrets:

```bash
npx wrangler secret put ZAIM_CONSUMER_KEY
npx wrangler secret put ZAIM_CONSUMER_SECRET
npx wrangler secret put ZAIM_ACCESS_TOKEN
npx wrangler secret put ZAIM_ACCESS_TOKEN_SECRET
# optional
npx wrangler secret put API_KEY
npx wrangler secret put API_KEY_HEADER # optional header name override (default: x-api-key)
```

## Develop & Deploy

- Local dev (Swagger UI at `/`): `npm run dev`
- Type check: `npm run tsc -- --noEmit`
- Deploy: `npm run deploy`

## How it works

- OAuth1 signing is done in `src/lib/zaimClient.ts` (nonce/timestamp, HMAC-SHA1, Authorization header).
- Routes are registered in `src/index.ts`; schemas live in `src/types.ts`.
- Endpoint handlers live in `src/endpoints/` and forward to Zaim.
