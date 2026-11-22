import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CapturePanel } from "./CapturePanel";

afterEach(cleanup);

describe("CapturePanel", () => {
	it("renders the type area and buttons", () => {
		render(
			<CapturePanel
				capturing={false}
				onKeyDown={vi.fn()}
				onKeyUp={vi.fn()}
				onStart={vi.fn()}
				onAnalyze={vi.fn()}
			/>,
		);
		expect(screen.getByRole("textbox")).toBeTruthy();
		expect(screen.getByRole("button", { name: /start capture/i })).toBeTruthy();
		expect(screen.getByRole("button", { name: /analyze/i })).toBeTruthy();
	});

	it("calls onStart when Start capture is clicked", () => {
		const onStart = vi.fn();
		render(
			<CapturePanel
				capturing={false}
				onKeyDown={vi.fn()}
				onKeyUp={vi.fn()}
				onStart={onStart}
				onAnalyze={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /start capture/i }));
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("disables Analyze while capturing", () => {
		render(
			<CapturePanel
				capturing={true}
				onKeyDown={vi.fn()}
				onKeyUp={vi.fn()}
				onStart={vi.fn()}
				onAnalyze={vi.fn()}
			/>,
		);
		expect(
			(screen.getByRole("button", { name: /analyze/i }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});
});
