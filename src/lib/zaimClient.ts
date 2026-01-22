import type { WorkerEnv } from "../types";

type HttpMethod = "GET" | "POST";
type ParamValue = string | number | null | undefined;

const ZAIM_BASE = "https://api.zaim.net/v2";

const percentEncode = (input: string) =>
	encodeURIComponent(input)
		.replace(/!/g, "%21")
		.replace(/\*/g, "%2A")
		.replace(/'/g, "%27")
		.replace(/\(/g, "%28")
		.replace(/\)/g, "%29");

const toBaseString = (
	method: HttpMethod,
	url: string,
	params: Record<string, string>,
) => {
	const normalized = Object.keys(params)
		.sort()
		.map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
		.join("&");

	return [method.toUpperCase(), percentEncode(url), percentEncode(normalized)].join(
		"&",
	);
};

const toBase64 = (buffer: ArrayBuffer) => {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
};

const signBaseString = async (
	baseString: string,
	consumerSecret: string,
	accessTokenSecret: string,
) => {
	const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(signingKey),
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
	return toBase64(signature);
};

const buildOAuthParams = (env: WorkerEnv) => ({
	oauth_consumer_key: env.ZAIM_CONSUMER_KEY,
	oauth_token: env.ZAIM_ACCESS_TOKEN,
	oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
	oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
	oauth_signature_method: "HMAC-SHA1",
	oauth_version: "1.0",
});

const buildAuthHeader = (params: Record<string, string>) =>
	"OAuth " +
	Object.keys(params)
		.sort()
		.map((key) => `${percentEncode(key)}="${percentEncode(params[key])}"`)
		.join(", ");

const filterParams = (params: Record<string, ParamValue>) =>
	Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
		if (value === undefined || value === null || value === "") return acc;
		acc[key] = String(value);
		return acc;
	}, {});

export const isApiKeyValid = (env: WorkerEnv, provided?: string | null) => {
	const expected = env.API_KEY;
	if (!expected) return true;
	return provided === expected;
};

type SecretKey =
	| "ZAIM_CONSUMER_KEY"
	| "ZAIM_CONSUMER_SECRET"
	| "ZAIM_ACCESS_TOKEN"
	| "ZAIM_ACCESS_TOKEN_SECRET";

export const zaimRequest = async (
	env: WorkerEnv,
	method: HttpMethod,
	path: string,
	params: Record<string, ParamValue> = {},
) => {
	const requiredSecrets: SecretKey[] = [
		"ZAIM_CONSUMER_KEY",
		"ZAIM_CONSUMER_SECRET",
		"ZAIM_ACCESS_TOKEN",
		"ZAIM_ACCESS_TOKEN_SECRET",
	];

	const missing = requiredSecrets.filter((key) => {
		const value = env[key];
		return !value || String(value).trim() === "";
	});

	if (missing.length) {
		throw new Error(`Missing required secrets: ${missing.join(", ")}`);
	}

	const url = new URL(`${ZAIM_BASE}${path}`);
	const cleanedParams = filterParams(params);
	const oauthParams = buildOAuthParams(env);

	if (method === "GET") {
		for (const [key, value] of Object.entries(cleanedParams)) {
			url.searchParams.set(key, value);
		}
	}

	const signatureParams = {
		...oauthParams,
		...cleanedParams,
	};

	const baseString = toBaseString(
		method,
		`${url.origin}${url.pathname}`,
		signatureParams,
	);
	const signature = await signBaseString(
		baseString,
		env.ZAIM_CONSUMER_SECRET,
		env.ZAIM_ACCESS_TOKEN_SECRET,
	);
	const authHeader = buildAuthHeader({
		...oauthParams,
		oauth_signature: signature,
	});

	const headers: Record<string, string> = {
		Authorization: authHeader,
		Accept: "application/json",
	};

	let body: string | undefined;
	if (method === "POST") {
		headers["Content-Type"] = "application/x-www-form-urlencoded";
		body = new URLSearchParams(cleanedParams).toString();
	}

	let response: Response;
	try {
		response = await fetch(url.toString(), {
			method,
			headers,
			body,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown fetch error";
		throw new Error(`Zaim fetch failed: ${message}`);
	}

	const text = await response.text();

	let json: unknown;
	try {
		json = text ? JSON.parse(text) : null;
	} catch (_err) {
		json = { raw: text };
	}

	return { response, json } as const;
};
