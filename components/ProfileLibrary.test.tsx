import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeMetrics } from "@/lib/metrics";
import { createProfile, featureVector } from "@/lib/profile";
import type { TypingEvent } from "@/lib/types";
import { ProfileLibrary } from "./ProfileLibrary";

function sample() {
	const events: TypingEvent[] = [];
	let t = 0;
	for (const gap of [
		100, 140, 200, 120, 180, 160, 220, 110, 150, 190, 130, 170,
	]) {
		if (events.length === 0) events.push({ type: "down", key: "a", t });
		t += gap;
		events.push({ type: "down", key: `k${t}`, t });
	}
	return featureVector(computeMetrics(events));
}

const profile = createProfile({
	name: "Main rhythm",
	sentence: "A sentence.",
	samples: [sample(), sample(), sample()],
	id: "profile-1",
	createdAt: "2026-01-01T00:00:00.000Z",
	salt: "salt-1",
});

describe("ProfileLibrary", () => {
	afterEach(cleanup);

	it("renders the vault and exposes profile actions", () => {
		const onSelect = vi.fn();
		const onDelete = vi.fn();
		const onExport = vi.fn();
		const onImport = vi.fn();
		const onNew = vi.fn();
		render(
			<ProfileLibrary
				profiles={[profile]}
				activeId={profile.id}
				onSelect={onSelect}
				onDelete={onDelete}
				onExport={onExport}
				onImport={onImport}
				onNew={onNew}
			/>,
		);

		expect(screen.getByText("Fingerprint vault")).toBeTruthy();
		expect(screen.getByText("01")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /new profile/i }));
		expect(onNew).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole("button", { name: "Use Main rhythm" }));
		expect(onSelect).toHaveBeenCalledWith(profile);

		fireEvent.click(screen.getByRole("button", { name: "Export Main rhythm" }));
		expect(onExport).toHaveBeenCalledWith(profile);

		fireEvent.click(screen.getByRole("button", { name: "Delete Main rhythm" }));
		expect(onDelete).toHaveBeenCalledWith(profile.id);
	});

	it("passes an imported file to the handler", () => {
		const onImport = vi.fn();
		render(
			<ProfileLibrary
				profiles={[]}
				activeId={null}
				onSelect={() => undefined}
				onDelete={() => undefined}
				onExport={() => undefined}
				onImport={onImport}
				onNew={() => undefined}
			/>,
		);

		const file = new File(["{}"], "profile.json", { type: "application/json" });
		fireEvent.change(screen.getByLabelText("Import profile file"), {
			target: { files: [file] },
		});
		expect(onImport).toHaveBeenCalledWith(file);
	});

	it("explains the empty vault", () => {
		render(
			<ProfileLibrary
				profiles={[]}
				activeId={null}
				onSelect={() => undefined}
				onDelete={() => undefined}
				onExport={() => undefined}
				onImport={() => undefined}
				onNew={() => undefined}
			/>,
		);
		expect(screen.getByText(/enroll with three samples/i)).toBeTruthy();
	});
});
