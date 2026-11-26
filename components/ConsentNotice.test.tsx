import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentNotice } from "./ConsentNotice";

describe("ConsentNotice", () => {
	afterEach(cleanup);

	it("requires an explicit checkbox before consent can be given", () => {
		const onAccept = vi.fn();
		render(
			<ConsentNotice
				status={null}
				error={null}
				onAccept={onAccept}
				onDecline={() => undefined}
				onReview={() => undefined}
			/>,
		);

		const accept = screen.getByRole("button", { name: "Allow data use" });
		expect(accept.hasAttribute("disabled")).toBe(true);

		fireEvent.click(
			screen.getByRole("checkbox", {
				name: /i understand this demo sends keystroke timing/i,
			}),
		);
		expect(accept.hasAttribute("disabled")).toBe(false);

		fireEvent.click(accept);
		expect(onAccept).toHaveBeenCalledTimes(1);
	});

	it("links to the privacy notice and terms", () => {
		render(
			<ConsentNotice
				status={null}
				error={null}
				onAccept={() => undefined}
				onDecline={() => undefined}
				onReview={() => undefined}
			/>,
		);

		expect(
			screen
				.getByRole("link", { name: /privacy notice/i })
				.getAttribute("href"),
		).toBe("/privacy");
		expect(
			screen.getByRole("link", { name: /terms/i }).getAttribute("href"),
		).toBe("/terms");
	});

	it("offers a way to review a declined decision", () => {
		const onReview = vi.fn();
		render(
			<ConsentNotice
				status="declined"
				error={null}
				onAccept={() => undefined}
				onDecline={() => undefined}
				onReview={onReview}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /change choice/i }));
		expect(onReview).toHaveBeenCalledTimes(1);
	});

	it("shows storage errors", () => {
		render(
			<ConsentNotice
				status={null}
				error="Consent could not be saved in this browser."
				onAccept={() => undefined}
				onDecline={() => undefined}
				onReview={() => undefined}
			/>,
		);

		expect(
			screen
				.getByRole("alert")
				.textContent?.includes("Consent could not be saved in this browser."),
		).toBe(true);
	});

	it("renders nothing when consent is accepted", () => {
		const { container } = render(
			<ConsentNotice
				status="accepted"
				error={null}
				onAccept={() => undefined}
				onDecline={() => undefined}
				onReview={() => undefined}
			/>,
		);

		expect(container.textContent).toBe("");
	});
});
