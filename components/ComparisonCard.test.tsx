import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Comparison } from "@/lib/profile";
import { ComparisonCard } from "./ComparisonCard";

const comparison: Comparison = {
	score: 84,
	label: "Strong match",
	tone: "good",
	explanation: "This rhythm sits close to the saved profile.",
	closeCount: 5,
	deltas: [
		{
			key: "medianGapMs",
			label: "Rhythm",
			observed: 180,
			expected: 175,
			deviation: 0.03,
			observedText: "180 ms",
			expectedText: "175 ms",
		},
	],
};

describe("ComparisonCard", () => {
	it("shows the score, verdict, sentence, and comparison cues", () => {
		render(
			<ComparisonCard
				comparison={comparison}
				baseline={[1, 2, 3]}
				observed={[1, 3, 2]}
				sentence="A short practice sentence."
			/>,
		);

		expect(screen.getByText("84")).toBeTruthy();
		expect(screen.getByText("Strong match")).toBeTruthy();
		expect(screen.getByText(/5 of 1 signals close/)).toBeTruthy();
		expect(screen.getByText("A short practice sentence.")).toBeTruthy();
		expect(
			screen.getByRole("img", { name: /gap distribution comparison/i }),
		).toBeTruthy();
		expect(screen.getByText("This run")).toBeTruthy();
		expect(screen.getByText("Saved profile")).toBeTruthy();
	});
});
