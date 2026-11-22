import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimelineChart } from "./TimelineChart";

describe("TimelineChart", () => {
	it("renders an svg line chart for the intervals", () => {
		const { container } = render(<TimelineChart intervals={[50, 200, 100]} />);
		expect(container.querySelector("svg")).toBeTruthy();
		expect(container.querySelector("polyline")).toBeTruthy();
	});

	it("renders nothing with fewer than two intervals", () => {
		const { container } = render(<TimelineChart intervals={[50]} />);
		expect(container.innerHTML).toBe("");
	});
});
