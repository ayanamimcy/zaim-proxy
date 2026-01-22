import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { ApiKeyQuery, AppContext, PaymentBody } from "../types";
import { isApiKeyValid, zaimRequest } from "../lib/zaimClient";

export class PaymentCreate extends OpenAPIRoute {
	schema = {
		tags: ["Zaim"],
		summary: "Create a payment in Zaim",
		request: {
			query: ApiKeyQuery,
			body: {
				content: {
					"application/json": {
						schema: PaymentBody,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Zaim API response",
				content: {
					"application/json": {
						schema: z.unknown(),
					},
				},
			},
			"401": {
				description: "Invalid API key",
				content: {
					"application/json": {
						schema: z.object({ error: z.string() }),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { key } = data.query;

		if (!isApiKeyValid(c.env, key)) {
			return c.json({ error: "Invalid API key" }, 401);
		}

		const payload: Record<string, string | number> = {
			mapping: 1,
			category_id: data.body.category_id,
			genre_id: data.body.genre_id,
			amount: data.body.amount,
			date: data.body.date ?? new Date().toISOString().slice(0, 10),
		};

		if (data.body.comment && data.body.comment.trim().length > 0) {
			payload.comment = data.body.comment;
		}
		if (data.body.from_account_id) {
			payload.from_account_id = data.body.from_account_id;
		}

		let response: Response;
		let json: unknown;
		try {
			({ response, json } = await zaimRequest(
				c.env,
				"POST",
				"/home/money/payment",
				payload,
			));
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return Response.json({ error: message }, { status: 502 });
		}

		if (!response.ok) {
			return Response.json(
				{ error: json, status: response.status },
				{ status: response.status },
			);
		}

		return json;
	}
}
