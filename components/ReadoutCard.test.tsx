import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TypingMetrics } from "@/lib/types";
import { ReadoutCard } from "./ReadoutCard";

function makeMetrics(overrides: Partial<TypingMetrics> = {}): TypingMetrics {
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
			reason: "The interval straddles both bands.",
		},
		explanations: [
			{ label: "Entropy", text: "Entropy is how spread out your gaps are." },
		],
		...overrides,
	};
}

describe("ReadoutCard", () => {
	it("renders unit-bearing stats and the confidence interval", () => {
		render(
			<ReadoutCard
				metrics={makeMetrics()}
				readout="Entropy 3.2 bits — median gap 190 ms."
			/>,
		);
		expect(
			screen.getByText("Entropy 3.2 bits — median gap 190 ms."),
		).toBeTruthy();
		expect(screen.getByText("3.2 bits")).toBeTruthy();
		expect(screen.getByText("190 ms")).toBeTruthy();
		expect(screen.getByText("3.4/5")).toBeTruthy();
		expect(screen.getByText("100 ms")).toBeTruthy();
		expect(screen.getByText("8%")).toBeTruthy();
		expect(screen.getByText(/95% CI 2.7–4.3/)).toBeTruthy();
	});

	it("takes the verdict chip from the metrics, not from the score", () => {
		render(
			<ReadoutCard
				metrics={makeMetrics({
					verdict: {
						key: "machine-like",
						label: "Machine-like",
						tone: "warn",
						reason: "Interval at or below 1.5.",
					},
					flags: ["machine-like"],
				})}
				readout="readout"
			/>,
		);
		expect(screen.getByText("Machine-like")).toBeTruthy();
		expect(screen.getByText("machine-like")).toBeTruthy();
	});

	it("mentions excluded pauses when present", () => {
		render(
			<ReadoutCard
				metrics={makeMetrics({ pauseCount: 2 })}
				readout="readout"
			/>,
		);
		expect(screen.getByText(/2 pauses over 1\.2 s/)).toBeTruthy();
	});
});
