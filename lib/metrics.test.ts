import { describe, expect, it } from "vitest";
import { computeMetrics, generateReadout } from "./metrics";
import type { TypingEvent } from "./types";

describe("computeMetrics", () => {
	it("flags constant intervals as machine-like", () => {
		const events: TypingEvent[] = [
			{ type: "down", key: "a", t: 0 },
			{ type: "down", key: "b", t: 100 },
			{ type: "down", key: "c", t: 200 },
		];
		const metrics = computeMetrics(events);
		expect(metrics.entropy).toBe(0);
		expect(metrics.regularity).toBe(5);
		expect(metrics.humanScore).toBe(0);
		expect(metrics.flags).toContain("machine-like");
	});

	it("gives high entropy and high human-likeness for varied gaps", () => {
		const times = [0, 40, 320, 410, 650, 700, 920, 1030, 1230, 1300];
		const events: TypingEvent[] = times.map((t, i) => ({
			type: "down" as const,
			key: `k${i}`,
			t,
		}));
		const metrics = computeMetrics(events);
		expect(metrics.entropy).toBeGreaterThan(2.5);
		expect(metrics.humanScore).toBeGreaterThan(0);
		expect(metrics.flags).not.toContain("machine-like");
	});

	it("computes backspace rate against tracked keydowns", () => {
		const events: TypingEvent[] = [
			{ type: "down", key: "a", t: 0 },
			{ type: "down", key: "Backspace", t: 10 },
			{ type: "down", key: "b", t: 50 },
		];
		const metrics = computeMetrics(events);
		expect(metrics.backspaceRate).toBeCloseTo(1 / 3, 5);
		expect(metrics.flags).toContain("high-edit-rate");
	});

	it("computes average hold duration across keys", () => {
		const events: TypingEvent[] = [
			{ type: "down", key: "a", t: 0 },
			{ type: "up", key: "a", t: 120 },
			{ type: "down", key: "b", t: 200 },
			{ type: "up", key: "b", t: 250 },
		];
		const metrics = computeMetrics(events);
		expect(metrics.holds).toEqual([120, 50]);
		expect(metrics.avgHoldMs).toBe(85);
	});

	it("handles empty events", () => {
		const metrics = computeMetrics([]);
		expect(metrics.entropy).toBe(0);
		expect(metrics.regularity).toBe(0);
		expect(metrics.humanScore).toBe(0);
		expect(metrics.avgHoldMs).toBe(0);
	});
});

describe("generateReadout", () => {
	it("produces a readout line that includes the metrics", () => {
		const readout = generateReadout(computeMetrics([]));
		expect(typeof readout).toBe("string");
		expect(readout).toContain("Entropy");
	});
});
