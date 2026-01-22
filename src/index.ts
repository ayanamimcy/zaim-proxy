import { fromHono } from "chanfana";
import { Hono } from "hono";
import { AccountList } from "./endpoints/accountList";
import { CategoryList } from "./endpoints/categoryList";
import { GenreList } from "./endpoints/genreList";
import { PaymentCreate } from "./endpoints/paymentCreate";
import type { WorkerEnv } from "./types";

// Start a Hono app
const app = new Hono<{ Bindings: WorkerEnv }>();

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

// Register OpenAPI endpoints
openapi.post("/payment", PaymentCreate);
openapi.get("/genre", GenreList);
openapi.get("/category", CategoryList);
openapi.get("/account", AccountList);

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;
