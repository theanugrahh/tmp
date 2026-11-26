import { describe, expect, it } from "vitest";
import { computeMetrics } from "./metrics";
import { buildSession } from "./session";
import type { TypingEvent } from "./types";

describe("session export", () => {
	it("bundles sentence, events, and metrics behind a versioned shape", () => {
		const events: TypingEvent[] = [
			{ type: "down", key: "a", t: 0 },
			{ type: "up", key: "a", t: 80 },
		];
		const metrics = computeMetrics(events);
		const session = buildSession(events, metrics, "Sample sentence");
		expect(session.version).toBe(1);
		expect(session.sentence).toBe("Sample sentence");
		expect(session.events).toEqual(events);
		expect(session.metrics).toEqual(metrics);
		expect(session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
