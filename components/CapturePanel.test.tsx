import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CapturePanel } from "./CapturePanel";

const props = {
	onKeyDown: vi.fn(),
	onKeyUp: vi.fn(),
	onStart: vi.fn(),
	onAnalyze: vi.fn(),
	onReset: vi.fn(),
};

afterEach(cleanup);

describe("CapturePanel", () => {
	it("shows only the Start button before a capture begins", () => {
		render(<CapturePanel {...props} capturing={false} />);
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(screen.getByRole("button", { name: /start capture/i })).toBeTruthy();
	});

	it("calls onStart when Start capture is clicked", () => {
		const onStart = vi.fn();
		render(<CapturePanel {...props} capturing={false} onStart={onStart} />);
		fireEvent.click(screen.getByRole("button", { name: /start capture/i }));
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("reveals the typing area once capturing starts", () => {
		render(<CapturePanel {...props} capturing={true} />);
		expect(screen.getByRole("textbox")).toBeTruthy();
		expect(screen.getByRole("button", { name: /^analyze$/i })).toBeTruthy();
		expect(screen.queryByRole("button", { name: /start capture/i })).toBeNull();
		expect(screen.queryByRole("button", { name: /^stop$/i })).toBeNull();
	});

	it("calls onAnalyze when Analyze is clicked", () => {
		const onAnalyze = vi.fn();
		render(<CapturePanel {...props} capturing={true} onAnalyze={onAnalyze} />);
		fireEvent.click(screen.getByRole("button", { name: /^analyze$/i }));
		expect(onAnalyze).toHaveBeenCalledTimes(1);
	});

	it("stops editing and offers Start over after an analysis", () => {
		render(
			<CapturePanel {...props} capturing={false} analyzed={true} count={12} />,
		);
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(screen.getByLabelText("Captured text")).toBeTruthy();
		expect(screen.getByText("Captured.")).toBeTruthy();
		expect(screen.getByText(/12 keys/)).toBeTruthy();
		expect(screen.queryByRole("button", { name: /^analyze$/i })).toBeNull();
		expect(screen.getByRole("button", { name: /start over/i })).toBeTruthy();
	});

	it("keeps what was typed visible once the capture stops", () => {
		const { rerender } = render(<CapturePanel {...props} capturing={true} />);
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "hello there" },
		});
		rerender(<CapturePanel {...props} capturing={false} analyzed={true} />);
		expect(screen.getByLabelText("Captured text").textContent).toBe(
			"hello there",
		);
	});

	it("calls onReset when Start over is clicked", () => {
		const onReset = vi.fn();
		render(
			<CapturePanel
				{...props}
				capturing={false}
				analyzed={true}
				onReset={onReset}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /start over/i }));
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it("disables the action while analyzing", () => {
		render(<CapturePanel {...props} capturing={false} analyzing={true} />);
		expect(screen.getByRole("textbox").hasAttribute("readonly")).toBe(true);
		expect(screen.getByRole("button", { name: /analyzing/i })).toHaveProperty(
			"disabled",
			true,
		);
	});
});
