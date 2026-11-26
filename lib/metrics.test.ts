import { describe, expect, it } from "vitest";
import {
	bootstrapCvCi,
	CV_ANCHOR,
	coefficientOfVariation,
	computeMetrics,
	gapEntropyBits,
	generateReadout,
	MIN_GAPS,
	scoreFromCv,
} from "./metrics";
import type { TypingEvent } from "./types";

function fromGaps(gaps: number[], start = 0): TypingEvent[] {
	const events: TypingEvent[] = [{ type: "down", key: "k0", t: start }];
	let t = start;
	gaps.forEach((gap, index) => {
		t += gap;
		events.push({ type: "down", key: `k${index + 1}`, t });
	});
	return events;
}

function withUps(downs: Array<{ key: string; t: number }>): TypingEvent[] {
	const events: TypingEvent[] = [];
	for (const down of downs) {
		events.push({ type: "down", key: down.key, t: down.t });
		events.push({ type: "up", key: down.key, t: down.t + 40 });
	}
	return events;
}

describe("scale anchoring", () => {
	it("scores tiny jitter as near-zero entropy and near-zero variability", () => {
		const metrics = computeMetrics(
			fromGaps(Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 177 : 183))),
		);
		expect(metrics.entropyBits).toBe(0);
		expect(metrics.cv).toBeCloseTo(3 / 180, 5);
		expect(metrics.humanScore).toBeLessThan(0.3);
	});

	it("scores large spread as high entropy and maximum variability", () => {
		const pattern = [60, 120, 240, 360, 480];
		const gaps = [...pattern, ...pattern, ...pattern];
		const metrics = computeMetrics(fromGaps(gaps));
		expect(metrics.entropyBits).toBeGreaterThan(2.2);
		expect(metrics.entropyBits).toBeLessThan(2.5);
		expect(metrics.humanScore).toBe(5);
	});

	it("keeps the same score for the same distribution at different sample sizes", () => {
		const pair = [120, 240];
		const short = computeMetrics(fromGaps(Array(6).fill(pair).flat()));
		const long = computeMetrics(fromGaps(Array(30).fill(pair).flat()));
		expect(short.cv).toBeCloseTo(1 / 3, 10);
		expect(long.cv).toBeCloseTo(1 / 3, 10);
		expect(Math.abs(short.humanScore - long.humanScore)).toBeLessThan(1e-9);
		expect(short.entropyBits).toBeCloseTo(long.entropyBits, 10);
	});

	it("maps coefficient of variation onto the 0-5 scale with a stated anchor", () => {
		expect(scoreFromCv(0)).toBe(0);
		expect(scoreFromCv(CV_ANCHOR / 2)).toBeCloseTo(2.5, 10);
		expect(scoreFromCv(CV_ANCHOR)).toBe(5);
		expect(scoreFromCv(10)).toBe(5);
	});
});

describe("entropy", () => {
	it("uses fixed bins, so identical gaps are zero bits", () => {
		expect(gapEntropyBits([100, 100])).toBe(0);
	});

	it("separates two distinct bins into one bit", () => {
		expect(gapEntropyBits([100, 200])).toBeCloseTo(1, 10);
	});

	it("keeps gaps inside one 25 ms bin at zero bits", () => {
		expect(gapEntropyBits([100, 110, 120])).toBe(0);
	});
});

describe("verdict and flags", () => {
	it("flags constant timing as machine-like with a full sample", () => {
		const metrics = computeMetrics(fromGaps(Array(12).fill(100)));
		expect(metrics.gaps.length).toBe(12);
		expect(metrics.verdict.key).toBe("machine-like");
		expect(metrics.flags).toEqual(["machine-like"]);
		expect(metrics.humanScore).toBe(0);
		expect(metrics.humanScoreCi95).toEqual([0, 0]);
	});

	it("refuses a verdict on short samples and never flags them", () => {
		const metrics = computeMetrics(fromGaps(Array(MIN_GAPS - 1).fill(100)));
		expect(metrics.verdict.key).toBe("insufficient-data");
		expect(metrics.flags).toEqual([]);
		expect(generateReadout(metrics)).toMatch(new RegExp(`${MIN_GAPS} needed`));
	});

	it("keeps the flag list, verdict, and readout in agreement", () => {
		const samples = [
			Array(12).fill(100),
			[120, 240, 160, 300, 140, 220, 180, 260, 150, 210, 170, 230],
			Array(5).fill(150),
			Array(40).fill(200),
			[60, 120, 240, 360, 480, 60, 120, 240, 360, 480, 60, 120],
		];
		for (const gaps of samples) {
			const metrics = computeMetrics(fromGaps(gaps));
			expect(metrics.flags.includes("machine-like")).toBe(
				metrics.verdict.key === "machine-like",
			);
			if (metrics.verdict.key === "insufficient-data") {
				expect(metrics.flags).toEqual([]);
			}
			expect(generateReadout(metrics)).toContain(metrics.verdict.label);
		}
	});

	it("is deterministic", () => {
		const events = fromGaps([120, 240, 160, 300, 140, 220, 180, 260, 150, 210]);
		const first = computeMetrics(events);
		const second = computeMetrics(events);
		expect(first.cvCi95).toEqual(second.cvCi95);
		expect(first.humanScoreCi95).toEqual(second.humanScoreCi95);
	});
});

describe("corrections", () => {
	it("counts one correction among ten keys as ten percent, without double counting key-ups", () => {
		const downs = "abcdefghi".split("").map((key, index) => ({
			key,
			t: index * 100,
		}));
		downs.push({ key: "Backspace", t: 900 });
		const metrics = computeMetrics(withUps(downs));
		expect(metrics.trackedKeys).toBe(10);
		expect(metrics.corrections).toBe(1);
		expect(metrics.backspaceRate).toBeCloseTo(0.1, 10);
		expect(metrics.flags).not.toContain("high-edit-rate");
	});

	it("flags a high edit rate only with a large enough sample", () => {
		const downs = Array.from({ length: 16 }, (_, index) => ({
			key: `k${index}`,
			t: index * 100,
		}));
		downs.push(
			{ key: "Backspace", t: 1600 },
			{ key: "Backspace", t: 1700 },
			{ key: "Backspace", t: 1800 },
			{ key: "Backspace", t: 1900 },
		);
		const metrics = computeMetrics(withUps(downs));
		expect(metrics.trackedKeys).toBe(20);
		expect(metrics.backspaceRate).toBeCloseTo(0.2, 10);
		expect(metrics.flags).toContain("high-edit-rate");
	});
});

describe("holds", () => {
	it("pairs each down with the next up and never goes negative", () => {
		const metrics = computeMetrics([
			{ type: "down", key: "a", t: 0 },
			{ type: "up", key: "a", t: 100 },
			{ type: "down", key: "b", t: 200 },
			{ type: "up", key: "b", t: 260 },
		]);
		expect(metrics.holds).toEqual([100, 60]);
		expect(metrics.avgHoldMs).toBe(80);
		expect(metrics.holds.every((hold) => hold >= 0)).toBe(true);
	});

	it("ignores auto-repeat downs and unpaired key-ups", () => {
		const metrics = computeMetrics([
			{ type: "up", key: "x", t: 10 },
			{ type: "down", key: "a", t: 100 },
			{ type: "down", key: "a", t: 150, repeat: true },
			{ type: "up", key: "a", t: 180 },
		]);
		expect(metrics.holds).toEqual([80]);
	});

	it("drops stuck keys held longer than two seconds", () => {
		const metrics = computeMetrics([
			{ type: "down", key: "a", t: 0 },
			{ type: "up", key: "a", t: 5000 },
		]);
		expect(metrics.holds).toEqual([]);
	});
});

describe("gaps and tracked keys", () => {
	it("excludes thinking pauses and reports how many were dropped", () => {
		const metrics = computeMetrics(fromGaps([100, 100, 1500, 100]));
		expect(metrics.gaps).toEqual([100, 100, 100]);
		expect(metrics.pauseCount).toBe(1);
	});

	it("excludes modifiers and repeated downs from tracked keys", () => {
		const metrics = computeMetrics([
			{ type: "down", key: "Shift", t: 0 },
			{ type: "down", key: "a", t: 50 },
			{ type: "up", key: "a", t: 90 },
			{ type: "down", key: "a", t: 120, repeat: true },
			{ type: "up", key: "a", t: 150 },
		]);
		expect(metrics.trackedKeys).toBe(1);
		expect(metrics.backspaceRate).toBe(0);
	});

	it("computes the median gap", () => {
		expect(computeMetrics(fromGaps([100, 300])).medianGapMs).toBe(200);
		expect(computeMetrics(fromGaps([100, 200, 300])).medianGapMs).toBe(200);
	});

	it("handles an empty event list", () => {
		const metrics = computeMetrics([]);
		expect(metrics.gaps).toEqual([]);
		expect(metrics.trackedKeys).toBe(0);
		expect(metrics.humanScore).toBe(0);
		expect(metrics.verdict.key).toBe("insufficient-data");
		expect(metrics.explanations.length).toBeGreaterThan(0);
	});
});

describe("readout", () => {
	it("prints units, confidence, and the verdict", () => {
		const readout = generateReadout(
			computeMetrics(fromGaps(Array(12).fill(100))),
		);
		expect(readout).toContain("bits");
		expect(readout).toContain("median gap");
		expect(readout).toContain("95% CI");
		expect(readout).toContain("Average hold");
		expect(readout).toContain("Machine-like");
	});
});

describe("helpers", () => {
	it("returns a degenerate interval for tiny samples", () => {
		expect(bootstrapCvCi([])).toEqual([0, 0]);
		expect(bootstrapCvCi([100])).toEqual([0, 0]);
		expect(coefficientOfVariation([100])).toBe(0);
	});
});
