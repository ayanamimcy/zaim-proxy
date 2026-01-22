import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { ApiKeyQuery, AppContext } from "../types";
import { isApiKeyValid, zaimRequest } from "../lib/zaimClient";

export class GenreList extends OpenAPIRoute {
	schema = {
		tags: ["Zaim"],
		summary: "Fetch genre list from Zaim",
		request: {
			query: ApiKeyQuery,
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

		let response: Response;
		let json: unknown;
		try {
			({ response, json } = await zaimRequest(c.env, "GET", "/home/genre"));
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
