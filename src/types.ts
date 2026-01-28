import { Str } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

export type WorkerEnv = Env & {
	ZAIM_CONSUMER_KEY: string;
	ZAIM_CONSUMER_SECRET: string;
	ZAIM_ACCESS_TOKEN: string;
	ZAIM_ACCESS_TOKEN_SECRET: string;
	API_KEY?: string;
	API_KEY_HEADER?: string;
};

export type AppContext = Context<{ Bindings: WorkerEnv }>;

export const DEFAULT_API_KEY_HEADER = "x-api-key";

export const PaymentBody = z.object({
	category_id: z.number().int().describe("Zaim category id"),
	genre_id: z.number().int().describe("Zaim genre id"),
	amount: z.number().int().describe("Payment amount"),
	comment: Str({ required: false, description: "Note for the payment" }),
	date: Str({
		required: false,
		description: "Date in YYYY-MM-DD",
		example: "2026-01-22",
	}),
	from_account_id: z.number().int().describe("Source account id").optional(),
});
