import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimelineChart } from "./TimelineChart";

describe("TimelineChart", () => {
	it("renders an svg line chart for the gaps", () => {
		const { container } = render(<TimelineChart gaps={[50, 200, 100]} />);
		expect(container.querySelector("svg")).toBeTruthy();
		expect(container.querySelector("polyline")).toBeTruthy();
	});

	it("renders nothing with fewer than two gaps", () => {
		const { container } = render(<TimelineChart gaps={[50]} />);
		expect(container.innerHTML).toBe("");
	});
});
