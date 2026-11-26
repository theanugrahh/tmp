import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModeSwitch } from "./ModeSwitch";

describe("ModeSwitch", () => {
	afterEach(cleanup);

	it("marks the active mode and keeps verify available without profiles", () => {
		const onChange = vi.fn();
		render(<ModeSwitch mode="analyze" onChange={onChange} />);

		expect(
			screen
				.getByRole("tab", { name: /analyze/i })
				.getAttribute("aria-selected"),
		).toBe("true");
		expect(
			screen.getByRole("tab", { name: /verify/i }).hasAttribute("disabled"),
		).toBe(false);

		fireEvent.click(screen.getByRole("tab", { name: /enroll/i }));
		expect(onChange).toHaveBeenCalledWith("enroll");

		fireEvent.click(screen.getByRole("tab", { name: /verify/i }));
		expect(onChange).toHaveBeenCalledWith("verify");
	});

	it("supports roving focus and arrow-key tab navigation", () => {
		const onChange = vi.fn();
		render(<ModeSwitch mode="analyze" onChange={onChange} />);

		const analyze = screen.getByRole("tab", { name: /analyze/i });
		const enroll = screen.getByRole("tab", { name: /enroll/i });
		const verify = screen.getByRole("tab", { name: /verify/i });

		expect(analyze.getAttribute("tabindex")).toBe("0");
		expect(enroll.getAttribute("tabindex")).toBe("-1");
		expect(verify.getAttribute("tabindex")).toBe("-1");
		expect(analyze.getAttribute("aria-controls")).toBe("workspace-panel");

		fireEvent.keyDown(analyze, { key: "ArrowRight" });
		expect(onChange).toHaveBeenCalledWith("enroll");
		expect(document.activeElement).toBe(enroll);

		fireEvent.keyDown(enroll, { key: "ArrowLeft" });
		expect(onChange).toHaveBeenLastCalledWith("analyze");
		expect(document.activeElement).toBe(analyze);

		fireEvent.keyDown(analyze, { key: "End" });
		expect(onChange).toHaveBeenLastCalledWith("verify");
		expect(document.activeElement).toBe(verify);

		fireEvent.keyDown(verify, { key: "Home" });
		expect(onChange).toHaveBeenLastCalledWith("analyze");
		expect(document.activeElement).toBe(analyze);
	});
});
