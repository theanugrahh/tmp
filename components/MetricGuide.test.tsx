import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { TypingMetrics } from "@/lib/types";
import { MetricGuide } from "./MetricGuide";

function makeMetrics(): TypingMetrics {
	return {
		gaps: [120, 240, 160, 300, 140, 220, 180, 260, 150, 210],
		holds: [90, 110],
		trackedKeys: 12,
		corrections: 1,
		pauseCount: 0,
		meanGapMs: 198,
		medianGapMs: 190,
		cv: 0.31,
		cvCi95: [0.24, 0.39],
		entropyBits: 3.2,
		avgHoldMs: 100,
		backspaceRate: 0.08,
		humanScore: 3.4,
		humanScoreCi95: [2.7, 4.3],
		flags: [],
		verdict: {
			key: "mixed",
			label: "Mixed",
			tone: "neutral",
			reason: "straddles",
		},
		explanations: [],
	};
}

afterEach(cleanup);

describe("MetricGuide", () => {
	it("explains all five signals with simple headings", () => {
		render(<MetricGuide metrics={null} />);
		for (const title of [
			"Entropy",
			"Rhythm",
			"Human-likeness",
			"Average hold",
			"Backspace rate",
		]) {
			expect(screen.getByText(title)).toBeTruthy();
		}
		expect(screen.queryByText("3.2 bits")).toBeNull();
	});

	it("shows unit-bearing values when a readout exists", () => {
		render(<MetricGuide metrics={makeMetrics()} />);
		expect(screen.getByText("3.2 bits")).toBeTruthy();
		expect(screen.getByText("190 ms")).toBeTruthy();
		expect(screen.getByText("3.4/5")).toBeTruthy();
		expect(screen.getByText("100 ms")).toBeTruthy();
		expect(screen.getByText("8%")).toBeTruthy();
	});
});
