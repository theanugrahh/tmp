import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerifySetupPanel } from "./VerifySetupPanel";

describe("VerifySetupPanel", () => {
	afterEach(cleanup);

	it("offers a direct path from verify to enrollment", () => {
		const onEnroll = vi.fn();
		render(<VerifySetupPanel onEnroll={onEnroll} />);

		expect(
			screen.getByRole("heading", { name: /verify needs a profile/i }),
		).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: /enroll a profile first/i }),
		);
		expect(onEnroll).toHaveBeenCalledTimes(1);
	});
});
