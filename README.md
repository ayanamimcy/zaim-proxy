# Zaim Proxy (Cloudflare Worker)

Cloudflare Worker that proxies to the Zaim API using OAuth1 (HMAC-SHA1), with optional API-key gate and OpenAPI docs via chanfana/Hono.

## Endpoints

- `POST /payment` — create a payment. Body: `{ category_id, genre_id, amount, comment?, date?, from_account_id? }`. Optional query `key` for API key.
- `GET /genre` — list genres.
- `GET /category` — list categories.
- `GET /account` — list accounts.

All requests accept optional `?key=YOUR_API_KEY` when you set `API_KEY` in the worker environment.

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
```

## Develop & Deploy

- Local dev (Swagger UI at `/`): `npm run dev`
- Type check: `npm run tsc -- --noEmit`
- Deploy: `npm run deploy`

## How it works

- OAuth1 signing is done in `src/lib/zaimClient.ts` (nonce/timestamp, HMAC-SHA1, Authorization header).
- Routes are registered in `src/index.ts`; schemas live in `src/types.ts`.
- Endpoint handlers live in `src/endpoints/` and forward to Zaim.
