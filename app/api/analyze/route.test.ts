import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
	return new NextRequest("http://localhost/api/analyze", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

describe("POST /api/analyze", () => {
	it("returns metrics and readout for valid events", async () => {
		const response = await POST(
			makeRequest({
				events: [
					{ type: "down", key: "a", t: 0 },
					{ type: "down", key: "b", t: 100 },
				],
			}),
		);
		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			metrics: { entropy: number };
			readout: string;
		};
		expect(typeof data.readout).toBe("string");
		expect(data.readout).toContain("Entropy");
	});

	it("rejects when there are fewer than two events", async () => {
		const response = await POST(
			makeRequest({ events: [{ type: "down", key: "a", t: 0 }] }),
		);
		expect(response.status).toBe(400);
	});

	it("rejects malformed events", async () => {
		const response = await POST(
			makeRequest({
				events: [
					{ type: "down", key: "a", t: 0 },
					{ type: "up", key: "b", t: "nope" },
				],
			}),
		);
		expect(response.status).toBe(400);
	});

	it("rejects a non-JSON body", async () => {
		const request = new NextRequest("http://localhost/api/analyze", {
			method: "POST",
			body: "<not json>",
		});
		const response = await POST(request);
		expect(response.status).toBe(400);
	});

	it("accepts varied-gap events and returns positive human-likeness", async () => {
		const times = [0, 40, 320, 410, 650];
		const events = times.map((t, i) => ({ type: "down", key: `k${i}`, t }));
		const response = await POST(makeRequest({ events }));
		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			metrics: { humanScore: number; entropy: number };
		};
		expect(data.metrics.humanScore).toBeGreaterThan(0);
		expect(data.metrics.entropy).toBeGreaterThan(1);
	});
});
