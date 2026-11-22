import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TypingMetrics } from "@/lib/types";
import { ReadoutCard } from "./ReadoutCard";

const metrics: TypingMetrics = {
	entropy: 4,
	regularity: 2,
	humanScore: 5,
	backspaceRate: 0,
	avgHoldMs: 120,
	flags: [],
	intervals: [50, 200],
	holds: [120],
};

describe("ReadoutCard", () => {
	it("renders the readout text and stats", () => {
		render(
			<ReadoutCard
				metrics={metrics}
				readout="Entropy 4/5 — rhythm 2/5 — human-likeness 5/5."
			/>,
		);
		expect(
			screen.getByText("Entropy 4/5 — rhythm 2/5 — human-likeness 5/5."),
		).toBeTruthy();
		expect(screen.getByText("4/5")).toBeTruthy();
		expect(screen.getByText("2/5")).toBeTruthy();
		expect(screen.getByText("120 ms")).toBeTruthy();
		expect(screen.getByText("0%")).toBeTruthy();
	});

	it("renders flags when present", () => {
		const flagged: TypingMetrics = { ...metrics, flags: ["machine-like"] };
		render(<ReadoutCard metrics={flagged} readout="readout" />);
		expect(screen.getByText("machine-like")).toBeTruthy();
	});
});
