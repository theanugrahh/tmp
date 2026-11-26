import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TermsPage from "./page";

describe("terms page", () => {
	afterEach(cleanup);

	it("states the demo limits and acceptable use rules", () => {
		render(<TermsPage />);

		expect(
			screen.getByRole("heading", { level: 1, name: /terms of use/i }),
		).toBeTruthy();
		expect(screen.getByText(/not an authentication system/i)).toBeTruthy();
		expect(screen.queryByText(/placeholder/i)).toBeNull();
	});
});
