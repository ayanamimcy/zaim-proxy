import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";
import { getApiKeyFromRequest, isApiKeyValid, zaimRequest } from "../lib/zaimClient";

type MoneyItem = {
	amount?: number | string;
};

const extractDetails = (json: unknown): MoneyItem[] => {
	if (Array.isArray(json)) {
		return json as MoneyItem[];
	}

	if (json && typeof json === "object") {
		const record = json as { money?: unknown };
		if (Array.isArray(record.money)) {
			return record.money as MoneyItem[];
		}
	}

	return [];
};

const computeTotal = (items: MoneyItem[]) => {
	let total = 0;
	for (const item of items) {
		const amount = item?.amount;
		if (typeof amount === "number") {
			total += amount;
			continue;
		}
		if (typeof amount === "string" && amount.trim() !== "") {
			const parsed = Number(amount);
			if (!Number.isNaN(parsed)) {
				total += parsed;
			}
		}
	}
	return total;
};

export class MoneyList extends OpenAPIRoute {
	schema = {
		tags: ["Zaim"],
		summary: "Fetch money list within date range",
		request: {
			query: z.object({
				startDate: z.string().describe("Start date in YYYY-MM-DD"),
				endDate: z.string().describe("End date in YYYY-MM-DD"),
			}),
		},
		responses: {
			"200": {
				description: "Money details and total",
				content: {
					"application/json": {
						schema: z.object({
							details: z.array(z.unknown()),
							total: z.number(),
						}),
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
		const apiKey = getApiKeyFromRequest(c.env, c.req.raw);

		if (!isApiKeyValid(c.env, apiKey)) {
			return c.json({ error: "Invalid API key" }, 401);
		}

		const data = await this.getValidatedData<typeof this.schema>();
		const { startDate, endDate } = data.query as { startDate: string; endDate: string };

		let response: Response;
		let json: unknown;
		try {
			({ response, json } = await zaimRequest(c.env, "GET", "/home/money", {
				mapping: 1,
				mode: "payment",
				start_date: startDate,
				end_date: endDate,
			}));
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

		const details = extractDetails(json);
		const total = computeTotal(details);

		return { details, total };
	}
}
