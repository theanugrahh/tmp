import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PrivacyPage from "./page";

describe("privacy page", () => {
	afterEach(cleanup);

	it("explains what the demo stores and sends", () => {
		render(<PrivacyPage />);

		expect(
			screen.getByRole("heading", { level: 1, name: /privacy notice/i }),
		).toBeTruthy();
		expect(screen.getByText(/keystroke timing/i)).toBeTruthy();
		expect(screen.getByText(/this site's analysis endpoint/i)).toBeTruthy();
		expect(screen.getByText(/opaque key IDs/i)).toBeTruthy();
		expect(
			screen.getByText(/deletes the profiles stored in this browser/i),
		).toBeTruthy();
		expect(screen.queryByText(/placeholder/i)).toBeNull();
	});
});
