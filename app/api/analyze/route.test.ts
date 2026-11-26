import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "./route";

type OpaqueEvent = {
	type: "down" | "up";
	keyId: string;
	t: number;
	repeat?: boolean;
	modifier?: boolean;
	correction?: boolean;
};

function event(
	type: "down" | "up",
	keyId: string,
	t: number,
	extra: Partial<OpaqueEvent> = {},
): OpaqueEvent {
	return { type, keyId, t, modifier: false, correction: false, ...extra };
}

function makeRequest(body: unknown): NextRequest {
	return new NextRequest("http://localhost/api/analyze", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

function fullSample(): OpaqueEvent[] {
	const gaps = [120, 240, 160, 300, 140, 220, 180, 260, 150, 210, 170, 230];
	const events = [event("down", "k0", 0)];
	let t = 0;
	gaps.forEach((gap, index) => {
		t += gap;
		events.push(event("down", `k${index + 1}`, t));
	});
	return events;
}

describe("POST /api/analyze", () => {
	it("returns metrics, explanations, and a readout", async () => {
		const response = await POST(makeRequest({ events: fullSample() }));
		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			metrics: { gaps: number[]; explanations: unknown[] };
			readout: string;
		};
		expect(data.metrics.gaps.length).toBe(12);
		expect(data.metrics.explanations.length).toBeGreaterThan(4);
		expect(data.readout).toContain("bits");
	});

	it("accepts a long-lived capture with a bounded timestamp span", async () => {
		const events = fullSample().map((item) => ({
			...item,
			t: item.t + 700000,
		}));
		const response = await POST(makeRequest({ events }));
		expect(response.status).toBe(200);
	});

	it("rejects timestamps spanning more than ten minutes", async () => {
		const response = await POST(
			makeRequest({
				events: [event("down", "k0", 0), event("down", "k1", 600001)],
			}),
		);
		expect(response.status).toBe(400);
		const data = (await response.json()) as { error: string };
		expect(data.error).toMatch(/span/i);
	});

	it("rejects fewer than two events", async () => {
		const response = await POST(
			makeRequest({ events: [event("down", "k0", 0)] }),
		);
		expect(response.status).toBe(400);
	});

	it("rejects raw key text in the payload", async () => {
		const response = await POST(
			makeRequest({
				events: [
					event("down", "k0", 0),
					{ ...event("down", "k1", 50), key: "a" },
				],
			}),
		);
		expect(response.status).toBe(400);
		const data = (await response.json()) as { error: string };
		expect(data.error).toMatch(/key/i);
	});

	it("rejects malformed events", async () => {
		const response = await POST(
			makeRequest({
				events: [
					event("down", "k0", 0),
					{ ...event("up", "k1", 0), t: "nope" },
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

	it("rejects out-of-order timestamps", async () => {
		const response = await POST(
			makeRequest({
				events: [event("down", "k0", 100), event("down", "k1", 50)],
			}),
		);
		expect(response.status).toBe(422);
		const data = (await response.json()) as { error: string };
		expect(data.error).toMatch(/non-decreasing/i);
	});

	it("rejects more than one thousand events with 413", async () => {
		const events = Array.from({ length: 1001 }, (_, index) =>
			event("down", "k0", index),
		);
		const response = await POST(makeRequest({ events }));
		expect(response.status).toBe(413);
	});

	it("rejects overlong key IDs", async () => {
		const response = await POST(
			makeRequest({
				events: [event("down", "x".repeat(33), 0), event("down", "k1", 50)],
			}),
		);
		expect(response.status).toBe(400);
	});

	it("rejects a sample with fewer than two non-modifier keys", async () => {
		const response = await POST(
			makeRequest({
				events: [event("down", "k0", 0), event("up", "k0", 60)],
			}),
		);
		expect(response.status).toBe(422);
		const data = (await response.json()) as { error: string };
		expect(data.error).toMatch(/two non-modifier/i);
	});

	it("accepts auto-repeat flags", async () => {
		const response = await POST(
			makeRequest({
				events: [
					event("down", "k0", 0),
					event("down", "k0", 40, { repeat: true }),
					event("down", "k1", 120),
				],
			}),
		);
		expect(response.status).toBe(200);
	});
});
